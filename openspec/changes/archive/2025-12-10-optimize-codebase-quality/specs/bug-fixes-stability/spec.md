# Spec: Bug Fixes and Stability

**Capability**: `bug-fixes-stability`  
**Related To**: `code-architecture-refactor` (data flow fixes)

## ADDED Requirements

### Requirement: Service Worker SHALL Persist Data Across Hibernation Cycles

Manifest V3 service workers can be terminated by Chrome after 30 seconds of inactivity. The service worker MUST restore all in-memory state from persistent storage on restart to prevent data loss.

#### Scenario: Data Loss Prevention
**Given** the background service worker stores `inactiveTabsData` in memory  
**And** Chrome terminates the service worker after inactivity  
**When** the service worker restarts  
**Then** it must restore `inactiveTabsData` from `chrome.storage.local`  
**And** no tab tracking data should be lost

#### Scenario: Initialization from Storage
**Given** the service worker is starting for the first time or after hibernation  
**When** the startup routine runs  
**Then** it must call `chrome.storage.local.get(['inactiveTabsData'])`  
**And** populate the in-memory `inactiveTabsData` object  
**And** handle cases where storage is empty (first run)

### Requirement: The System MUST Prevent Memory Leaks from Closed Tabs

The `inactiveTabsData` object grows indefinitely without cleanup for closed tabs. The system SHALL automatically remove entries for closed tabs.

#### Scenario: Closed Tab Cleanup
**Given** a tab is closed by the user  
**And** the tab exists in `inactiveTabsData`  
**When** the `chrome.tabs.onRemoved` event fires  
**Then** the background worker must delete the tab entry from `inactiveTabsData`  
**And** persist the updated data to storage

#### Scenario: Stale Tab Detection
**Given** the service worker maintains tab tracking data  
**And** tabs may be closed while the service worker is hibernated  
**When** the service worker starts or periodically (max every 5 minutes)  
**Then** it must query `chrome.tabs.query({})` to get current tab IDs  
**And** remove entries in `inactiveTabsData` for tabs that no longer exist

### Requirement: Favicon Display SHALL Have Correct Sizing

CSS in `app.css` lines 63-67 declares contradictory flex and size properties. The system MUST render favicons with consistent, non-distorted sizing.

#### Scenario: Favicon Layout Fix
**Given** `.favicon` class declares `width: 32px; height: 32px;`  
**And** also declares `flex: 0 0 16px`  
**When** rendering tab favicons  
**Then** the flex-basis must match the actual size: `flex: 0 0 32px`  
**Or** the size properties must match the flex-basis: `width: 16px; height: 16px`  
**And** the icon must not be distorted or cut off

### Requirement: Tab Activation SHALL Handle Invalid Tab IDs Gracefully

The `activateTab()` function in App.vue does not check if the tab still exists before activation. The system MUST handle attempts to activate closed tabs without crashing.

#### Scenario: Graceful Tab Switch Failure
**Given** a tab is displayed in the popup list  
**And** the user closes the tab in another window  
**When** the user clicks the tab in the popup  
**Then** `chrome.tabs.update()` must handle the error gracefully  
**And** display a user-friendly message like "Tab no longer exists"  
**And** refresh the tab list to remove the closed tab

#### Scenario: Error Handling Implementation
**Given** `activateTab(tabId)` calls `chrome.tabs.update()`  
**When** the API call is made  
**Then** it must use try-catch or .catch() to handle errors  
**And** provide user feedback via a toast notification or inline message

### Requirement: Error Handling SHALL NOT Silently Swallow Exceptions

The `onMounted` async function in App.vue has an empty catch block (lines 153-154). The system MUST log and present errors to users meaningfully.

#### Scenario: Meaningful Error Logging
**Given** an error occurs during tab fetching in `onMounted`  
**When** the catch block is executed  
**Then** it must log the error with context: `console.error('Failed to load tabs:', error)`  
**And** optionally display an error message to the user

#### Scenario: User Error Feedback
**Given** tab fetching fails (e.g., permissions denied)  
**When** the error is caught  
**Then** the UI must display a friendly error message  
**And** provide actionable guidance (e.g., "Please refresh or check permissions")

### Requirement: I18n Fallback SHALL Work Without Hardcoded Imports

The current i18n fallback imports `enMessages` directly, preventing dynamic locale switching. The system MUST provide fallback messages without requiring static imports of all locales.

#### Scenario: Dynamic Locale Fallback
**Given** `chrome.i18n.getMessage()` returns an empty string  
**And** the user's locale is not English  
**When** falling back to default messages  
**Then** the system should attempt to load the locale file dynamically  
**Or** use a runtime fallback mechanism that doesn't require static imports  
**And** avoid loading English JSON for non-English users unnecessarily

#### Scenario: Graceful Message Key Missing
**Given** a message key does not exist in any locale file  
**When** `getMessage(key)` is called  
**Then** it should return a human-readable fallback like `[Missing: ${key}]`  
**And** log a warning to console for developers  
**And** not crash or display technical error messages to users
