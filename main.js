import { MODULE_ID } from './constants.js';
import { ReminderApp } from './reminder-app.js';
import { ReminderHubApp } from './reminder-hub.js';

const sceneRollTracker = new Set(); 

const GMReminderAPI = {
    editorApp: null,
    hubApp: null,

    // By storing the instance, Foundry natively remembers your height/width adjustments
    openPanel: () => {
        if (!GMReminderAPI.editorApp) GMReminderAPI.editorApp = new ReminderApp();
        GMReminderAPI.editorApp.render({ force: true });
    },
    
    openHub: () => {
        if (!GMReminderAPI.hubApp) GMReminderAPI.hubApp = new ReminderHubApp();
        GMReminderAPI.hubApp.render({ force: true });
    },

    whisperCategory: (categoryName, actorId = null) => {
      const categoryData = game.settings.get(MODULE_ID, 'reminders')[categoryName];
      if (!categoryData || !categoryData.reminders || categoryData.reminders.length === 0) return;
      
      // The fix: explicitly strip out blank reminders before we try to format them
      let remindersToWhisper = categoryData.reminders.filter(r => r.text && r.text.trim() !== "");
      
      if (actorId) {
          remindersToWhisper = remindersToWhisper.filter(r => r.actorId === actorId || r.actorId === "");
      }
      
      // If everything was blank or filtered out, abort entirely.
      if (remindersToWhisper.length === 0) return;
      
      const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
      const listItems = remindersToWhisper.map(r => {
        const actor = game.actors.get(r.actorId);
        const prefix = actor ? `<strong style="color: #ffb400;">${actor.name}:</strong> ` : '';
        
        // Format the note to sit slightly indented under the main text
        const noteHtml = r.notes ? `<div style="font-size: 0.85em; font-style: italic; color: #aaa; margin-top: 2px; padding-left: 10px;">↳ ${r.notes}</div>` : '';
        
        return `<li style="margin-bottom: 8px;">${prefix}${r.text}${noteHtml}</li>`;
    }).join('');
      
      const content = `
            <div class="gm-reminder-whisper" style="background: #2a2926; border: 1px solid #000; border-left: 3px solid #ff6400; padding: 8px; border-radius: 5px; color: #ddd;">
                <strong style="color: #ffb400; font-size: 1.1em; display: block; margin-bottom: 5px;">${categoryTitle} Reminders:</strong>
                <ul style="margin: 0 0 10px 0; padding-left: 20px;">${listItems}</ul>
                <button class="gm-reminder-hub-btn" style="width: 100%; background: rgba(255, 100, 0, 0.1); color: #ffb400; border: 1px solid #ff6400; border-radius: 3px; cursor: pointer; padding: 4px; transition: all 0.2s ease;">
                    <i class="fas fa-book-open"></i> Open Hub for Details
                </button>
            </div>`;
            ChatMessage.create({ 
              content: content, 
              whisper: ChatMessage.getWhisperRecipients('GM'),
              flags: { [MODULE_ID]: { isReminder: true } } // The anti-loop stamp
          });
  },
    
    promptDialog: () => {
        promptSceneReminders(); 
    }
};

let scenePrompt = null;
function promptSceneReminders() {
    if (!game.user.isGM) return;
    if (scenePrompt) scenePrompt.close();
    
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    const categories = Object.keys(reminders);
    const sceneDefaults = canvas.scene?.getFlag(MODULE_ID, 'sceneDefaults') || [];
    
    if (categories.length === 0) return ui.notifications.info("You haven't created any reminder categories yet.");
    
    const checkboxHTML = categories.map(cat => {
        const isChecked = sceneDefaults.includes(cat) ? 'checked' : '';
        return `<div class="form-group"><input type="checkbox" name="${cat}" id="${MODULE_ID}-${cat.slugify()}" ${isChecked}/><label for="${MODULE_ID}-${cat.slugify()}">${cat}</label></div>`;
    }).join('');
    
    const content = `<form><p>What reminders are relevant right now?</p>${checkboxHTML}</form>`;
    
    scenePrompt = new Dialog({
        title: "Scene Reminders", 
        content: content,
        buttons: {
            prompt: {
                icon: '<i class="fas fa-comment-dots"></i>', 
                label: "Whisper Reminders",
                callback: (html) => {
                    const formElement = html[0] || html;
                    formElement.querySelectorAll('input[type="checkbox"]:checked').forEach(box => {
                        GMReminderAPI.whisperCategory(box.name);
                    });
                }
            },
            close: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
        },
        default: "prompt", 
        close: () => { scenePrompt = null; }
    }).render(true);
}

class GMReminderHooks {

    static init() {
        game.modules.get(MODULE_ID).api = GMReminderAPI;
        
        game.settings.register(MODULE_ID, 'reminders', { 
            name: 'GM Reminders', scope: 'world', config: false, type: Object, default: {} 
        });
        
        game.settings.register(MODULE_ID, 'promptOnSceneChange', { 
            name: 'Prompt on Scene Change', hint: 'If enabled, a dialog will appear asking for relevant reminders whenever you load a new scene.', scope: 'world', config: true, type: Boolean, default: false 
        });
        
        game.settings.register(MODULE_ID, 'skipDialogWithDefaults', { 
            name: 'Skip Dialogue if Presets are Used', hint: 'If enabled, activating a scene with pre-configured defaults will automatically whisper those reminders instead of showing the selection dialog.', scope: 'world', config: true, type: Boolean, default: false 
        });
        
        game.settings.register(MODULE_ID, 'remindEveryRoll', {
            name: 'Remind on Every Roll', hint: 'If enabled, automated reminders will trigger every time a linked skill is rolled, not just the first time in a scene.', scope: 'world', config: true, type: Boolean, default: false 
        });

        game.settings.register(MODULE_ID, 'autoOpenHub', {
            name: 'Auto-Open Hub on Launch', hint: 'Automatically pop open the GM Reminder Hub when you log into the world.', scope: 'world', config: true, type: Boolean, default: true
        });
    }
    static renderChatMessage(message, html, data) {
      if (!game.user.isGM) return;
      const htmlElement = html[0] || html;
      const btn = htmlElement.querySelector('.gm-reminder-hub-btn');
      if (btn) {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              GMReminderAPI.openHub(); 
          });
      }
  }

    static ready() {
        if (game.user.isGM && game.settings.get(MODULE_ID, 'autoOpenHub')) {
            GMReminderAPI.openHub();
        }
    }

    static getActorSheetHeaderButtons(sheet, buttons) {
        if (!game.user.isGM || sheet.actor.type !== 'party') return;
        buttons.unshift({
            label: 'GM Reminders',
            class: 'gm-reminder-btn',
            icon: 'fas fa-list-check',
            onclick: () => GMReminderAPI.openPanel() 
        });
    }

    // THIS is your Hub Button
    static getSceneControlButtons(controls) {
        if (!game.user.isGM) return;
        // Finds the basic "Token Controls" menu (the little person icon on the far left)
        const tokenTools = controls.find(c => c.name === 'token');
        if (tokenTools) {
            tokenTools.tools.push({
                name: 'gm-reminders-hub',
                title: 'GM Reminder Hub',
                icon: 'fas fa-bell',
                button: true,
                onClick: () => GMReminderAPI.openHub()
            });
        }
    }

    static canvasReady(canvas) {
        sceneRollTracker.clear();
        if (game.user.isGM && game.settings.get(MODULE_ID, 'promptOnSceneChange')) {
            const skipDialog = game.settings.get(MODULE_ID, 'skipDialogWithDefaults');
            const sceneDefaults = canvas.scene?.getFlag(MODULE_ID, 'sceneDefaults') || [];
            if (skipDialog && sceneDefaults.length > 0) {
                for (const category of sceneDefaults) { GMReminderAPI.whisperCategory(category); }
            } else {
                promptSceneReminders();
            }
        }
    }

    static async renderSceneConfig(app, html, data) {
        // ... (Scene Config Logic remains exactly the same as previously established)
        if (!game.user.isGM) return;
        const htmlElement = html[0] || html;
        if (htmlElement.querySelector(`#${MODULE_ID}-scene-defaults`)) return;
        
        const reminders = game.settings.get(MODULE_ID, 'reminders');
        const categories = Object.keys(reminders);
        if (categories.length === 0) return;
        
        const sceneDefaults = app.document.getFlag(MODULE_ID, 'sceneDefaults') || [];
        const namePrefix = `${MODULE_ID}-sceneDefault`;
        
        const checkboxHTML = categories.map(cat => {
            const isChecked = sceneDefaults.includes(cat) ? 'checked' : '';
            return `<div style="flex: 1;"><input type="checkbox" name="${namePrefix}-${cat}" ${isChecked}/><label>${cat}</label></div>`;
        }).join('');
        
        const newSectionHTML = `<fieldset id="${MODULE_ID}-scene-defaults"><legend>GM Reminder Defaults</legend><div class="form-group" style="display: flex; flex-wrap: wrap;">${checkboxHTML}</div></fieldset>`;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newSectionHTML;
        const newSection = tempDiv.firstChild;
        
        const footer = htmlElement.querySelector('.form-footer');
        if (footer) {
            footer.parentNode.insertBefore(newSection, footer);
            app.setPosition({ height: 'auto' });
        }
        
        const saveButton = htmlElement.querySelector('button[type="submit"]');
        if (saveButton) {
            saveButton.addEventListener('mousedown', async () => {
                const checked = [];
                for (const cat of categories) {
                    const checkbox = htmlElement.querySelector(`input[name="${namePrefix}-${cat}"]`);
                    if (checkbox && checkbox.checked) checked.push(cat);
                }
                await app.document.setFlag(MODULE_ID, 'sceneDefaults', checked);
            });
        }
    }

    static async createChatMessage(message) {
      if (!game.user.isGM) return;

      // The Anti-Loop Shield: If we created this message, ignore it entirely.
      if (message.flags?.[MODULE_ID]?.isReminder) return;

      // More robust actor retrieval
      const actor = message.actor || game.actors.get(message.speaker?.actor);
      if (!actor) return;
        
        const allReminders = game.settings.get(MODULE_ID, 'reminders');
        const remindEveryTime = game.settings.get(MODULE_ID, 'remindEveryRoll');

        // Extract everything possible from the message
        const context = message.flags?.pf2e?.context || {};
        const domains = (context.domains || []).map(d => d.toLowerCase());
        const flavor = (message.flavor || "").toLowerCase();
        const content = (message.content || "").toLowerCase();

        let triggeredCategories = new Set();

        for (const [categoryName, categoryData] of Object.entries(allReminders)) {
            const linkedSkills = (categoryData.linkedSkills || "").split(',').map(s => s.trim().toLowerCase());
            if (linkedSkills.length === 0 || linkedSkills[0] === "") continue;

            const matchedSkill = linkedSkills.find(skill => {
                // 1. Check system domains (e.g., "diplomacy-check" includes "diplomacy")
                if (domains.some(d => d.includes(skill))) return true;
                // 2. Check the flavor text HTML directly
                if (flavor.includes(skill)) return true;
                // 3. Check the raw message content
                if (content.includes(skill)) return true;
                
                return false;
            });

            if (matchedSkill) {
                if (!remindEveryTime) {
                    const rollKey = `${actor.id}-${matchedSkill}`;
                    if (sceneRollTracker.has(rollKey)) continue; // Blocked by the "once per scene" rule
                    sceneRollTracker.add(rollKey); 
                }
                triggeredCategories.add(categoryName);
            }
        }

        // Whisper all triggered categories
        for (const cat of triggeredCategories) {
            GMReminderAPI.whisperCategory(cat, actor.id);
        }
    }
}

Hooks.once('init', GMReminderHooks.init);
Hooks.on('ready', GMReminderHooks.ready);
Hooks.on('getActorSheetHeaderButtons', GMReminderHooks.getActorSheetHeaderButtons);
Hooks.on('getSceneControlButtons', GMReminderHooks.getSceneControlButtons);
Hooks.on('canvasReady', GMReminderHooks.canvasReady);
Hooks.on('renderSceneConfig', GMReminderHooks.renderSceneConfig);
Hooks.on('createChatMessage', GMReminderHooks.createChatMessage);
Hooks.on('renderChatMessage', GMReminderHooks.renderChatMessage);