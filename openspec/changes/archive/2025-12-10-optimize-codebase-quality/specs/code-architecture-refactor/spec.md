# Spec: Code Architecture Refactor

**Capability**: `code-architecture-refactor`  
**Related To**: Core codebase maintainability

## MODIFIED Requirements

### Requirement: Background Service Worker Must Only Perform Used Functions

The background service worker currently implements tab tracking that is never consumed by the popup UI. The system must be simplified to remove unused tracking logic.

#### Scenario: Dead Code Removal
**Given** the background worker contains `sendPeriodicRequest()` function (lines 71-91)  
**And** the function is commented out and never invoked  
**When** the codebase is refactored  
**Then** the function and related code must be completely removed  
**And** no network request logic should remain in the background worker

#### Scenario: Unused Interval Cleanup
**Given** background.js runs `setInterval` every 1 second (line 54-64)  
**And** the interval only saves data without performing meaningful calculations  
**When** the architecture is refactored  
**Then** the interval should be removed or replaced with event-driven updates  
**And** data should only be saved when tabs are actually activated/deactivated

#### Scenario: Simplified Background Worker
**Given** the background worker tracks `inactiveTabsData` locally  
**And** this data is never read by the popup UI  
**When** evaluating the architecture  
**Then** either remove the background tracking entirely, OR  
**And** integrate it properly with the popup to display richer inactive tab data  
**Decision Point**: See proposal Open Questions #1

### Requirement: Storage Utility Module Must Be Utilized or Removed

The `src/utils/storage.js` module exists but is completely unused, creating dead code.

#### Scenario: Storage Module Integration
**Given** `storage.js` exports utility functions for Chrome storage access  
**And** the background worker directly calls `chrome.storage.local` instead  
**And** the popup does not use storage at all  
**When** refactoring the codebase  
**Then** either integrate the storage utility into background.js  
**Or** remove the storage.js file if not needed

#### Scenario: Consistent Storage Access Patterns
**Given** storage operations are performed in background.js  
**When** using the storage utility  
**Then** all Chrome storage calls must go through the utility module  
**And** provide consistent error handling and type safety

## MODIFIED Requirements

### Requirement: Popup and Background SHALL Have Clear Data Flow

Currently, the popup uses `chrome.tabs.lastAccessed` while the background tracks tabs independently. The system MUST use exactly one authoritative source for tab access time data.

#### Scenario: Data Source Clarity
**Given** the popup needs tab access time information  
**And** two sources exist: Chrome API `lastAccessed` and background worker tracking  
**When** displaying tab information  
**Then** the system must use exactly one authoritative source  
**And** document the choice in code comments

#### Scenario: Remove Redundant Tracking
**Given** Chrome provides native `lastAccessed` timestamps (API level)  
**And** background worker implements custom tracking  
**When** the redundancy is identified  
**Then** remove custom tracking if Chrome API is sufficient  
**Or** enhance custom tracking to provide additional value (e.g., historical data)

## REMOVED Requirements

### Requirement: Periodic Network Requests for Tab Data

**Rationale**: The `sendPeriodicRequest()` function and associated interval timer are commented out and serve no purpose in the current privacy-focused design.

#### Scenario: Network Code Removal
**Given** lines 71-91 contain unused network request logic  
**And** lines 93-97 contain commented `setInterval` calls  
**When** cleaning up the codebase  
**Then** all related code must be permanently removed  
**And** no traces of network request functionality should remain
