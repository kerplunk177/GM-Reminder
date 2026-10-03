import { MODULE_ID } from './constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ReminderApp extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: 'gm-reminder-app',
        tag: 'form', 
        window: {
            title: 'GM Reminders',
            icon: 'fas fa-list-check',
            resizable: true,
            controls: []
        },
        position: { width: 700, height: 'auto' },
        form: {
            handler: async function(event, form, formData) {
                const rawData = new foundry.applications.ux.FormDataExtended(form).object;
                const expandedData = foundry.utils.expandObject(rawData);
                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                
                for (const [categoryKey, categoryData] of Object.entries(expandedData)) {
                    if (reminders[categoryKey]) {
                         reminders[categoryKey].linkedSkills = categoryData.linkedSkills || "";
                         if (categoryData.reminders) {
                             const remindersArray = Object.values(categoryData.reminders);
                             // Inside _onChangeForm's mapping function
reminders[categoryKey].reminders = remindersArray.map((r, index) => {
  const existingUuid = reminders[categoryKey].reminders[index]?.uuid || "";
  return { 
      text: r.text || "", 
      actorId: r.actorId || "", 
      uuid: existingUuid,
      notes: r.notes || "" // Capture the new note
  };
});
                         } else {
                             reminders[categoryKey].reminders = [];
                         }
                    }
                }
                await game.settings.set(MODULE_ID, 'reminders', reminders);
            },
            submitOnChange: true,
            closeOnSubmit: false
        },
        actions: {
            addCategory: async function(event, target) {
                const input = document.getElementById('new-category-name');
                const newCategoryName = input?.value.trim();
                if (!newCategoryName) return ui.notifications.warn("Type a category name first.");
                
                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                if (reminders[newCategoryName]) return ui.notifications.warn("That category already exists.");

                reminders[newCategoryName] = { linkedSkills: "", reminders: [] };
                await game.settings.set(MODULE_ID, 'reminders', reminders);
                this.render({ force: true });
            },
            deleteCategory: async function(event, target) {
                const categoryKey = target.dataset.category;
                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                delete reminders[categoryKey];
                await game.settings.set(MODULE_ID, 'reminders', reminders);
                this.render({ force: true });
            },
            addReminder: async function(event, target) {
                const categoryKey = target.dataset.category;
                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                // Inside actions.addReminder
reminders[categoryKey].reminders.push({ text: "", actorId: "", uuid: "", notes: "" });
                await game.settings.set(MODULE_ID, 'reminders', reminders);
                this.render({ force: true });
            },
            deleteReminder: async function(event, target) {
                const categoryKey = target.dataset.category;
                const index = parseInt(target.dataset.index, 10);
                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                reminders[categoryKey].reminders.splice(index, 1);
                await game.settings.set(MODULE_ID, 'reminders', reminders);
                this.render({ force: true });
            },
            whisperCategory: function(event, target) {
                const categoryKey = target.dataset.category; 
                game.modules.get(MODULE_ID).api.whisperCategory(categoryKey);
            }
        }
    };

    static PARTS = {
        main: {
            template: `modules/${MODULE_ID}/templates/reminder-app.hbs`
        }
    };

    async _prepareContext(options) {
        const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
        
        let playerActors = [];
        if (game.actors.party) {
            playerActors = game.actors.party.members;
        } else {
            playerActors = game.actors.filter(a => a.hasPlayerOwner && a.type === 'character');
        }

        // Map premium actor data (id, name, and token image)
        const actorsData = playerActors.map(a => ({
            id: a.id,
            name: a.name,
            img: a.prototypeToken?.texture?.src || a.img
        }));

        // Attach the correct image path to each existing reminder
        for (const cat of Object.values(reminders)) {
            for (const r of cat.reminders) {
                if (r.actorId) {
                    const actor = game.actors.get(r.actorId);
                    r.actorImg = actor ? (actor.prototypeToken?.texture?.src || actor.img) : 'icons/svg/mystery-man.svg';
                } else {
                    r.actorImg = 'icons/svg/mystery-man.svg'; 
                }
            }
        }

        return { reminders, playerActors: actorsData };
    }

    _onRender(context, options) {
        super._onRender(context, options);
        
        // 1. Native Drag and Drop Implementation
        const rows = this.element.querySelectorAll('.reminder-row');
        rows.forEach(row => {
            row.addEventListener('dragover', (event) => {
                event.preventDefault(); 
                event.dataTransfer.dropEffect = "copy";
                row.classList.add('drag-hover'); 
            });
            
            row.addEventListener('dragleave', (event) => {
                row.classList.remove('drag-hover');
            });
            
            row.addEventListener('drop', async (event) => {
                event.preventDefault();
                row.classList.remove('drag-hover');
                
                const data = TextEditor.getDragEventData(event);
                if (!data || data.type !== "Item") {
                    return ui.notifications.warn("Only Items, Feats, or Actions can be dropped here.");
                }
                
                const categoryKey = row.dataset.category;
                const index = row.dataset.index;
                const item = await fromUuid(data.uuid);
                if (!item) return ui.notifications.error("Could not locate that item.");

                const reminders = foundry.utils.deepClone(game.settings.get(MODULE_ID, 'reminders'));
                reminders[categoryKey].reminders[index].text = item.name;
                reminders[categoryKey].reminders[index].uuid = data.uuid;
                await game.settings.set(MODULE_ID, 'reminders', reminders);
                this.render({ force: true });
            });
        });

        // 2. Live Token Image Swapping
        const selects = this.element.querySelectorAll('.actor-select');
        selects.forEach(select => {
            select.addEventListener('change', (event) => {
                const actorId = event.target.value;
                const imgElement = event.target.closest('.actor-select-group').querySelector('.actor-avatar');
                if (actorId) {
                    const actor = game.actors.get(actorId);
                    imgElement.src = actor ? (actor.prototypeToken?.texture?.src || actor.img) : 'icons/svg/mystery-man.svg';
                } else {
                    imgElement.src = 'icons/svg/mystery-man.svg';
                }
            });
        });
    }
}