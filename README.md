# IF Combo

IF Combo bundles practical SillyTavern interface tools in one extension:

- Parameters/Prompts tabs keep the Chat Completion preset editor tidy.
- Locked Context Size keeps the configured context limit stable.
- Temperature, Top P, Frequency Penalty, and Presence Penalty use compact controls to save space.
- The status bar below the top bar shows the active model, chat, and persona at a glance. Click the chat name to open the chat manager, or the back arrow next to the persona to close the chat and return to the home screen.
- The prompt picker replaces the prompt dropdown in the preset editor footer with inline insert/delete buttons on each row; already-inserted prompts show a check mark instead of the insert button.
- The input history button next to Send reopens previously sent inputs (stored locally, most recent first).
- The eye button in the preset editor footer hides prompts that are toggled off; order and enabled state are left untouched.
- Prompt combos (bookmark button in the preset editor footer) save the current set of toggled-on prompts under a name and re-apply it with one click. Stored per preset; order and contents are never changed.

- Translator adds a standalone translate button to every message action row and a floating button when text is highlighted. It uses a saved Connection Manager profile, shows the translation in place of the message (click again to toggle back without re-translating; hold the button for 3 seconds to translate again), and lets you keep several named translation prompts in the extension settings.

- Image Reader describes every uploaded image with a vision model from a saved Connection Manager profile and appends the description to the message, optionally sending only the description (no raw image) to the main model.

- Each feature can be toggled individually in the extension settings drawer.

<img src=".github/preview.png" alt="Extension preview" width="400" height="auto">

## Installation

### Translator Context build

This build modifies IF Combo 1.16.0 (upstream commit `6b0c581`) with translation context and a saved-translation editor. The build uses the original extension settings and chat data.

1. If IF Combo is already installed, find its `IF-Combo` folder and move it outside SillyTavern's extension folders as a backup.
2. Extract the ZIP so `IF-Combo/manifest.json` is directly inside your extension directory. For a standard per-user installation, that directory is `SillyTavern/data/default-user/extensions/`. For a global installation, use `SillyTavern/public/scripts/extensions/third-party/`.
3. Reload SillyTavern. Open **Extensions → IF Combo → Translator** and select a Connection Manager profile. This build has automatic extension updates disabled.

**Translation context** has independent switches for previous source messages, previous translations, and lorebook entries. The first two use the same 1–30 message window (default 5) immediately before the message being translated. Previous translations are included if their recorded language matches the target language. **Matching and constant entries** uses the current message and recent messages for a keyword scan of SillyTavern's available lorebooks. **All enabled entries** skips keyword matching. Both lorebook modes and the history window have text limits. The selected translation connection receives the context you enable.

Once a full message has a saved translation, click the edit icon beside the language button and choose **Save translation**. The edited display is saved with the chat, and the original message remains available via the language button. With **Include previous translations** enabled, later translations can use edited examples in the configured window. **Pronoun rules for this chat** lets you save explicit forms of address with the active chat.

### Upstream release

Go to **Extensions > Install extension** , then paste the following Git URL:
```
https://github.com/imaginaryfriend1208-gif/IF-Combo
```

#  License
AGPL-3.0
