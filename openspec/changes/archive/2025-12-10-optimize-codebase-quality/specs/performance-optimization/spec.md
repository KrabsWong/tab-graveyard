# Spec: Performance Optimization

**Capability**: `performance-optimization`  
**Related To**: `bug-fixes-stability` (efficient API usage)

## ADDED Requirements

### Requirement: Tab Fetching Must Be Optimized

The popup calls `chrome.tabs.get()` individually for each tab, creating N+1 API calls.

#### Scenario: Batch Tab Query
**Given** the popup needs to fetch all tabs with detailed information  
**And** currently calls `chrome.tabs.query({})` then `chrome.tabs.get(id)` for each  
**When** optimizing the fetch logic  
**Then** `chrome.tabs.query({})` must return sufficient tab details  
**And** avoid calling `chrome.tabs.get()` individually unless absolutely necessary  
**And** check if `lastAccessed` is already included in query results

#### Scenario: Reduced API Call Count
**Given** the popup displays 20 tabs  
**And** currently makes 1 query + 20 get calls = 21 API calls  
**When** the optimization is applied  
**Then** reduce to a single `chrome.tabs.query({})` call  
**And** verify `lastAccessed` is available without additional calls  
**And** measure performance improvement (target: < 100ms for 50 tabs)

### Requirement: Tab List Rendering Must Be Efficient

Rendering all tabs at once can cause performance issues with 100+ tabs.

#### Scenario: Virtual Scrolling for Large Lists
**Given** the user has more than 50 tabs open  
**When** rendering the tab list  
**Then** implement virtual scrolling to render only visible items  
**And** use a library like `vue-virtual-scroller` or custom implementation  
**And** maintain smooth scrolling at 60fps

#### Scenario: Incremental Rendering
**Given** the user has a very large number of tabs (100+)  
**When** the popup opens  
**Then** render the first 20 tabs immediately  
**And** lazy-load remaining tabs as the user scrolls  
**And** show a loading indicator for tabs being loaded

### Requirement: Time Calculations Must Be Memoized

The `formatTime()` and `getTimeClass()` functions are called on every render.

#### Scenario: Computed Time Values
**Given** tab time data doesn't change while the popup is open (unless updated)  
**When** rendering tab items  
**Then** compute time values once and cache them  
**And** only recalculate when the underlying `lastAccessed` timestamp changes  
**And** use Vue's `computed` or `memo` patterns

#### Scenario: Debounced Time Updates
**Given** time badges update every 30 seconds (from UI spec)  
**When** the update interval fires  
**Then** batch all time recalculations into a single update cycle  
**And** avoid triggering updates if the popup is not visible  
**And** use `requestAnimationFrame` for smooth updates

## MODIFIED Requirements

### Requirement: CSS Assets SHALL Be Optimized

The popup imports `global.css` and `app.css` separately. The build system MUST optimize CSS delivery by bundling or inlining critical styles.

#### Scenario: CSS Consolidation
**Given** `App.vue` imports `../styles/app.css`  
**And** `popup/index.html` imports `../styles/global.css`  
**When** optimizing the build  
**Then** Vite should inline critical CSS or bundle into a single file  
**And** consider merging `global.css` into `app.css` if both are always needed  
**And** measure bundle size impact

#### Scenario: CSS Minification
**Given** CSS files are copied as-is by custom Vite plugins  
**When** building for production  
**Then** ensure CSS is minified and unused rules are removed  
**And** verify Vite's `cssCodeSplit: false` config is working correctly  
**And** check final bundle size in `dist/`

### Requirement: Tab Data SHALL Be Cached

Opening the popup repeatedly fetches all tabs every time. The system MUST implement short-term caching to avoid redundant API calls.

#### Scenario: Short-Term Cache
**Given** the user closes and reopens the popup within 5 seconds  
**And** no tab changes occurred  
**When** the popup opens again  
**Then** use cached tab data instead of refetching  
**And** store cache in a module-level variable with timestamp  
**And** invalidate cache if timestamp exceeds 5 seconds

#### Scenario: Background Sync for Cache
**Given** the background service worker tracks tab events  
**When** tabs are opened, closed, or activated  
**Then** update a cached tab list in `chrome.storage.local`  
**And** the popup can read this pre-computed cache instantly  
**And** fall back to direct query if cache is stale (> 10 seconds)

## ADDED Requirements

### Requirement: Favicon Loading SHALL Be Optimized

Favicons are loaded individually for each tab, potentially blocking rendering. The system MUST implement lazy loading to improve initial render performance.

#### Scenario: Lazy Favicon Loading
**Given** tab items render with favicons  
**When** the popup displays a long tab list  
**Then** use `loading="lazy"` attribute on favicon images  
**And** load favicons only when they enter the viewport  
**And** show a placeholder icon immediately

#### Scenario: Favicon Cache
**Given** the same domain appears multiple times in the tab list  
**And** favicons are loaded from `tab.favIconUrl`  
**When** rendering multiple tabs from the same domain  
**Then** the browser should cache the favicon naturally  
**And** avoid forcing re-downloads by ensuring URLs are consistent

### Requirement: Bundle Size SHALL Be Minimized

The extension bundle includes Vue 3 and potentially unused dependencies. The production build MUST be optimized to minimize total bundle size.

#### Scenario: Production Build Optimization
**Given** the extension is built for production  
**When** running `npm run build`  
**Then** Vite must use production mode with minification  
**And** tree-shaking must remove unused Vue features  
**And** measure final bundle size (target: < 200KB for total extension)

#### Scenario: Dependency Audit
**Given** `package.json` includes dependencies  
**When** reviewing the dependency tree  
**Then** identify and remove any unused dependencies  
**And** consider replacing large libraries with lighter alternatives  
**And** document any unavoidable large dependencies
