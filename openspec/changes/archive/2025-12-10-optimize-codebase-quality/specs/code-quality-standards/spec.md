# Spec: Code Quality Standards

**Capability**: `code-quality-standards`  
**Related To**: General maintainability

## ADDED Requirements

### Requirement: All Code Comments Must Be in English

The codebase contains mixed Chinese and English comments, reducing accessibility for international contributors.

#### Scenario: Comment Translation
**Given** comments in `background.js` lines 6-21 are in Chinese  
**And** variable names use Chinese descriptions in `browserInfo` object  
**When** standardizing code quality  
**Then** all comments must be translated to English  
**And** maintain technical accuracy and clarity

#### Scenario: Future Comment Standards
**Given** new code is added to the project  
**When** code reviews are performed  
**Then** comments must be validated to be in English  
**And** follow JSDoc format for functions and modules

### Requirement: Console Logging Must Use English and Proper Log Levels

Current console.log statements use Chinese text and lack proper log levels.

#### Scenario: Standardized Logging
**Given** `console.log('系统信息:', ...)` in background.js line 6  
**And** `console.log('浏览器信息:', ...)` in background.js line 21  
**When** standardizing logging  
**Then** messages must be in English: `console.log('Platform info:', ...)`  
**And** use appropriate log levels (`console.info`, `console.warn`, `console.error`)

#### Scenario: Production-Ready Logging
**Given** the extension runs in production  
**When** users open developer tools  
**Then** console logs should provide useful debugging info  
**And** avoid excessive logging in normal operation  
**And** clearly distinguish between info/warning/error severity

### Requirement: Functions Must Have JSDoc Documentation

No functions in the codebase have type annotations or documentation comments.

#### Scenario: Core Function Documentation
**Given** functions like `formatTime()`, `getTimeClass()`, `activateTab()`  
**When** improving code quality  
**Then** each function must have JSDoc comments describing:
- Purpose and behavior
- Parameter types and descriptions
- Return value type and description
- Example usage (for complex functions)

#### Scenario: JSDoc Example Format
**Given** the `formatTime` function in App.vue:99  
**When** adding documentation  
**Then** it must include JSDoc like:
```javascript
/**
 * Formats a timestamp into a human-readable relative time string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Localized relative time (e.g., "5 mins ago", "2 hrs ago")
 */
```

### Requirement: Storage Utility Functions Must Validate Inputs

The `storage.js` module does not validate inputs, allowing invalid data to be stored.

#### Scenario: Type Validation for Threshold
**Given** `setInactiveThreshold(seconds)` accepts any parameter  
**When** called with non-numeric or negative values  
**Then** it must validate that `seconds` is a positive number  
**And** throw a descriptive error or return false for invalid inputs

#### Scenario: Safe Defaults for Missing Data
**Given** `getInactiveTabsData()` returns stored data  
**When** the data is corrupted or has unexpected structure  
**Then** it must validate the data structure before returning  
**And** return an empty object `{}` if validation fails  
**And** log a warning about data corruption

## ADDED Requirements

### Requirement: CSS Color Values SHALL Use Design Token Variables

Color values are hardcoded throughout `app.css`, making theme adjustments difficult. The system MUST use CSS custom properties (design tokens) for all color values.

#### Scenario: CSS Custom Properties for Colors
**Given** colors like `#2c3e50`, `#67c23a`, `#e6a23c` are hardcoded  
**When** implementing design tokens  
**Then** create CSS custom properties in `:root`:
```css
:root {
  --color-primary: #2c3e50;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;
  --color-purple: #800080;
}
```
**And** replace hardcoded values with `var(--color-primary)`

#### Scenario: Dark Mode Token Overrides
**Given** dark mode uses different colors  
**When** defining dark mode styles  
**Then** override design tokens in `@media (prefers-color-scheme: dark)`:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #ffffff;
    --color-success: #95d475;
    /* ... */
  }
}
```
**And** avoid duplicating color values in dark mode selectors

### Requirement: Build Configuration SHALL Document Custom Plugin Usage

The `vite.config.js` uses custom Vite plugins without documentation. The build configuration MUST include clear comments explaining each plugin's purpose and necessity.

#### Scenario: Plugin Documentation Comments
**Given** custom plugins `copyLocales()`, `copyStyles()`, `copyAssets()`  
**When** reviewing the build config  
**Then** each plugin must have a JSDoc comment explaining:
- What files it copies
- When it runs (build hook)
- Why it's needed (Vite doesn't copy these by default)

#### Scenario: Deprecated Plugin Warning
**Given** `vite-plugin-chrome-extension@0.0.7` is used  
**And** the package is unmaintained (last updated 2021)  
**When** documenting the build setup  
**Then** add a comment noting the plugin is deprecated  
**And** recommend investigating alternatives like `@crxjs/vite-plugin` or `rollup-plugin-chrome-extension`  
**And** link to migration guide if available
