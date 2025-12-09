# Project Context

## Purpose
Tab Graveyard is a Chrome extension that helps users manage their browser tabs by tracking and displaying the last access time for each tab. It provides visual indicators to help users identify inactive tabs that may be candidates for closing, reducing browser clutter and improving performance. The extension supports dark mode and offers an intuitive popup interface for quick tab navigation.

## Tech Stack
- **Frontend Framework**: Vue 3.3.4 with Composition API
- **Build Tool**: Vite 4.4.0
- **Browser Platform**: Chrome Extension Manifest V3 (minimum Chrome 88)
- **Plugin**: vite-plugin-chrome-extension (0.0.7) for building the extension
- **Vue Tooling**: @vitejs/plugin-vue (4.2.3)
- **Utilities**: fs-extra (11.3.0) for file operations during build
- **Language**: JavaScript (no TypeScript currently)

## Project Conventions

### Code Style
- **File Naming**: Kebab-case for directories (e.g., `_locales`, `popup`), camelCase for JavaScript files (e.g., `background.js`)
- **Component Structure**: Single File Components (.vue) using Vue 3 Composition API with `<script>` setup pattern
- **Variable Naming**: camelCase for variables and functions (e.g., `inactiveTabsData`, `formatTime`)
- **Comments**: Currently Chinese comments in background.js, English preferred for consistency
- **Formatting**: 2-space indentation
- **Import Style**: Relative imports with file extensions omitted for modules (e.g., `import enMessages from '../_locales/en/messages.json'`)

### Architecture Patterns

**Chrome Extension MV3 Architecture**:
- **Background Service Worker** (`src/background/background.js`): Manages tab state tracking, listens to tab activation events, and stores inactive tab data in chrome.storage.local
- **Popup UI** (`src/popup/`): Vue 3 SPA that displays tab information when the extension icon is clicked
- **Manifest** (`src/manifest.json`): Declares permissions (tabs, activeTab, tabGroups) and extension metadata

**Key Architectural Decisions**:
- **State Management**: Uses Chrome's storage.local API instead of Vuex/Pinia for persistence
- **Tab Tracking**: Background service worker tracks tabs via `chrome.tabs.onActivated` listener and periodic interval checks
- **i18n**: Chrome i18n API with fallback to English messages.json when translation is missing
- **Styling**: Global CSS files imported into components, supports system dark mode via media queries
- **Build Process**: Custom Vite plugins copy static assets (_locales, styles, assets) to dist directory

**Component Structure**:
```
src/
├── background/
│   └── background.js         # Service worker for tab tracking
├── popup/
│   ├── App.vue               # Main popup component
│   ├── index.html            # Popup entry point
│   └── main.js               # Vue app initialization
├── utils/
│   └── storage.js            # Chrome storage wrapper utilities
├── styles/
│   ├── global.css            # Global styles and CSS variables
│   └── app.css               # Component-specific styles
├── _locales/
│   ├── en/messages.json      # English translations
│   └── zh_CN/messages.json   # Chinese translations
├── assets/
│   └── icons/                # Extension icons (16, 32, 48, 128px)
└── manifest.json             # Extension manifest
```

### Testing Strategy
- **Current State**: No automated testing is implemented
- **Future Plans**: Consider adding:
  - Unit tests for utility functions (e.g., time formatting, URL parsing)
  - Integration tests for Chrome API interactions using jest-chrome or similar
  - E2E tests for popup UI interactions
- **Manual Testing**: Test in Chrome browser with extension loaded in developer mode

### Git Workflow
- **Repository**: https://github.com/KrabsWong/tab-graveyard
- **Branching**: Not explicitly defined; appears to use direct commits to main branch
- **Commit Style**: Mixed Chinese and English commit messages; English preferred for consistency
- **Recommended**: Adopt conventional commits format (feat:, fix:, docs:, etc.) for clearer history

## Domain Context

### Chrome Extension Concepts
- **Manifest V3**: Latest Chrome extension platform requiring service workers instead of background pages
- **Service Worker Lifecycle**: Background scripts run as event-driven workers, not persistent processes
- **Permissions**: Extension requires `tabs` (read tab info), `activeTab` (access active tab), `tabGroups` (future group management)
- **chrome.storage.local**: Persistent key-value storage available to extension contexts
- **chrome.i18n**: Internationalization API for localized messages

### Tab Management
- **lastAccessed Property**: Chrome API provides timestamp (milliseconds since epoch) for when a tab was last in focus
- **Tab Filtering**: Extension excludes internal Chrome URLs (chrome://, chrome-extension://, about:)
- **Tab Activation**: Users can click tabs in popup to switch focus using `chrome.tabs.update(tabId, { active: true })`

### Visual Indicators
- **Time-based Color Coding**:
  - Green: Just accessed (< 1 minute)
  - Recent: 1 minute to 1 hour
  - Medium: 1 to 24 hours
  - Old: > 24 hours (red)
- **Dark Mode**: CSS automatically adapts to system preferences via `prefers-color-scheme` media query

### Internationalization (i18n)
- Uses Chrome i18n format with `messages.json` files in `_locales/<locale>/` directories
- Supports English (en) and Simplified Chinese (zh_CN)
- Custom fallback mechanism in `getMessage()` function loads English if current locale fails
- Message placeholders supported (e.g., `$COUNT$` for dynamic values)

## Important Constraints

### Technical Constraints
- **Minimum Chrome Version**: 88 (declared in manifest)
- **Manifest V3 Required**: Cannot use Manifest V2 features (e.g., persistent background pages)
- **Service Worker Limitations**: Background script cannot use DOM APIs, must use chrome.* APIs
- **Offline Support**: Extension marked as `offline_enabled: true`, must work without network
- **No External Dependencies**: All logic runs locally; no third-party services or analytics

### Privacy & Security
- **No Data Collection**: Extension does not transmit any data to external servers (privacy policy in README)
- **Local Storage Only**: Tab data stored exclusively in chrome.storage.local
- **No Tracking**: No cookies, analytics, or user behavior tracking
- **Permissions Justification**: 
  - `tabs`: Required to read tab titles, URLs, and lastAccessed timestamps
  - `activeTab`: Required for tab activation on click
  - `tabGroups`: Currently unused, likely for future group management features

### Browser Compatibility
- **Chrome-Only**: Extension uses Chrome-specific APIs, not compatible with Firefox (WebExtensions) without modifications
- **Icon Requirements**: Must provide 16, 32, 48, and 128px icons for different contexts

## External Dependencies

### Build Tools
- **Vite**: Modern build tool providing fast dev server and optimized production builds
- **vite-plugin-chrome-extension**: Handles Chrome extension-specific build requirements (manifest processing, script bundling)
- **@vitejs/plugin-vue**: Compiles Vue 3 Single File Components
- **fs-extra**: Used in custom Vite plugins to copy static assets during build

### Runtime Dependencies
- **Vue 3**: Reactive UI framework, loaded only in popup context (not background)
- **Chrome APIs**: Extension relies entirely on browser-provided APIs (chrome.tabs, chrome.storage, chrome.i18n, chrome.runtime)

### Development Workflow
- **npm run dev**: Starts Vite dev server (note: may require manual extension reload in Chrome)
- **npm run build**: Builds extension to `dist/` directory ready for Chrome installation
- **Manual Installation**: Load unpacked extension from `dist/` folder in Chrome developer mode

### Key Chrome APIs Used
- `chrome.tabs.query()`: Retrieve all tabs
- `chrome.tabs.get()`: Get detailed tab info including lastAccessed
- `chrome.tabs.onActivated`: Event listener for tab switches
- `chrome.tabs.update()`: Activate a tab
- `chrome.storage.local`: Persist tab tracking data
- `chrome.i18n.getMessage()`: Retrieve localized strings
- `chrome.runtime.getPlatformInfo()`: Get system information (used for debugging)

## Future Improvements
- Add automated testing (unit, integration, E2E)
- Consider TypeScript migration for better type safety
- Implement tab grouping features (permission already declared)
- Add user configuration for time thresholds and color schemes
- Standardize commit message format and establish branching strategy
- Remove unused code (e.g., `sendPeriodicRequest` function in background.js)
- Translate all comments and console logs to English for consistency
