import { MODULE_ID } from './main.js';

export class ReminderApp extends FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'gm-reminder-app',
      title: 'GM Reminders',
      template: `modules/${MODULE_ID}/templates/reminder-app.hbs`,
      width: 700,
      height: 'auto',
      resizable: true,
      closeOnSubmit: false,
    });
  }

  getData() {
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    const playerActors = game.actors.filter(a => a.hasPlayerOwner && !a.isGM);
    return {
      reminders,
      playerActors
    };
  }

  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    
    const finalData = {};
    for (const [categoryKey, categoryData] of Object.entries(expandedData)) {
      if (!categoryData) continue;
      finalData[categoryKey] = {
        linkedSkills: categoryData.linkedSkills || "",
        reminders: Object.values(categoryData.reminders || {}).filter(r => r && r.text)
      };
    }
    await game.settings.set(MODULE_ID, 'reminders', finalData);
    this.render();
  }

  activateListeners(html) {
    super.activateListeners(html);
    html = html[0] ?? html;

    html.querySelectorAll('.whisper-btn').forEach(btn => btn.addEventListener('click', this._onWhisperCategory.bind(this)));
    html.querySelector('.add-category-btn').addEventListener('click', this._onAddCategory.bind(this));
    html.querySelectorAll('.add-reminder-btn').forEach(btn => btn.addEventListener('click', this._onAddReminder.bind(this)));
    html.querySelectorAll('.delete-reminder-btn').forEach(btn => btn.addEventListener('click', this._onDeleteReminder.bind(this)));
    html.querySelectorAll('.delete-category-btn').forEach(btn => btn.addEventListener('click', this._onDeleteCategory.bind(this)));
  }

  async _onAddCategory(event) {
    await this.submit({ preventRender: true });
    const input = this.element[0].querySelector('#new-category-name');
    const newCategoryName = input.value.trim();
    if (!newCategoryName) return;
    
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    if (reminders[newCategoryName]) return;

    reminders[newCategoryName] = { linkedSkills: "", reminders: [] };
    await game.settings.set(MODULE_ID, 'reminders', reminders);
    this.render();
  }

  async _onAddReminder(event) {
    await this.submit({ preventRender: true });
    const categoryKey = event.currentTarget.dataset.category;
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    reminders[categoryKey].reminders.push({ text: "", actorId: "" });
    await game.settings.set(MODULE_ID, 'reminders', reminders);
    this.render();
  }

  async _onDeleteReminder(event) {
    await this.submit({ preventRender: true });
    const categoryKey = event.currentTarget.dataset.category;
    const index = parseInt(event.currentTarget.dataset.index);
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    reminders[categoryKey].reminders.splice(index, 1);
    await game.settings.set(MODULE_ID, 'reminders', reminders);
    this.render();
  }

  async _onDeleteCategory(event) {
    await this.submit({ preventRender: true });
    const categoryKey = event.currentTarget.dataset.category;
    const reminders = game.settings.get(MODULE_ID, 'reminders');
    delete reminders[categoryKey];
    await game.settings.set(MODULE_ID, 'reminders', reminders);
    this.render();
  }

  _onWhisperCategory(event) {
    const categoryKey = event.currentTarget.dataset.category; 
    game.modules.get(MODULE_ID).api.whisperCategory(categoryKey);
  }
}