import {
  addEvent,
  applyRules,
  createDemoState,
  createInfoCard,
  createSnapshot,
  createTabMemory,
  defaultBehaviorSignals,
  emptyState,
  ensureSessions,
  getDomain,
  getState,
  isBlacklisted,
  isGhostTab,
  matchesOriginalQuery,
  mergeTab,
  normalizeState,
  recallTabs,
  setState
} from "@/lib/memory";
import type { ContentType, ExtensionRequest, ExtensionResponse, GraveyardState, Importance, ReadingStatus, RecallFilters, SourceType, TabInfoCard, TabMemory } from "@/lib/types";

const UNDO_MS = 5_000;
const activeStartedByTabId = new Map<number, number>();

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const state = await getState();
  if (reason === "install" && state.tabs.length === 0) {
    await setState(addEvent(state, "install"));
  }
  chrome.alarms.create("tab-graveyard-auto-archive", { periodInMinutes: 60 });
  await recordOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("tab-graveyard-auto-archive", { periodInMinutes: 60 });
  void recordOpenTabs();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tab-graveyard-auto-archive") void runAutoArchive();
});

chrome.tabs.onCreated.addListener((tab) => {
  void recordTab(tab);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl || changeInfo.audible != null || changeInfo.pinned != null) {
    void recordTab(tab);
  }
  if (changeInfo.status === "complete") {
    void maybeResurface(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    await flushActiveTime();
    const tab = await chrome.tabs.get(tabId);
    activeStartedByTabId.set(tabId, Date.now());
    await recordTab(tab, { activated: true });
  } catch {
    // Tab disappeared before it could be recorded.
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void markClosed(tabId);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-graveyard") void openDashboard();
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const state = await getState();
  const results = recallTabs(state.tabs, text, { archivedOnly: true }).slice(0, 5);
  suggest(
    results.map((tab) => ({
      content: tab.id,
      description: `${escapeOmnibox(tab.title)} - ${escapeOmnibox(tab.card.summary)}`
    }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const state = await getState();
  const direct = state.tabs.find((tab) => tab.id === text);
  const result = direct ?? recallTabs(state.tabs, text, { archivedOnly: true })[0];
  if (result) {
    await restoreTab(result.id);
  } else {
    await openDashboard();
  }
});

chrome.runtime.onMessage.addListener((request: ExtensionRequest, _sender, sendResponse) => {
  void handleMessage(request)
    .then((data) => sendResponse({ ok: true, data } satisfies ExtensionResponse))
    .catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) } satisfies ExtensionResponse));
  return true;
});

async function handleMessage(request: ExtensionRequest) {
  switch (request.type) {
    case "getSnapshot":
      await recordOpenTabs();
      return createSnapshot(await getState());
    case "archiveGhosts":
      return archiveGhosts();
    case "previewArchive":
      return previewArchive();
    case "confirmArchivePreview":
      return confirmArchivePreview(request.previewId);
    case "undoArchive":
      return undoArchive();
    case "restoreTab":
      await restoreTab(request.tabId, request.inWindow);
      return createSnapshot(await getState());
    case "restoreSession":
      await restoreSession(request.sessionId);
      return createSnapshot(await getState());
    case "deleteTab":
      return mutate((state) => addEvent({ ...state, tabs: state.tabs.filter((tab) => tab.id !== request.tabId) }, "tab_deleted"));
    case "updateTabCard":
      return updateTabCard(request.tabId, request.card, request.saveRule);
    case "renameSession":
      return renameSession(request.sessionId, request.name);
    case "splitSession":
      return splitSession(request.sessionId, request.tabIds);
    case "mergeSessions":
      return mergeSessions(request.sessionIds, request.name);
    case "contentSignal":
      return recordContentSignal(request.tabId, request.url, request.signal);
    case "resurfaceAction":
      return recordResurfaceAction(request.tabIds, request.action);
    case "copyUrlTrigger":
      return recordCopiedUrl(request.url);
    case "recall":
      return recallWithDeepSeek(request.query, request.filters);
    case "saveSettings":
      return mutate((state) =>
        addEvent(
          {
            ...state,
            settings: {
              ...state.settings,
              ...request.settings,
              deepSeek: { ...state.settings.deepSeek, ...(request.settings.deepSeek ?? {}) },
              resurfaceRule: { ...state.settings.resurfaceRule, ...(request.settings.resurfaceRule ?? {}) }
            }
          },
          "settings_saved"
        )
      );
    case "exportData":
      return getState();
    case "importData":
      return mutate(() => addEvent(normalizeState(request.state), "data_imported"));
    case "clearData":
      return mutate(() => addEvent(emptyState(), "data_deleted"));
    case "seedDemo":
      return mutate(() => addEvent(createDemoState(), "demo_workspace_seeded"));
    case "importHistory":
      return importHistory();
    case "testDeepSeek":
      return testDeepSeek();
    case "enhanceWithDeepSeek":
      return enhanceWithDeepSeek();
    case "openDashboard":
      await openDashboard();
      return undefined;
  }
}

async function mutate(updater: (state: GraveyardState) => GraveyardState) {
  const next = ensureSessions(updater(await getState()));
  await setState(next);
  return createSnapshot(next);
}

async function recordOpenTabs() {
  const tabs = await chrome.tabs.query({});
  let state = await getState();
  for (const tab of tabs) {
    const memory = buildMemoryFromTab(tab, state);
    if (memory) state = mergeTab(state, memory);
  }
  await setState(state);
}

async function flushActiveTime() {
  const now = Date.now();
  const tabs = await chrome.tabs.query({ active: true });
  let state = await getState();
  let changed = false;
  for (const tab of tabs) {
    if (!tab.id) continue;
    const started = activeStartedByTabId.get(tab.id);
    if (!started) continue;
    const delta = Math.max(0, now - started);
    activeStartedByTabId.set(tab.id, now);
    state = {
      ...state,
      tabs: state.tabs.map((item) =>
        item.tabId === tab.id && !item.archived
          ? { ...item, signals: { ...item.signals, activeMs: item.signals.activeMs + delta } }
          : item
      )
    };
    changed = true;
  }
  if (changed) await setState(state);
}

async function recordTab(tab: chrome.tabs.Tab, options: { activated?: boolean } = {}) {
  const state = await getState();
  if (state.settings.recordingPaused || !tab.url || tab.incognito) return;
  if (isBlacklisted(getDomain(tab.url), state.settings.blacklistDomains)) return;
  const existing = findExistingTab(state, tab);
  const memory = buildMemoryFromTab(tab, state, options.activated ? Date.now() : undefined, existing);
  if (!memory) return;
  await setState(addEvent(mergeTab(state, memory), options.activated ? "tab_activated" : "tab_recorded", tabEventMeta(memory)));
}

function buildMemoryFromTab(tab: chrome.tabs.Tab, state: GraveyardState, activatedAt?: number, existing = findExistingTab(state, tab)) {
  const memory = createTabMemory(tab, existing);
  if (!memory) return undefined;
  const next = {
    ...memory,
    lastActivatedAt: activatedAt ?? existing?.lastActivatedAt ?? memory.lastActivatedAt,
    archived: false,
    archivedAt: undefined,
    signals: {
      ...memory.signals,
      activationCount: memory.signals.activationCount + (activatedAt ? 1 : 0)
    }
  };
  return applyRules(next, state.rules);
}

function findExistingTab(state: GraveyardState, tab: chrome.tabs.Tab) {
  return state.tabs.find((item) => item.tabId === tab.id && !item.archived) ?? state.tabs.find((item) => item.url === tab.url && !item.archived);
}

async function archiveGhosts(allowedIds?: Set<string>) {
  const state = await getState();
  const now = Date.now();
  const ghostTabs = state.tabs.filter((tab) => isGhostTab(tab, state.settings, now) && (!allowedIds || allowedIds.has(tab.id)));
  const ids = new Set(ghostTabs.map((tab) => tab.id));
  const tabIdsToClose = ghostTabs.map((tab) => tab.tabId).filter((id): id is number => typeof id === "number");
  const archivedTabs = ghostTabs.map((tab) => ({ ...tab, archived: true, archivedAt: now, tabId: undefined }));
  const next = addEvent(
    ensureSessions({
      ...state,
      tabs: state.tabs.map((tab) => (ids.has(tab.id) ? { ...tab, archived: true, archivedAt: now, tabId: undefined } : tab)),
      archivePreview: undefined,
      lastUndo: { id: `undo-${now}`, expiresAt: now + UNDO_MS, tabs: archivedTabs }
    }),
    "archive_confirm",
    {
      count: archivedTabs.length,
      urls: archivedTabs.slice(0, 5).map((tab) => tab.url).join(" | "),
      titles: archivedTabs.slice(0, 5).map((tab) => tab.title).join(" | ")
    }
  );
  await setState(next);
  for (const tabId of tabIdsToClose) {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      // The browser tab may already be gone; the memory should still be archived.
    }
  }
  return createSnapshot(next);
}

async function runAutoArchive() {
  const state = await getState();
  if (state.settings.archiveTrustStage !== "auto") return;
  if (state.settings.archivePreannounce) {
    await previewArchive();
    return;
  }
  await archiveGhosts();
}

async function markClosed(tabId: number) {
  const state = await getState();
  const now = Date.now();
  const closed = state.tabs.find((tab) => tab.tabId === tabId && !tab.archived);
  const next = addEvent(
    {
      ...state,
      tabs: state.tabs.map((tab) => {
        if (tab.tabId !== tabId || tab.archived) return tab;
        return {
          ...tab,
          tabId: undefined,
          signals: {
            ...tab.signals,
            closeWithin10s: now - tab.openedAt <= 10_000
          }
        };
      })
    },
    "tab_closed",
    closed ? tabEventMeta(closed) : { tabId }
  );
  activeStartedByTabId.delete(tabId);
  await setState(next);
}

async function previewArchive() {
  const state = await getState();
  const now = Date.now();
  const ghostTabs = state.tabs.filter((tab) => isGhostTab(tab, state.settings, now));
  const preview = {
    id: `preview-${now}`,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
    tabIds: ghostTabs.map((tab) => tab.id)
  };
  const next = addEvent({ ...state, archivePreview: preview }, "archive_preview_created", { count: ghostTabs.length });
  await setState(next);
  return createSnapshot(next);
}

async function confirmArchivePreview(previewId: string) {
  const state = await getState();
  if (!state.archivePreview || state.archivePreview.id !== previewId || state.archivePreview.expiresAt < Date.now()) {
    throw new Error("Archive preview expired.");
  }
  return archiveGhosts(new Set(state.archivePreview.tabIds));
}

async function updateTabCard(tabId: string, cardPatch: Partial<TabInfoCard>, saveRule = false) {
  const state = await getState();
  const now = Date.now();
  const tab = state.tabs.find((item) => item.id === tabId);
  if (!tab) throw new Error("Tab not found.");
  const nextTabs = state.tabs.map((item) =>
    item.id === tabId
      ? {
          ...item,
          card: {
            ...item.card,
            ...cardPatch,
            topics: cardPatch.topics ?? item.card.topics,
            entities: cardPatch.entities ?? item.card.entities,
            possibleQueries: cardPatch.possibleQueries ?? item.card.possibleQueries,
            bilingualTopics: cardPatch.bilingualTopics ?? item.card.bilingualTopics,
            customTags: cardPatch.customTags ?? item.card.customTags,
            userEdited: true,
            userEditedAt: now
          }
        }
      : item
  );
  const rules = saveRule
    ? [
        ...state.rules,
        {
          id: `rule-${now}`,
          scope: "domain" as const,
          value: tab.domain,
          patch: {
            importance: cardPatch.importance,
            readingStatus: cardPatch.readingStatus,
            contentType: cardPatch.contentType,
            source: cardPatch.source,
            topics: cardPatch.topics,
            customTags: cardPatch.customTags
          },
          createdAt: now,
          updatedAt: now
        }
      ]
    : state.rules;
  return mutate(() => addEvent({ ...state, tabs: nextTabs, rules }, "info_card_updated", { saveRule }));
}

async function renameSession(sessionId: string, name: string) {
  return mutate((state) =>
    addEvent(
      {
        ...state,
        sessions: state.sessions.map((session) => (session.id === sessionId ? { ...session, name: name.trim().slice(0, 80), userNamed: true } : session))
      },
      "session_renamed"
    )
  );
}

async function splitSession(sessionId: string, tabIds: string[]) {
  const now = Date.now();
  const newSessionId = `session-split-${now}`;
  const selected = new Set(tabIds);
  return mutate((state) =>
    addEvent(
      {
        ...state,
        tabs: state.tabs.map((tab) => (tab.sessionId === sessionId && selected.has(tab.id) ? { ...tab, sessionId: newSessionId } : tab))
      },
      "session_split",
      { count: selected.size }
    )
  );
}

async function mergeSessions(sessionIds: string[], name?: string) {
  const target = sessionIds[0];
  if (!target) throw new Error("Select at least one session.");
  const set = new Set(sessionIds);
  return mutate((state) =>
    addEvent(
      {
        ...state,
        tabs: state.tabs.map((tab) => (set.has(tab.sessionId) ? { ...tab, sessionId: target } : tab)),
        sessions: state.sessions.map((session) => (session.id === target && name ? { ...session, name, userNamed: true } : session))
      },
      "session_merged",
      { count: sessionIds.length }
    )
  );
}

async function undoArchive() {
  const state = await getState();
  const undo = state.lastUndo;
  if (!undo || undo.expiresAt < Date.now()) return createSnapshot(state);

  const restoredById = new Map<string, TabMemory>();
  for (const tab of undo.tabs) {
    const created = await chrome.tabs.create({
      url: tab.url,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned,
      active: false
    });
    restoredById.set(tab.id, {
      ...tab,
      archived: false,
      archivedAt: undefined,
      restored: true,
      restoredAt: Date.now(),
      tabId: created.id,
      windowId: created.windowId,
      index: created.index
    });
  }

  const next = addEvent(
    {
      ...state,
      tabs: state.tabs.map((tab) => restoredById.get(tab.id) ?? tab),
      lastUndo: undefined
    },
    "archive_undo",
    { count: restoredById.size }
  );
  await setState(ensureSessions(next));
  return createSnapshot(next);
}

async function restoreTab(tabId: string, inWindow = false) {
  const state = await getState();
  const tab = state.tabs.find((item) => item.id === tabId);
  if (!tab) return;
  const now = Date.now();
  let created: chrome.tabs.Tab | chrome.windows.Window;
  if (!inWindow && typeof tab.tabId === "number") {
    try {
      const existing = await chrome.tabs.update(tab.tabId, { active: true });
      if (existing.windowId != null) await chrome.windows.update(existing.windowId, { focused: true });
      created = existing;
    } catch {
      created = await chrome.tabs.create({ url: tab.url, active: true });
    }
  } else {
    created = inWindow ? await chrome.windows.create({ url: tab.url, focused: true }) : await chrome.tabs.create({ url: tab.url, active: true });
  }
  const chromeTab = isChromeWindow(created) ? created.tabs?.[0] : created;
  const next = addEvent(
    {
      ...state,
      tabs: state.tabs.map((item) =>
        item.id === tabId
          ? {
              ...item,
              archived: false,
              archivedAt: undefined,
              restored: true,
              restoredAt: now,
              lastActivatedAt: now,
              tabId: chromeTab?.id,
              windowId: chromeTab?.windowId,
              signals: { ...item.signals, restoreClicks: item.signals.restoreClicks + 1 }
            }
          : item
      )
    },
    "result_opened",
    tabEventMeta(tab)
  );
  await setState(ensureSessions(next));
}

async function recordContentSignal(tabId: number | undefined, url: string, signal: Partial<TabMemory["signals"]>) {
  const state = await getState();
  const now = Date.now();
  const domain = getDomain(url);
  const next = addEvent(
    {
      ...state,
      tabs: state.tabs.map((tab) => {
        if (!((tabId && tab.tabId === tabId) || (!tab.archived && tab.url === url))) return tab;
        return {
          ...tab,
          lastActivatedAt: now,
          signals: {
            ...tab.signals,
            activeMs: tab.signals.activeMs + Math.max(0, signal.activeMs ?? 0),
            maxScrollPercent: Math.max(tab.signals.maxScrollPercent, signal.maxScrollPercent ?? 0),
            copiedTextCount: tab.signals.copiedTextCount + Math.max(0, signal.copiedTextCount ?? 0),
            lastCopiedAt: signal.copiedTextCount ? now : tab.signals.lastCopiedAt,
            referrerUrl: signal.referrerUrl ?? tab.signals.referrerUrl
          }
        };
      })
    },
    "content_signal",
    { domain, url }
  );
  await setState(next);
  return createSnapshot(next);
}

async function recordResurfaceAction(tabIds: string[], action: "shown" | "dismissed" | "opened") {
  const field = action === "shown" ? "resurfaceShown" : action === "dismissed" ? "resurfaceDismissed" : "resurfaceOpened";
  const ids = new Set(tabIds);
  return mutate((state) =>
    addEvent(
      {
        ...state,
        tabs: state.tabs.map((tab) => (ids.has(tab.id) ? { ...tab, signals: { ...tab.signals, [field]: tab.signals[field] + 1 } } : tab))
      },
      `resurface_${action}`,
      { count: ids.size }
    )
  );
}

async function recordCopiedUrl(url: string) {
  const state = await getState();
  const domain = getDomain(url);
  const related = state.tabs.filter((tab) => tab.archived && tab.domain === domain).slice(0, 4);
  const next = addEvent(state, "url_copied", { domain, url, related: related.length });
  await setState(next);
  if (related.length) await openDashboard();
  return createSnapshot(next);
}

async function restoreSession(sessionId: string) {
  const state = await getState();
  const tabs = state.tabs.filter((tab) => tab.sessionId === sessionId);
  if (!tabs.length) return;
  const win = await chrome.windows.create({ url: tabs.map((tab) => tab.url), focused: true });
  const createdTabs = win.tabs ?? [];
  const restoredIds = new Set(tabs.map((tab) => tab.id));
  const next = addEvent(
    {
      ...state,
      tabs: state.tabs.map((tab) => {
        if (!restoredIds.has(tab.id)) return tab;
        const created = createdTabs.find((item) => item.url === tab.url);
        return {
          ...tab,
          archived: false,
          archivedAt: undefined,
          restored: true,
          restoredAt: Date.now(),
          tabId: created?.id,
          windowId: created?.windowId
        };
      })
    },
    "session_restored",
    {
      count: tabs.length,
      urls: tabs.slice(0, 8).map((tab) => tab.url).join(" | "),
      titles: tabs.slice(0, 8).map((tab) => tab.title).join(" | ")
    }
  );
  await setState(ensureSessions(next));
}

async function importHistory() {
  const now = Date.now();
  const historyItems = await chrome.history.search({
    text: "",
    startTime: now - 30 * 24 * 60 * 60 * 1000,
    maxResults: 300
  });
  let state = await getState();
  for (const item of historyItems) {
    if (!item.url || isBlacklisted(getDomain(item.url), state.settings.blacklistDomains)) continue;
    const title = item.title || getDomain(item.url);
    const openedAt = item.lastVisitTime ?? now;
    const memory: TabMemory = {
      id: `history-${openedAt}-${Math.random().toString(36).slice(2, 8)}`,
      url: item.url,
      title,
      domain: getDomain(item.url),
      openedAt,
      lastActivatedAt: openedAt,
      pinned: false,
      audible: false,
      archived: true,
      archivedAt: openedAt,
      restored: false,
      sessionId: `history-${Math.floor(openedAt / (24 * 60 * 60 * 1000))}`,
      card: createInfoCard(title, item.url),
      signals: defaultBehaviorSignals()
    };
    if (!state.tabs.some((tab) => tab.url === memory.url)) {
      state = { ...state, tabs: [memory, ...state.tabs] };
    }
  }
  state = addEvent(ensureSessions(state), "history_imported", { count: historyItems.length });
  await setState(state);
  return createSnapshot(state);
}

async function maybeResurface(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url) return;
  const url = tab.url;
  const state = await getState();
  if (!state.settings.resurfaceEnabled || state.settings.recordingPaused) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shownToday = state.events.filter((event) => event.type === "resurface_shown" && event.createdAt >= today.getTime()).length;
  const lastShown = [...state.events].reverse().find((event) => event.type === "resurface_shown");
  if (shownToday >= state.settings.resurfaceRule.maxPerDay) return;
  if (lastShown && Date.now() - lastShown.createdAt < state.settings.resurfaceRule.cooldownHours * 60 * 60 * 1000) return;
  const current = createInfoCard(tab.title || getDomain(url), url);
  const related = state.tabs
    .filter((item) => item.archived && item.url !== url)
    .map((item) => ({
      item,
      overlap: item.card.topics.filter((topic) => current.topics.includes(topic)).length + (item.domain === getDomain(url) ? 2 : 0)
    }))
    .filter(({ overlap }) => overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 4)
    .map(({ item }) => item);
  if (!related.length) return;
  try {
    await sendResurfaceMessage(tab.id, related);
    await recordResurfaceAction(related.map((item) => item.id), "shown");
  } catch {
    // Some pages cannot receive content-script messages.
  }
}

async function sendResurfaceMessage(tabId: number, tabs: TabMemory[]) {
  const message = {
    type: "TAB_GRAVEYARD_RESURFACE",
    tabs: tabs.map((item) => ({ id: item.id, title: item.title, domain: item.domain }))
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch (error) {
      lastError = error;
      await delay(350);
    }
  }
  throw lastError;
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

async function openDashboard() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html"), active: true });
}

async function testDeepSeek() {
  const state = await getState();
  assertDeepSeekConfigured(state);
  const payload = await deepSeekChat(state, [
    { role: "system", content: "You are a concise API connectivity test responder." },
    { role: "user", content: "Reply with: Tab Graveyard DeepSeek OK" }
  ], 32);

  await setState(addEvent(state, "deepseek_test_success", { model: state.settings.deepSeek.model.trim() }));
  return {
    model: payload.model ?? state.settings.deepSeek.model.trim(),
    content: payload?.choices?.[0]?.message?.content?.trim() ?? ""
  };
}

async function recallWithDeepSeek(query: string, filters?: RecallFilters) {
  const state = await getState();
  if (!query.trim() || !canUseDeepSeek(state)) {
    return recallTabs(state.tabs, query, filters);
  }

  try {
    const expansion = await expandRecallQuery(state, query);
    const expandedQuery = [query, ...expansion.terms, ...expansion.bilingualTerms].join(" ");
    return recallTabs(state.tabs, expandedQuery, {
      ...filters,
      source: filters?.source && filters.source !== "all" ? filters.source : expansion.source ?? filters?.source,
      contentType: filters?.contentType && filters.contentType !== "all" ? filters.contentType : expansion.contentType ?? filters?.contentType
    }).filter((result) => matchesOriginalQuery(result, query));
  } catch {
    return recallTabs(state.tabs, query, filters);
  }
}

async function enhanceWithDeepSeek() {
  let state = await getState();
  assertDeepSeekConfigured(state);
  if (!canUseDeepSeek(state)) throw new Error("DeepSeek is disabled by AI mode or strict privacy mode.");

  let enhancedTabs = 0;
  const tabs = [...state.tabs];
  for (let index = 0; index < tabs.length; index += 1) {
    if (enhancedTabs >= 20) break;
    const tab = tabs[index];
    if (tab.card.aiEnhanced) continue;
    try {
      tabs[index] = { ...tab, card: await enhanceInfoCard(state, tab) };
      enhancedTabs += 1;
    } catch {
      // Keep local cards when the provider fails on one item.
    }
  }

  state = ensureSessions({ ...state, tabs });
  let renamedSessions = 0;
  const sessions = [...state.sessions];
  for (let index = 0; index < sessions.length; index += 1) {
    if (renamedSessions >= 10) break;
    const session = sessions[index];
    if (session.aiNamed) continue;
    const sessionTabs = state.tabs.filter((tab) => session.tabIds.includes(tab.id)).slice(0, 12);
    if (sessionTabs.length < 2) continue;
    try {
      const name = await suggestSessionName(state, sessionTabs);
      if (name) {
        sessions[index] = { ...session, name, aiNamed: true, aiNamedAt: Date.now() };
        renamedSessions += 1;
      }
    } catch {
      // Keep rule-based names when provider naming fails.
    }
  }

  state = addEvent({ ...state, sessions }, "deepseek_enhance_complete", { enhancedTabs, renamedSessions });
  await setState(state);
  return { enhancedTabs, renamedSessions };
}

async function expandRecallQuery(state: GraveyardState, query: string) {
  const payload = await deepSeekJson<DeepSeekQueryExpansion>(
    state,
    "You expand browser-memory recall queries. Return compact JSON only.",
    `User query: ${query}

Return JSON:
{
  "terms": ["short English or URL terms"],
  "bilingualTerms": ["Chinese/English equivalents"],
  "contentType": "article|video|pdf|tweet|repo|doc|image|saas|null",
  "source": "twitter|slack|email|search|direct|bookmark|null"
}
Do not invent private data. Use null when uncertain.`,
    240
  );
  return {
    terms: cleanStringArray(payload.terms).slice(0, 10),
    bilingualTerms: cleanStringArray(payload.bilingualTerms).slice(0, 10),
    contentType: isContentType(payload.contentType) ? payload.contentType : undefined,
    source: isSourceType(payload.source) ? payload.source : undefined
  };
}

async function enhanceInfoCard(state: GraveyardState, tab: TabMemory): Promise<TabInfoCard> {
  const payload = await deepSeekJson<DeepSeekInfoCard>(
    state,
    "You create privacy-preserving browser tab memory cards. Return compact JSON only.",
    `Only use this local metadata:
Title: ${tab.title}
URL: ${tab.url}
Domain: ${tab.domain}
Current local summary: ${tab.card.summary}

Return JSON:
{
  "summary": "one concise human-readable summary",
  "topics": ["topic"],
  "entities": ["person/product/company"],
  "contentType": "article|video|pdf|tweet|repo|doc|image|saas",
  "readingStatus": "fully-read|skimmed|bounced",
  "importance": "must|should|maybe|safe",
  "possibleQueries": ["how a user might search for it"],
  "bilingualTopics": ["Chinese/English topic equivalents"]
}`,
    500
  );

  return {
    ...tab.card,
    summary: stringOr(payload.summary, tab.card.summary).slice(0, 140),
    topics: cleanStringArray(payload.topics).slice(0, 5).length ? cleanStringArray(payload.topics).slice(0, 5) : tab.card.topics,
    entities: cleanStringArray(payload.entities).slice(0, 6).length ? cleanStringArray(payload.entities).slice(0, 6) : tab.card.entities,
    contentType: isContentType(payload.contentType) ? payload.contentType : tab.card.contentType,
    readingStatus: isReadingStatus(payload.readingStatus) ? payload.readingStatus : tab.card.readingStatus,
    importance: isImportance(payload.importance) ? payload.importance : tab.card.importance,
    possibleQueries: cleanStringArray(payload.possibleQueries).slice(0, 10).length ? cleanStringArray(payload.possibleQueries).slice(0, 10) : tab.card.possibleQueries,
    bilingualTopics: cleanStringArray(payload.bilingualTopics).slice(0, 10).length ? cleanStringArray(payload.bilingualTopics).slice(0, 10) : tab.card.bilingualTopics,
    aiEnhanced: true,
    aiEnhancedAt: Date.now()
  };
}

async function suggestSessionName(state: GraveyardState, tabs: TabMemory[]) {
  const items = tabs.map((tab) => `- ${tab.card.summary} | ${tab.domain} | ${tab.card.topics.join(", ")}`).join("\n");
  const payload = await deepSeekJson<{ name?: string }>(
    state,
    "You name browser research sessions. Return compact JSON only.",
    `Name this group in 3 to 6 words. Prefer English when pages are English, Chinese when pages are Chinese.
Tabs:
${items}

Return JSON: { "name": "short session name" }`,
    120
  );
  return stringOr(payload.name, "").replace(/[{}[\]"]/g, "").trim().slice(0, 80);
}

async function deepSeekJson<T>(state: GraveyardState, system: string, user: string, maxTokens: number): Promise<T> {
  const payload = await deepSeekChat(state, [
    { role: "system", content: `${system} No markdown fences.` },
    { role: "user", content: user }
  ], maxTokens);
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(extractJson(content)) as T;
}

async function deepSeekChat(state: GraveyardState, messages: DeepSeekMessage[], maxTokens: number) {
  const { apiKey, baseUrl, model } = state.settings.deepSeek;
  assertDeepSeekConfigured(state);
  const response = await fetch(toChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model: model.trim(),
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
      stream: false
    })
  });

  const payload = await response.json().catch(() => undefined) as DeepSeekChatResponse | undefined;
  if (!response.ok) {
    const message = payload?.error?.message ?? `DeepSeek request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!payload) throw new Error("DeepSeek returned an empty response.");
  return payload;
}

function canUseDeepSeek(state: GraveyardState) {
  const settings = state.settings;
  return settings.deepSeek.enabled && settings.aiMode !== "local-only" && !settings.strictPrivacy && Boolean(settings.deepSeek.apiKey.trim());
}

function assertDeepSeekConfigured(state: GraveyardState) {
  const { apiKey, model } = state.settings.deepSeek;
  if (!apiKey.trim()) throw new Error("DeepSeek API Key is required.");
  if (!model.trim()) throw new Error("DeepSeek model is required.");
}

function toChatCompletionsUrl(baseUrl: string) {
  const normalized = (baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function extractJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && ["article", "video", "pdf", "tweet", "repo", "doc", "image", "saas"].includes(value);
}

function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && ["twitter", "slack", "email", "search", "direct", "bookmark"].includes(value);
}

function isReadingStatus(value: unknown): value is ReadingStatus {
  return typeof value === "string" && ["fully-read", "skimmed", "bounced"].includes(value);
}

function isImportance(value: unknown): value is Importance {
  return typeof value === "string" && ["must", "should", "maybe", "safe"].includes(value);
}

function escapeOmnibox(value: string) {
  return value.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char] ?? char);
}

function isChromeWindow(value: chrome.tabs.Tab | chrome.windows.Window): value is chrome.windows.Window {
  return "tabs" in value;
}

function tabEventMeta(tab: TabMemory) {
  return {
    tabId: tab.tabId ?? "",
    title: tab.title.slice(0, 160),
    url: tab.url,
    domain: tab.domain
  };
}

type DeepSeekChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekQueryExpansion = {
  terms?: unknown;
  bilingualTerms?: unknown;
  contentType?: unknown;
  source?: unknown;
};

type DeepSeekInfoCard = {
  summary?: unknown;
  topics?: unknown;
  entities?: unknown;
  contentType?: unknown;
  readingStatus?: unknown;
  importance?: unknown;
  possibleQueries?: unknown;
  bilingualTopics?: unknown;
};
