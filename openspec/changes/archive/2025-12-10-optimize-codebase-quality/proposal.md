# Proposal: Optimize Codebase Quality

**Change ID**: `optimize-codebase-quality`  
**Status**: Draft  
**Created**: 2025-12-10  
**Author**: AI Assistant

## Overview

This proposal addresses multiple quality, maintainability, and functionality issues discovered during comprehensive codebase review. The changes span code abstraction improvements, bug fixes, UI/UX enhancements, and architectural refinements.

## Problem Statement

After thorough analysis of the Tab Graveyard extension, several categories of issues were identified:

### 1. **Functionality & Architecture Issues**
- Background service worker tracks inactive tabs but the data is never used by the popup UI
- The popup relies solely on `chrome.tabs.lastAccessed` API, ignoring the background tracking system
- Dead code: `sendPeriodicRequest()` function in background.js (lines 71-91)
- Inefficient: `setInterval` runs every 1 second but performs unnecessary checks (line 54-64)
- Storage utility module exists but is unused throughout the codebase
- No error handling or user feedback for Chrome API failures

### 2. **Potential Bugs**
- **Race condition**: Background worker's in-memory `inactiveTabsData` can be lost on service worker hibernation (Manifest V3 limitation)
- **Memory leak risk**: `inactiveTabsData` object grows unbounded; closed tabs never removed
- **Incorrect favicon sizing**: CSS declares `flex: 0 0 16px` but `width/height: 32px` causing layout issues (app.css:63-67)
- **Missing null checks**: `activateTab()` doesn't handle cases where tab might be closed (App.vue:131-133)
- **Silent error swallowing**: Empty catch block in `onMounted` (App.vue:153-154)
- **i18n fallback issue**: Hardcoded English JSON import fails for dynamic locale switching

### 3. **Code Quality & Maintainability**
- Mixed Chinese/English comments throughout codebase
- Inconsistent console logging (Chinese console.log messages)
- No input validation in storage utility functions
- Hardcoded color values in CSS without design token abstraction
- No TypeScript types or JSDoc documentation
- No automated tests (unit, integration, or E2E)
- Build configuration uses deprecated/unmaintained plugin (`vite-plugin-chrome-extension@0.0.7`)

### 4. **UI/UX Improvements Needed**
- No loading states or skeleton screens during initial tab fetch
- No empty state when all tabs are filtered out (only shows loading message)
- No accessibility labels (ARIA) for screen readers
- No keyboard navigation support (tab switching via keyboard)
- Time badge colors don't follow color-blind friendly palettes
- Fixed popup width (400-600px) doesn't adapt to content or user preference
- No visual indication when switching to a tab (click feedback)
- No search/filter functionality for large tab lists
- Domain display is not actionable (could be a clickable link)

### 5. **Performance Concerns**
- Fetches ALL tabs on every popup open (no caching or pagination)
- Inefficient: Calls `chrome.tabs.get()` individually for each tab (line 144) instead of batch query
- No debouncing on time calculations causing excessive re-renders
- CSS imports not optimized (separate global.css and app.css)

## Proposed Solution

This proposal divides the optimization work into **5 focused capabilities**, each addressing a specific concern:

1. **`code-architecture-refactor`**: Clean up dead code, consolidate unused modules, fix background/popup data flow
2. **`bug-fixes-stability`**: Address race conditions, memory leaks, null checks, and error handling
3. **`code-quality-standards`**: Standardize comments, add JSDoc, improve logging, validate inputs
4. **`ui-ux-enhancements`**: Improve loading states, accessibility, keyboard nav, visual feedback, search
5. **`performance-optimization`**: Optimize API calls, add caching, improve render efficiency

Each capability has dedicated spec deltas defining requirements with concrete scenarios.

## Scope & Dependencies

### In Scope
- Refactoring existing code without changing core user-facing features
- Bug fixes that prevent data loss or unexpected behavior
- UI improvements that enhance usability without redesigning the interface
- Performance optimizations that reduce API calls and improve responsiveness

### Out of Scope
- Complete UI redesign or branding changes
- Adding new major features (e.g., tab grouping, auto-close)
- Migration to TypeScript (marked as future work)
- Publishing to Chrome Web Store (already exists)
- Implementing automated testing infrastructure (separate proposal recommended)

### Dependencies
- No breaking changes to Chrome Extension APIs
- Maintains compatibility with Chrome 88+
- Preserves existing i18n support (en, zh_CN)
- Does not require new permissions

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service worker changes break tab tracking | High | Thorough manual testing; add persistence validation |
| Refactoring introduces regressions | Medium | Keep changes atomic; test each capability independently |
| Performance optimizations don't deliver gains | Low | Measure before/after metrics; rollback if needed |
| Accessibility changes conflict with dark mode | Low | Test both themes with screen readers |

## Success Criteria

- [ ] All identified bugs are fixed with verified test cases
- [ ] Dead code removed, reducing bundle size by ~10%
- [ ] Background worker persists data correctly across hibernation cycles
- [ ] Popup loads and displays tabs within 200ms for typical workloads (< 50 tabs)
- [ ] All console logs use English with proper log levels
- [ ] Error states display helpful messages to users
- [ ] Keyboard navigation works for all interactive elements
- [ ] Color contrast ratios meet WCAG AA standards (4.5:1 for normal text)

## Implementation Approach

Each capability will be implemented sequentially to minimize risk:

1. **Phase 1** (Low Risk): Code quality standards, dead code removal
2. **Phase 2** (Medium Risk): Bug fixes and stability improvements
3. **Phase 3** (Low Risk): UI/UX enhancements
4. **Phase 4** (Medium Risk): Performance optimizations
5. **Phase 5** (Optional): Architecture refactor if benefits proven

## Open Questions

1. Should we keep the background worker's inactive tracking system, or fully remove it in favor of Chrome's native `lastAccessed`?
2. Should tab search/filter be added in this proposal, or defer to a separate feature proposal?
3. Should we migrate away from `vite-plugin-chrome-extension` to a more maintained build solution?
4. What is the desired behavior for very large tab counts (100+ tabs)? Pagination? Virtualization?

## References

- [Chrome Extension Manifest V3 Lifecycle](https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/)
- [WCAG 2.1 Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Vue 3 Performance Best Practices](https://vuejs.org/guide/best-practices/performance.html)
