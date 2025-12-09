# Tasks: Refresh Project Documentation

This change involves updating a single documentation file with comprehensive project information. All tasks are sequential as they build upon each other to create a cohesive document.

## Task List

### 1. Update Purpose and Goals Section
**Description**: Replace placeholder content with clear description of Tab Graveyard's purpose and user value proposition.

**Actions**:
- Document the core purpose: tab management by tracking last access time
- Explain the problem it solves: identifying inactive tabs to reduce tab overload
- Describe key features: time tracking, visual indicators, quick access

**Validation**:
- Purpose clearly explains what the extension does
- Goals articulate the user benefits
- Features list matches README.md

**Dependencies**: None

---

### 2. Update Tech Stack Section
**Description**: Document all technologies, frameworks, and build tools currently used.

**Actions**:
- List frontend framework: Vue 3 with Composition API
- List build tool: Vite with chrome extension plugin
- Document Chrome Extension Manifest V3
- List key dependencies: @vitejs/plugin-vue, vite-plugin-chrome-extension, fs-extra
- Document native Chrome APIs: i18n, tabs, storage

**Validation**:
- All technologies from package.json are documented
- Version requirements are noted where important (Chrome 88+)
- Architecture approach is clear (SFC, Composition API)

**Dependencies**: Task 1 (context for technology choices)

---

### 3. Update Architecture Patterns Section
**Description**: Document the Chrome Extension architecture and component organization.

**Actions**:
- Document Chrome Extension MV3 architecture (service worker vs background page)
- Explain popup UI architecture (Vue SFC pattern)
- Document file organization structure:
  - `src/background/` - Service worker and tab tracking logic
  - `src/popup/` - Vue UI components and popup logic
  - `src/utils/` - Shared utilities (storage abstraction)
  - `src/styles/` - Global and component styles
  - `src/_locales/` - i18n message files
  - `src/assets/` - Icons and static resources
- Explain storage abstraction pattern
- Document i18n message handling with fallback logic

**Validation**:
- Architecture description matches actual code structure
- Component organization is clear
- Pattern explanations help developers navigate the codebase

**Dependencies**: Task 2 (tech stack understanding)

---

### 4. Update Code Style and Conventions Section
**Description**: Define coding standards, naming conventions, and formatting rules.

**Actions**:
- Document naming conventions:
  - JavaScript: camelCase for variables/functions
  - CSS: kebab-case for classes
  - Files: kebab-case for components, camelCase for utilities
  - i18n keys: camelCase
- Document file organization conventions
- Note absence of linting configuration (potential future improvement)
- Document comment conventions (currently minimal, mostly Chinese)
- Establish code formatting preferences (indentation, quotes, etc.)

**Validation**:
- Conventions reflect actual codebase patterns
- Guidelines are specific enough to ensure consistency
- Areas for improvement are noted

**Dependencies**: Task 3 (architecture and structure)

---

### 5. Update Testing Strategy Section
**Description**: Document current testing approach and identify future testing needs.

**Actions**:
- Document current state: no automated testing infrastructure
- Describe manual testing procedures:
  - Load unpacked extension in Chrome
  - Test popup display and tab listing
  - Verify time tracking accuracy
  - Test dark mode switching
  - Test localization (en, zh_CN)
- Identify future testing improvements:
  - Unit tests for utilities and time formatting
  - Component tests for Vue components
  - E2E tests for extension functionality
  - Consider Vitest for unit testing

**Validation**:
- Current testing approach is documented
- Manual testing procedures are clear
- Future improvements are identified realistically

**Dependencies**: Task 3 (understanding what needs testing)

---

### 6. Update Git Workflow Section
**Description**: Establish version control practices and commit conventions.

**Actions**:
- Document branching strategy (main branch, feature branches)
- Establish commit message conventions:
  - Use clear, descriptive messages
  - Reference OpenSpec changes when applicable
  - Format: `type: description` (e.g., "feat: add feature", "fix: resolve bug")
- Document change proposal process using OpenSpec
- Note code review expectations (if any)

**Validation**:
- Workflow is practical for a solo/small team project
- OpenSpec integration is documented
- Conventions are simple and sustainable

**Dependencies**: None (can be done in parallel with others)

---

### 7. Update Domain Context Section
**Description**: Provide Chrome Extension and tab management domain knowledge.

**Actions**:
- Explain Chrome Extension Manifest V3:
  - Service workers vs background pages
  - Permissions model (tabs, activeTab, tabGroups)
  - Content security policy
- Document Chrome Tabs API concepts:
  - Tab lifecycle and events
  - lastAccessed property
  - Tab activation and querying
- Explain Chrome i18n system:
  - Message file structure
  - Placeholder substitution
  - Locale fallback behavior
- Document Chrome Storage API patterns
- Explain time-based classification logic

**Validation**:
- Domain concepts relevant to the project are explained
- Developers unfamiliar with Chrome extensions can understand
- Links to official Chrome documentation are provided

**Dependencies**: Task 3 (architecture patterns)

---

### 8. Update Important Constraints Section
**Description**: Document technical, privacy, and compatibility constraints.

**Actions**:
- List Manifest V3 requirements and migration considerations
- Document privacy constraints:
  - No external data transmission
  - No tracking or analytics
  - Local-only storage
  - No cookies or persistent identifiers
- Note browser compatibility: Chrome 88+ (Manifest V3 support)
- Document performance constraints:
  - Popup must load quickly
  - Minimal memory footprint
  - Efficient tab querying
- Note offline-first design requirement

**Validation**:
- All constraints affect architectural decisions
- Privacy requirements match README.md privacy policy
- Performance expectations are realistic

**Dependencies**: Task 7 (domain understanding)

---

### 9. Update External Dependencies Section
**Description**: Document Chrome APIs, npm packages, and external integrations.

**Actions**:
- Document Chrome APIs used:
  - `chrome.tabs`: Query, get, update, onActivated
  - `chrome.storage.local`: Persistent data storage
  - `chrome.i18n`: Localization and message handling
  - `chrome.runtime`: Extension lifecycle
- List npm dependencies and their purposes:
  - `vue`: UI framework
  - `vite`: Build tool
  - `@vitejs/plugin-vue`: Vue SFC support
  - `vite-plugin-chrome-extension`: Extension bundling
  - `fs-extra`: Build-time file operations
- Note absence of external web services
- Document that extension is fully self-contained

**Validation**:
- All used APIs are documented
- Dependency purposes are clear
- Self-contained nature is emphasized

**Dependencies**: Task 2 (tech stack)

---

### 10. Review and Validate Documentation
**Description**: Ensure documentation is complete, accurate, and passes OpenSpec validation.

**Actions**:
- Read through entire project.md for clarity and coherence
- Verify all placeholder content has been replaced
- Check for internal consistency between sections
- Run `openspec validate refresh-project-documentation --strict`
- Fix any validation errors
- Verify all spec requirements are satisfied

**Validation**:
- No placeholder text remains
- All sections are complete and accurate
- OpenSpec validation passes without errors
- Documentation serves as useful reference for future work

**Dependencies**: Tasks 1-9 (all previous tasks)

---

## Notes

- This is a documentation-only change with no code modifications
- All tasks contribute to a single file update (openspec/project.md)
- Tasks are ordered to build context progressively
- The documentation should reflect current state accurately while noting future improvements
- Some tasks (especially 1-3) are prerequisites for others and must be done sequentially
