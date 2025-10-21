// Import your Application class
import { ReminderApp } from './reminder-app.js';

export const MODULE_ID = 'gm-reminder';

let scenePrompt = null;
let sceneRollTracker = new Set(); 

function promptSceneReminders() {
    if (!game.user.isGM) return;
    if (scenePrompt) scenePrompt.close();
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    const categories = Object.keys(reminders);
    const sceneDefaults = canvas.scene.getFlag(MODULE_ID, 'sceneDefaults') || [];
    if (categories.length === 0) return ui.notifications.info("You haven't created any reminder categories yet.");
    const checkboxHTML = categories.map(cat => {
        const isChecked = sceneDefaults.includes(cat) ? 'checked' : '';
        return `<div class="form-group"><input type="checkbox" name="${cat}" id="${MODULE_ID}-${cat.slugify()}" ${isChecked}/><label for="${MODULE_ID}-${cat.slugify()}">${cat}</label></div>`;
    }).join('');
    const content = `<form><p>What reminders are relevant right now?</p>${checkboxHTML}</form>`;
    scenePrompt = new Dialog({
        title: "Scene Reminders", content: content,
        buttons: {
            prompt: {
                icon: '<i class="fas fa-comment-dots"></i>', label: "Whisper Reminders",
                callback: (html) => {
                    html.find('input[type="checkbox"]:checked').each((i, box) => API.whisperCategory(box.name));
                }
            },
            close: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
        },
        default: "prompt", close: () => { scenePrompt = null; }
    }).render(true);
}

const API = {
  openPanel: () => { new ReminderApp().render(true); },
  whisperCategory: (categoryName, actorId = null) => {
    const categoryData = game.settings.get(MODULE_ID, 'reminders')[categoryName];
    if (!categoryData || !categoryData.reminders || categoryData.reminders.length === 0) return;
    let remindersToWhisper = categoryData.reminders;
    if (actorId) {
      remindersToWhisper = remindersToWhisper.filter(r => r.actorId === actorId || r.actorId === "");
    }
    if (remindersToWhisper.length === 0) return;
    const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    const listItems = remindersToWhisper.map(r => {
      const actor = game.actors.get(r.actorId);
      const prefix = actor ? `<strong>${actor.name}:</strong> ` : '';
      return `<li>${prefix}${r.text}</li>`;
    }).join('');
    const content = `<div class="gm-reminder-whisper"><strong>${categoryTitle} Reminders:</strong><ul>${listItems}</ul></div>`;
    ChatMessage.create({ content: content, whisper: ChatMessage.getWhisperRecipients('GM') });
  },
  promptDialog: () => { promptSceneReminders(); }
};

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing GM Reminder`);
  game.modules.get(MODULE_ID).api = API;
  game.settings.register(MODULE_ID, 'reminders', { name: 'GM Reminders', scope: 'world', config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, 'promptOnSceneChange', { name: 'Prompt on Scene Change', hint: 'If enabled, a dialog will appear asking for relevant reminders whenever you load a new scene.', scope: 'world', config: true, type: Boolean, default: false });
  game.settings.register(MODULE_ID, 'skipDialogWithDefaults', { name: 'Skip Dialogue if Presets are Used', hint: 'If enabled, activating a scene with pre-configured defaults will automatically whisper those reminders instead of showing the selection dialog.', scope: 'world', config: true, type: Boolean, default: false });
  
  game.settings.register(MODULE_ID, 'remindEveryRoll', {
    name: 'Remind on Every Roll',
    hint: 'If enabled, automated reminders will trigger every time a linked skill is rolled, not just the first time in a scene.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false // Default to the "once per scene" behavior
  });
});

Hooks.on('renderActorSheet', (app, html, data) => {
  if (!game.user.isGM || app.actor.type !== 'party') return;
  const title = html.find('.window-title');
  if (!title.length || html.find('.gm-reminder-btn').length > 0) return;
  const gmReminderButton = $(`<a class="gm-reminder-btn popout"><i class="fas fa-list-check"></i> GM Reminders</a>`);
  gmReminderButton.on('click', () => API.openPanel());
  title.after(gmReminderButton);
});

Hooks.on('canvasReady', (canvas) => {
  console.log(`${MODULE_ID} | New scene loaded, clearing roll tracker.`);
  sceneRollTracker.clear();
  if (game.user.isGM && game.settings.get(MODULE_ID, 'promptOnSceneChange')) {
    const skipDialog = game.settings.get(MODULE_ID, 'skipDialogWithDefaults');
    const sceneDefaults = canvas.scene.getFlag(MODULE_ID, 'sceneDefaults') || [];
    if (skipDialog && sceneDefaults.length > 0) {
      for (const category of sceneDefaults) { API.whisperCategory(category); }
    } else {
      promptSceneReminders();
    }
  }
});

Hooks.on('renderSceneConfig', (app, html, data) => {
  if (!game.user.isGM) return;
  if ($(html).find(`#${MODULE_ID}-scene-defaults`).length) return;
  const reminders = game.settings.get(MODULE_ID, 'reminders');
  const categories = Object.keys(reminders);
  if (categories.length === 0) return;
  const sceneDefaults = app.document.getFlag(MODULE_ID, 'sceneDefaults') || [];
  const namePrefix = `${MODULE_ID}-sceneDefault`;
  const checkboxHTML = categories.map(cat => {
    const isChecked = sceneDefaults.includes(cat) ? 'checked' : '';
    return `<div style="flex: 1;"><input type="checkbox" name="${namePrefix}-${cat}" ${isChecked}/><label>${cat}</label></div>`;
  }).join('');
  const newSection = `<fieldset id="${MODULE_ID}-scene-defaults"><legend>GM Reminder Defaults</legend><div class="form-group" style="display: flex; flex-wrap: wrap;">${checkboxHTML}</div></fieldset>`;
  const footer = $(html).find('.form-footer');
  if (footer.length) {
    footer.before(newSection);
    app.setPosition({ height: 'auto' });
  }
  const saveButton = $(html).find('button[type="submit"]');
  saveButton.on('mousedown', async (event) => {
    const checked = [];
    const form = $(html);
    for (const cat of categories) {
      if (form.find(`input[name="${namePrefix}-${cat}"]`).is(':checked')) {
        checked.push(cat);
      }
    }
    await app.document.setFlag(MODULE_ID, 'sceneDefaults', checked);
  });
});

Hooks.on('createChatMessage', async (message) => {
  if (!game.user.isGM) return;

  const context = message.flags?.pf2e?.context;
  if (!context) return;

  let skillSlug = null;

  if (context.type === 'skill-check' || context.type === 'perception-check') {
    skillSlug = context.domains?.[0];
  } 
  else if (context.type === 'initiative' && context.statistic === 'perception') {
    skillSlug = 'perception';
  }

  if (!skillSlug) return;

  const actor = message.actor;
  if (!actor) return;
  
  const remindEveryTime = game.settings.get(MODULE_ID, 'remindEveryRoll');

  if (!remindEveryTime) {
    const rollKey = `${actor.id}-${skillSlug}`;
    if (sceneRollTracker.has(rollKey)) return; 
    sceneRollTracker.add(rollKey); 
  }
  
  const allReminders = game.settings.get(MODULE_ID, 'reminders');
  for (const [categoryName, categoryData] of Object.entries(allReminders)) {
    const linkedSkills = (categoryData.linkedSkills || "").split(',').map(s => s.trim().toLowerCase());
    if (linkedSkills.includes(skillSlug)) {
      API.whisperCategory(categoryName, actor.id);
    }
  }
});