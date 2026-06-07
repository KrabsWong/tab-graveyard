# Tab Graveyard

Tab Graveyard is a Chrome extension for people who keep too many tabs open because closing them feels like losing context. It turns browser tabs into local, searchable memory so users can close tabs with less risk and return to the right page later.

The product vision is simple: closing a tab should be a reversible act. Tab Graveyard records lightweight page metadata, helps distinguish useful memories from forgotten noise, and gives users a practical way to recover, review, archive, and resurface browser context.

<img width="1612" height="836" alt="image" src="https://github.com/user-attachments/assets/6cc203ab-db88-435b-a649-93daa6e105cc" />

## Core Features

- Recall recently useful pages from a dedicated dashboard.
- Detect Ghost Tabs: inactive tabs that look safe to archive.
- Browse archived memory by timeline, source, entity, and session.
- Restore individual tabs or grouped browsing sessions.
- Search by title, URL, domain, topic, source, type, entity, reading status, and importance.
- Use bilingual Chinese and English interface text, with system-language detection.
- Switch between light, dark, and system theme modes.
- Edit memory cards and save domain-level correction rules.
- Show favicon, page summary, source, content type, reading status, importance, activity time, and archive status.
- Track local behavior signals such as activation, active time, scroll depth, copied URL, restore, and resurface feedback.
- Configure DeepSeek API access for AI-enhanced summaries, topics, entities, importance, possible search terms, and session names.
- Keep privacy controls explicit with strict local-only mode, blacklist rules, data export/import, and a data log.
- Pair a GitHub identity with the deployed Tab Graveyard Server through GitHub Device Flow.

## Privacy Model

Tab Graveyard is local-first. Browser memory is stored in `chrome.storage.local`.

Stored locally:

- URL
- title
- domain
- timestamps
- inferred source/type/topic/entity metadata
- lightweight behavior signals
- edited card fields and local correction rules

Never captured:

- passwords
- private form values
- full page archives
- page body text by default

When DeepSeek enhancement is enabled and strict privacy mode is off, the extension sends only local metadata such as title, URL, domain, and existing memory-card fields to the configured DeepSeek-compatible endpoint.

## Sync Identity

The extension can connect to Tab Graveyard Server through GitHub OAuth Device Flow. This is used only as a stable user identity for future cloud sync. It does not enable data sync by itself.

The current production server is:

```text
https://tab-graveyard-server.yooooo.workers.dev
```

After GitHub authorization, the extension stores local access and refresh tokens in `chrome.storage.local`. The server stores GitHub identity fields needed to recognize the same user across devices:

- GitHub user ID
- login/display name
- avatar URL
- bio
- follower/following counts

GitHub email is not requested or displayed. Local AI provider configuration and API keys are not uploaded.

## Install In Chrome

Build the extension first:

```bash
npm install
npm run build
```

Then load it in Chrome:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the generated `dist` folder in this project.
5. Open a new tab or click the extension popup to start using Tab Graveyard.

After loading the extension, Chrome will use the files from `dist`. If you make code changes, run `npm run build` again and click the reload button for the extension in `chrome://extensions`.

## Development

Run a local development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The main extension surfaces are:

- `popup.html`: browser action popup
- `dashboard.html`: main Tab Graveyard workspace
- `newtab.html`: new tab experience
- `options.html`: settings page
- `src/background.ts`: Chrome extension background logic
- `src/content.ts`: resurface content script
- `src/main.tsx`: React UI

## Current Scope

This repository implements the local Chrome extension prototype described in `docs/Tab-Graveyard-PRD-Final.md`.

GitHub identity pairing is connected to the deployed Tab Graveyard Server. Full tab-memory sync, billing, and public leaderboard backends are not enabled yet. Related UI surfaces remain local-first unless explicitly connected to the server.
