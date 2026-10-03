import { MODULE_ID } from './constants.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ReminderHubApp extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: 'gm-reminder-hub',
        window: {
            title: 'GM Reminder Hub',
            icon: 'fas fa-bell',
            resizable: true,
            controls: []
        },
        position: { width: 500, height: 600 },
        actions: {
            openEditor: function(event, target) {
                game.modules.get(MODULE_ID).api.openPanel();
            },
            openItemSheet: async function(event, target) {
                const uuid = target.dataset.uuid;
                if (!uuid) return;
                
                const item = await fromUuid(uuid);
                if (item && item.sheet) {
                    item.sheet.render(true);
                } else {
                    ui.notifications.warn("Could not locate the linked document in the database.");
                }
            }
        }
    };

    static PARTS = {
        main: {
            template: `modules/${MODULE_ID}/templates/reminder-hub.hbs`
        }
    };

    async _prepareContext(options) {
        const remindersData = game.settings.get(MODULE_ID, 'reminders');
        const activeCategories = [];

        for (const [key, data] of Object.entries(remindersData)) {
            const validReminders = data.reminders.filter(r => r.text && r.text.trim() !== "");
            
            if (validReminders.length > 0) {
                activeCategories.push({
                    name: key,
                    linkedSkills: data.linkedSkills,
                    reminders: validReminders.map(r => {
                        const actor = game.actors.get(r.actorId);
                        return {
                            text: r.text,
                            uuid: r.uuid,
                            actorName: actor ? actor.name : "All Players",
                            actorImg: actor ? (actor.prototypeToken?.texture?.src || actor.img) : 'icons/svg/mystery-man.svg'
                        };
                    })
                });
            }
        }

        return {
            hasReminders: activeCategories.length > 0,
            categories: activeCategories,
            welcomeMessage: "No active reminders right now. Peace and quiet."
        };
    }
}