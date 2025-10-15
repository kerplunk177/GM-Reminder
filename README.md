# GM Reminder

A configurable module for Foundry VTT to provide polite, contextual reminders to the Game Master, helping you remember passive player abilities, hidden scene details, monster tactics, and more.

This module was designed to solve the problem of forgetting crucial but passive information in the heat of a session. It provides a powerful and flexible system to whisper the right information to you at the right time.

## Features

* **Custom Reminder Database**: Create categories (e.g., "Traps," "Social," "Haunts") and add any number of specific reminders to them.
* **Automated Skill Triggers**: Link reminder categories to specific skills (like `perception` or `thievery`). The module will automatically whisper relevant reminders the **first time** a player rolls that skill in a scene. (Note: This feature is built specifically for the **Pathfinder 2e** system).
* **Player-Specific Reminders**: Link individual reminders to specific player characters to get perfectly targeted information (e.g., "Athos: has Trapfinder").
* **Proactive Scene Prompts**: An optional setting that prompts you with your reminder categories whenever you load a new scene, allowing you to select which ones are relevant.
* **Scene Presets**: Configure default reminders for each scene. When the scene prompt appears, your defaults will be pre-ticked for you.
* **Auto-Whisper**: An optional "power-user" setting to skip the scene prompt entirely and automatically whisper the preset reminders for a scene the moment it's loaded.
* **Macro Support**: A full API to trigger the module's functions from macros for ultimate convenience.
* **Custom Styling**: Whispered reminders appear in a distinct, custom-styled chat message to stand out from regular chat.

## Installation

1.  Go to the Add-on Modules tab in the Foundry VTT setup screen.
2.  Click "Install Module."
3.  Search for "GM Reminder" and click "Install."
4.  Enable the module in your game world's module settings.

## Usage

The module's power comes from its three main features working together: the Reminder Panel, Scene Prompts, and Automated Triggers.

### The Reminder Panel

This is the heart of the module where you set up all your information.

1.  **Opening the Panel**:
    * Click the **"GM Reminders"** button in the header of your Party Sheet.
    * Or, run the following macro: `game.modules.get('gm-reminder').api.openPanel();`

2.  **Managing Reminders**:
    * **Create Categories**: Type a name in the "New Category Name" box and click "Add Category."
    * **Add Reminders**: Click the "Add Reminder" button under any category to add a new line.
    * **Link Skills**: In the "Linked Skills" box for a category, type the lowercase names of skills you want to link, separated by commas (e.g., `perception, thievery, stealth`).
    * **Link Players**: Next to any individual reminder, use the dropdown menu to assign it to a specific Player Character. Leave it as "General" if it applies to everyone.

### Automated Skill Triggers (PF2e Only)

This is the module's "smart" feature. It listens for rolls in chat and provides reminders automatically.

* **Setup**: In the Reminder Panel, link a category like "Traps" to the `perception` skill. Then, create a reminder "has Trapfinder" and link it to your player "Athos."
* **In-Game**: The party enters a new scene. The first time the player controlling Athos makes a Perception check (either a general check or for initiative), the module will see the roll.
* **Result**: It will instantly whisper the relevant reminders to you, formatted like:
    > **Traps Reminders:**
    > * **Athos:** has Trapfinder

It will only do this the **first time** Athos rolls Perception in that scene, preventing chat spam. If you want reminders on every roll, you can enable this in the module settings.

### Scene Prompts & Presets

This feature helps you prepare for and run your scenes.

1.  **Enable the Feature**: Go to **Game Settings > Module Settings > GM Reminder** and check the box for **"Prompt on Scene Change"**.
2.  **Set Presets (Optional)**: Right-click any scene in the navigation or sidebar and choose "Configure." At the bottom of the window, you'll find a **"GM Reminder Defaults"** section. Check the boxes for any categories you want pre-selected for this scene and save.
3.  **In-Game**: When you activate that scene, one of two things will happen:
    * A dialog box will appear with your preset categories already ticked, allowing you to confirm or add more before whispering.
    * **OR**, if you've also enabled **"Skip Dialogue if Presets are Used"** in the module settings, the module will skip the dialog and immediately whisper the preset reminders to you.

### Macro Support

For full control, you can create script macros for the following functions:

* **Open the Reminder Panel**:
    ```javascript
    game.modules.get('gm-reminder').api.openPanel();
    ```

* **Manually Trigger the Scene Dialog**:
    ```javascript
    game.modules.get('gm-reminder').api.promptDialog();
    ```

* **Whisper a Specific Category**:
    ```javascript
    game.modules.get('gm-reminder').api.whisperCategory('Traps');
    ```
    *(Replace 'Traps' with the name of your category.)*
