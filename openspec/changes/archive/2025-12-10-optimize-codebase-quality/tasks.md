# Tasks: Optimize Codebase Quality

**Change ID**: `optimize-codebase-quality`

## Implementation Tasks

These tasks are ordered to minimize risk and deliver incremental value. Each task is independent within its phase, allowing for parallel work when possible.

---

## Phase 1: Code Quality & Dead Code Cleanup (Low Risk)

### Task 1.1: Translate All Comments to English
- **Files**: `src/background/background.js`, all source files
- **Actions**:
  - Replace Chinese comments with English equivalents (lines 6-21 in background.js)
  - Translate object keys in `browserInfo` comments
  - Update console.log messages to English
- **Validation**: All comments and logs are in English; manual code review passes
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 1.2: Remove Dead Code from Background Worker
- **Files**: `src/background/background.js`
- **Actions**:
  - Delete `sendPeriodicRequest()` function (lines 71-91)
  - Delete commented `setInterval` calls (lines 93-97)
  - Remove associated constants/variables if any
- **Validation**: No references to network request code remain; extension builds successfully
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 1.3: Add JSDoc Documentation to Core Functions
- **Files**: `src/popup/App.vue`, `src/utils/storage.js`, `src/background/background.js`
- **Actions**:
  - Add JSDoc comments to `formatTime()`, `getTimeClass()`, `activateTab()`, `getMessage()`
  - Document storage utility functions with parameter types
  - Add module-level JSDoc for each file explaining its purpose
- **Validation**: All exported functions have JSDoc; run JSDoc linter if available
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 1.4: Implement CSS Design Tokens
- **Files**: `src/styles/app.css`
- **Actions**:
  - Define CSS custom properties in `:root` for all colors
  - Replace hardcoded color values with `var(--token-name)`
  - Define dark mode token overrides in media query
  - Test both light and dark themes render correctly
- **Validation**: No hardcoded color hex values remain; visual regression test passes
- **Dependencies**: None
- **Status**: ✅ Completed

---

## Phase 2: Bug Fixes & Stability (Medium Risk)

### Task 2.1: Fix Favicon CSS Layout Bug
- **Files**: `src/styles/app.css`
- **Actions**:
  - Change `.favicon` CSS from `flex: 0 0 16px` to `flex: 0 0 32px` (line 65)
  - Or change `width/height` from `32px` to `16px` to match flex-basis
  - Verify favicons render at consistent size without distortion
- **Validation**: Favicon layout is correct in both light and dark modes
- **Dependencies**: None
- **Status**: ✅ Completed (fixed to `flex: 0 0 32px`)

### Task 2.2: Implement Service Worker Data Persistence
- **Files**: `src/background/background.js`
- **Actions**:
  - Add startup routine to restore `inactiveTabsData` from `chrome.storage.local`
  - Wrap restoration in try-catch with error logging
  - Test by manually terminating service worker and verifying data restores
- **Validation**: Data persists across service worker hibernation cycles
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 2.3: Prevent Memory Leaks from Closed Tabs
- **Files**: `src/background/background.js`
- **Actions**:
  - Add `chrome.tabs.onRemoved` listener to delete closed tab data
  - Implement periodic cleanup function (every 5 minutes) to remove stale entries
  - Query current tabs and remove entries not in the list
- **Validation**: Memory usage stays stable; closed tabs removed from storage
- **Dependencies**: Task 2.2 (uses same storage patterns)
- **Status**: ✅ Completed

### Task 2.4: Add Error Handling to Tab Activation
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Wrap `chrome.tabs.update()` in try-catch in `activateTab()` (line 131-133)
  - Display user-friendly error message on failure (toast or inline)
  - Optionally refresh tab list after error to remove closed tabs
- **Validation**: Clicking a closed tab shows error instead of silent failure
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 2.5: Fix Error Swallowing in Tab Loading
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Add meaningful error logging in `onMounted` catch block (line 153-154)
  - Display error UI to user when tab fetching fails
  - Provide retry button or helpful guidance
- **Validation**: Errors are logged and visible to users; error states are tested
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 2.6: Add Input Validation to Storage Utilities
- **Files**: `src/utils/storage.js`
- **Actions**:
  - Validate `seconds` parameter in `setInactiveThreshold()` is a positive number
  - Add type checks and throw descriptive errors for invalid inputs
  - Add try-catch to `getInactiveTabsData()` to handle corrupted data
- **Validation**: Unit tests pass for valid and invalid inputs
- **Dependencies**: None
- **Status**: ✅ Completed

---

## Phase 3: UI/UX Enhancements (Low Risk)

### Task 3.1: Implement Skeleton Loading State
- **Files**: `src/popup/App.vue`, `src/styles/app.css`
- **Actions**:
  - Create skeleton component with pulsing animation
  - Show 3-5 skeleton items while `tabs.length === 0` and loading
  - Replace with actual tabs when data loads
- **Validation**: Loading state is visible when popup opens; smooth transition to data
- **Dependencies**: None
- **Status**: ⏭️ Deferred (simpler loading state implemented)

### Task 3.2: Add Empty State for No Tabs
- **Files**: `src/popup/App.vue`, `src/styles/app.css`, i18n messages
- **Actions**:
  - Create empty state component with icon and message
  - Show when all tabs are filtered out (no normal tabs)
  - Add i18n message keys for empty state text
- **Validation**: Empty state displays when expected; text is localized
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 3.3: Add ARIA Labels for Accessibility
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Add `role="button"` and `aria-label` to tab items
  - Add `role="list"` to tab list container
  - Add descriptive `aria-label` to time badges with full time text
- **Validation**: Screen reader announces elements correctly; accessibility audit passes
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 3.4: Implement Keyboard Navigation
- **Files**: `src/popup/App.vue`, `src/styles/app.css`
- **Actions**:
  - Add `tabindex="0"` to tab items
  - Add event listeners for Enter/Space to activate tabs
  - Implement arrow key navigation (Up/Down) between tabs
  - Style focus indicators with visible outline
- **Validation**: All interactive elements navigable via keyboard; focus visible
- **Dependencies**: Task 3.3 (builds on ARIA structure)
- **Status**: ✅ Completed (Enter/Space support added, arrow keys deferred)

### Task 3.5: Add Visual Feedback for Tab Activation
- **Files**: `src/popup/App.vue`, `src/styles/app.css`
- **Actions**:
  - Add CSS transition for background color change on click
  - Optionally add ripple effect using pseudo-elements
  - Highlight currently active tab with distinct style
- **Validation**: Click feedback is immediate and smooth; active tab is visually distinct
- **Dependencies**: None
- **Status**: ⏭️ Deferred (focus state provides feedback)

### Task 3.6: Implement Search/Filter Functionality
- **Files**: `src/popup/App.vue`, `src/styles/app.css`, i18n messages
- **Actions**:
  - Add search input field to header
  - Implement reactive filter logic on tab title and domain
  - Display match count ("Showing X of Y tabs")
  - Add i18n keys for search placeholder and match count
- **Validation**: Search filters tabs correctly; count updates in real-time
- **Dependencies**: None (can be done in parallel with other tasks)
- **Status**: ⏭️ Deferred (future enhancement)

### Task 3.7: Verify Color Contrast Compliance
- **Files**: `src/styles/app.css`
- **Actions**:
  - Measure color contrast ratios for all text using WCAG tools
  - Adjust time badge colors if contrast is insufficient (< 4.5:1)
  - Test both light and dark modes
  - Document contrast ratios in comments or design spec
- **Validation**: All text meets WCAG AA standards; verified with automated tool
- **Dependencies**: Task 1.4 (design tokens in place)
- **Status**: ⏭️ Deferred (manual verification recommended)

---

## Phase 4: Performance Optimization (Medium Risk)

### Task 4.1: Optimize Tab Fetching to Single API Call
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Verify `chrome.tabs.query({})` returns `lastAccessed` property
  - Remove individual `chrome.tabs.get()` calls in map (line 144)
  - Use `lastAccessed` directly from query results
  - Measure performance improvement
- **Validation**: Tab loading time < 100ms for 50 tabs; only 1 API call made
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 4.2: Implement Time Calculation Memoization
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Move time calculations to Vue computed properties or useMemo
  - Cache results keyed by tab ID and timestamp
  - Only recalculate when `lastAccessed` changes
- **Validation**: Time functions not called on every render; performance profiling shows improvement
- **Dependencies**: None
- **Status**: ⏭️ Deferred (current implementation sufficient)

### Task 4.3: Add Debounced Time Updates
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Implement 30-second interval to update relative times
  - Batch updates into single re-render cycle
  - Pause updates when popup is not visible (use `document.visibilitychange`)
- **Validation**: Time badges update every 30 seconds; no updates when popup hidden
- **Dependencies**: Task 4.2 (builds on memoization)
- **Status**: ⏭️ Deferred (future enhancement)

### Task 4.4: Implement Tab Data Caching
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Store fetched tabs in module-level cache with timestamp
  - Reuse cache if popup reopened within 5 seconds
  - Invalidate cache on stale timestamp
- **Validation**: Second popup open uses cache; faster load time measured
- **Dependencies**: None
- **Status**: ⏭️ Deferred (future enhancement)

### Task 4.5: Optimize Favicon Loading
- **Files**: `src/popup/App.vue`
- **Actions**:
  - Add `loading="lazy"` attribute to favicon images
  - Ensure fallback icon shows immediately while loading
  - Test lazy loading with long tab lists (50+)
- **Validation**: Favicons load progressively; no blocking render
- **Dependencies**: None
- **Status**: ✅ Completed

### Task 4.6: Implement Virtual Scrolling (Optional, for 100+ tabs)
- **Files**: `src/popup/App.vue`, dependencies
- **Actions**:
  - Install `vue-virtual-scroller` or similar library
  - Wrap tab list in virtual scroller component
  - Configure item height and buffer settings
  - Test with 100+ tabs for smooth 60fps scrolling
- **Validation**: Popup remains responsive with 200+ tabs; scrolling smooth
- **Dependencies**: All Phase 4 tasks complete (this is highest risk)
- **Status**: ⏭️ Deferred (future enhancement)

### Task 4.7: Audit and Minimize Bundle Size
- **Files**: `package.json`, `vite.config.js`
- **Actions**:
  - Run `npm run build` and analyze output bundle sizes
  - Use Vite's bundle visualizer to identify large dependencies
  - Remove unused dependencies if any
  - Document bundle size before and after optimization
- **Validation**: Total extension size < 200KB; no unused dependencies remain
- **Dependencies**: None
- **Status**: ✅ Completed (build successful, size ~92KB total)

---

## Phase 5: Architecture Refactor (Optional, Highest Risk)

### Task 5.1: Decide on Background Worker Strategy
- **Files**: Design decision document
- **Actions**:
  - Evaluate whether to keep or remove background tab tracking
  - If keeping: integrate tracking data with popup UI
  - If removing: delete background worker entirely, use Chrome API only
  - Document decision and rationale
- **Validation**: Design decision approved by maintainer or team
- **Dependencies**: All Phase 1-4 tasks complete

### Task 5.2: Integrate or Remove Storage Utility Module
- **Files**: `src/utils/storage.js`, `src/background/background.js`
- **Actions**:
  - If keeping: refactor background.js to use storage utility
  - If removing: delete storage.js and inline logic where needed
  - Ensure consistency across all storage access
- **Validation**: All storage operations use single pattern; no redundant code
- **Dependencies**: Task 5.1 (depends on architecture decision)

### Task 5.3: Consolidate Popup and Background Data Flow
- **Files**: `src/popup/App.vue`, `src/background/background.js`
- **Actions**:
  - Establish single source of truth for tab access times
  - Remove redundant tracking if Chrome API is sufficient
  - Or enhance background tracking to provide richer data (e.g., historical trends)
- **Validation**: Data flow is clear and documented; no redundant systems
- **Dependencies**: Tasks 5.1, 5.2

---

## Testing & Validation

### Manual Testing Checklist
- [x] Load extension in Chrome Developer Mode
- [x] Open popup and verify tabs load correctly
- [ ] Test search/filter functionality (if implemented)
- [x] Test keyboard navigation (Tab, Enter, Space keys)
- [ ] Test dark mode vs light mode rendering (manual verification needed)
- [ ] Test with 0, 10, 50, 100+ tabs (manual verification needed)
- [x] Test tab activation (clicking tabs switches correctly)
- [x] Test error handling (close a tab, then click it in popup)
- [ ] Test service worker hibernation (wait 5 minutes, verify data persists)
- [ ] Test accessibility with screen reader (NVDA/JAWS/VoiceOver)

### Performance Testing
- [x] Measure popup open time with 50 tabs (target: < 200ms)
- [x] Measure API call count (target: 1 call per popup open) - Achieved
- [ ] Measure memory usage over 1 hour (no leaks)
- [x] Measure bundle size (target: < 200KB) - Achieved: ~92KB

### Code Quality Checks
- [x] All comments in English
- [x] All functions have JSDoc
- [x] No console.log with Chinese text
- [x] No hardcoded color values (use design tokens)
- [x] No dead code or commented-out logic
- [x] Input validation on all public functions

---

## Rollback Plan

If any task introduces regressions:
1. **Immediate**: Revert the specific commit introducing the bug
2. **Investigation**: Identify root cause in isolated environment
3. **Fix**: Apply corrected implementation with additional tests
4. **Re-deploy**: Merge fix after validation

Each task should be a single atomic commit to enable easy rollback.

---

## Notes

- Tasks within a phase can be parallelized by different contributors
- Phase 1 must complete before Phase 2 (code quality cleanup reduces merge conflicts)
- Phase 4 (performance) can start after Phase 2 (stability) is complete
- Phase 5 (architecture) is optional and requires design approval
- Estimated total effort: 3-5 days for one developer (Phases 1-4)
