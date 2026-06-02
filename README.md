# Tab Graveyard

Chrome MV3 extension prototype for the PRD in `docs/Tab-Graveyard-PRD-Final.md`.

## Run

```bash
npm install
npm run build
```

Then open Chrome:

1. Go to `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project's `dist` folder.

## Implemented

- Popup, New Tab, Dashboard, and Options pages.
- Local Tab Memory in `chrome.storage.local`.
- Editable info cards, source/type/topic/entity inference, custom tags, bilingual cue matching, and domain-level correction rules.
- Ghost Tab detection, archive preview/trust stages, 5-second undo, single tab and session restore.
- Recall input, local synthesis/clarification, time/source/type/importance/reading/color/topic/entity facets, Why-Tips, result cards, sessions browsing.
- Graveyard browsing by timeline, source, entity, and session, with fingerprint dedupe.
- Session rename, merge, split, and restore controls.
- Onboarding choices: import 30-day history, demo workspace, or start empty.
- Strict privacy mode, pause recording, blacklist, privacy map, data log, export/import JSON.
- Omnibox keyword `tg`, `Cmd/Ctrl+Shift+F` dashboard command, and Resurface content toast with frequency, cooldown, dismissal, and click tracking.
- Local behavior signals: activation count, active time, max scroll depth, copy events, referrer-like signal, restore/resurface feedback.
- DeepSeek API configuration with local API key storage, configurable model/base URL, connection test, AI-enhanced info cards, session naming, and guarded AI recall expansion.
- Local leaderboard/premium/cloud-sync placeholder panels for product surface validation.

Cloud sync, billing, and public leaderboard backends are intentionally not faked in this prototype; their UI surfaces are local-only placeholders.
