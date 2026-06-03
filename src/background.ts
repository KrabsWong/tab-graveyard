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
  getVisibleTabs,
  isBlacklisted,
  isGhostTab,
  isVisibleTab,
  mergeTab,
  normalizeState,
  recallTabs,
  setState
} from "@/lib/memory";
import type { ContentType, ExtensionRequest, ExtensionResponse, GraveyardState, Importance, ReadingStatus, RecallCue, RecallFilters, RecallResult, RecallSynthesisResult, SourceType, TabInfoCard, TabMemory } from "@/lib/types";

const UNDO_MS = 5_000;
const activeStartedByTabId = new Map<number, number>();

function logResurface(stage: string, details?: Record<string, unknown>) {
  console.info("[Tab Graveyard][resurface]", stage, details ?? {});
}

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
  const results = recallTabs(getVisibleTabs(state.tabs, state.settings), text, { archivedOnly: true }).slice(0, 5);
  suggest(
    results.map((tab) => ({
      content: tab.id,
      description: `${escapeOmnibox(tab.title)} - ${escapeOmnibox(tab.card.summary)}`
    }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const state = await getState();
  const tabs = getVisibleTabs(state.tabs, state.settings);
  const direct = tabs.find((tab) => tab.id === text);
  const result = direct ?? recallTabs(tabs, text, { archivedOnly: true })[0];
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
    case "cancelArchivePreview":
      return cancelArchivePreview();
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
    case "summarizeRecall":
      return summarizeRecallWithDeepSeek(request.query, request.tabIds, request.sessionId);
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
    case "openUrl":
      await chrome.tabs.create({ url: request.url, active: true });
      return undefined;
    case "openMemoryTab":
      await restoreTab(request.tabId);
      return undefined;
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
  if (state.settings.recordingPaused) return;
  for (const tab of tabs) {
    if (!tab.url || tab.incognito || isBlacklisted(getDomain(tab.url), state.settings.blacklistDomains)) continue;
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
        item.tabId === tab.id && !item.archived && isVisibleTab(item, state.settings)
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

async function cancelArchivePreview() {
  const state = await getState();
  const next = state.archivePreview
    ? addEvent({ ...state, archivePreview: undefined }, "archive_preview_cancel", { count: state.archivePreview.tabIds.length })
    : state;
  await setState(next);
  return createSnapshot(next);
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
  if (!isVisibleTab(tab, state.settings)) return;
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
  if (isBlacklisted(domain, state.settings.blacklistDomains)) return createSnapshot(state);
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
  if (isBlacklisted(domain, state.settings.blacklistDomains)) return createSnapshot(state);
  const related = getVisibleTabs(state.tabs, state.settings).filter((tab) => tab.archived && tab.domain === domain).slice(0, 4);
  const next = addEvent(state, "url_copied", { domain, url, related: related.length });
  await setState(next);
  if (related.length) await openDashboard();
  return createSnapshot(next);
}

async function restoreSession(sessionId: string) {
  const state = await getState();
  const tabs = getVisibleTabs(state.tabs, state.settings).filter((tab) => tab.sessionId === sessionId);
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
  if (!tab.id || !tab.url) {
    logResurface("skip:no-tab-url", { tabId: tab.id, url: tab.url });
    return;
  }
  const url = tab.url;
  const state = await getState();
  const currentDomain = getDomain(url);
  if (isBlacklisted(currentDomain, state.settings.blacklistDomains)) {
    logResurface("skip:blacklisted", { tabId: tab.id, url });
    return;
  }
  logResurface("evaluate", {
    tabId: tab.id,
    url,
    title: tab.title,
    enabled: state.settings.resurfaceEnabled,
    recordingPaused: state.settings.recordingPaused,
    archivedCount: state.tabs.filter((item) => item.archived).length,
    includeGhostTabs: state.settings.resurfaceRule.includeGhostTabs,
    ghostCount: state.tabs.filter((item) => isGhostTab(item, state.settings)).length
  });
  if (!state.settings.resurfaceEnabled) {
    logResurface("skip:disabled", { tabId: tab.id, url });
    return;
  }
  if (state.settings.recordingPaused) {
    logResurface("skip:recording-paused", { tabId: tab.id, url });
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shownToday = state.events.filter((event) => event.type === "resurface_shown" && event.createdAt >= today.getTime()).length;
  const lastShown = [...state.events].reverse().find((event) => event.type === "resurface_shown");
  if (state.settings.resurfaceRule.maxPerDay > 0 && shownToday >= state.settings.resurfaceRule.maxPerDay) {
    logResurface("skip:max-per-day", { shownToday, maxPerDay: state.settings.resurfaceRule.maxPerDay });
    return;
  }
  if (state.settings.resurfaceRule.cooldownHours > 0 && lastShown && Date.now() - lastShown.createdAt < state.settings.resurfaceRule.cooldownHours * 60 * 60 * 1000) {
    logResurface("skip:cooldown", {
      lastShownAt: new Date(lastShown.createdAt).toISOString(),
      cooldownHours: state.settings.resurfaceRule.cooldownHours
    });
    return;
  }
  const current = createInfoCard(tab.title || getDomain(url), url);
  const includeGhostTabs = state.settings.resurfaceRule.includeGhostTabs;
  const now = Date.now();
  const scored = state.tabs
    .filter((item) => isVisibleTab(item, state.settings))
    .filter((item) => item.url !== url && (item.archived || (includeGhostTabs && isGhostTab(item, state.settings, now))))
    .map((item) => ({
      item,
      overlap: item.card.topics.filter((topic) => current.topics.includes(topic)).length + (item.domain === currentDomain ? 2 : 0)
    }));
  logResurface("matched-candidates", {
    currentDomain,
    currentTopics: current.topics,
    includeGhostTabs,
    candidates: scored
      .filter(({ overlap }) => overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 8)
      .map(({ item, overlap }) => ({ title: item.title, url: item.url, domain: item.domain, archived: item.archived, topics: item.card.topics, overlap }))
  });
  const related = scored
    .filter(({ overlap }) => overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 4)
    .map(({ item }) => item);
  if (!related.length) {
    logResurface("skip:no-related", { minOverlap: 2 });
    return;
  }
  try {
    logResurface("send:start", { tabId: tab.id, related: related.map((item) => ({ title: item.title, url: item.url })) });
    await sendResurfaceMessage(tab.id, related);
    logResurface("send:success", { tabId: tab.id, relatedCount: related.length });
    await recordResurfaceAction(related.map((item) => item.id), "shown");
  } catch (error) {
    logResurface("send:failed", { tabId: tab.id, error: String(error) });
  }
}

async function sendResurfaceMessage(tabId: number, tabs: TabMemory[]) {
  const state = await getState();
  const language = resolveUiLanguage(state.settings.language);
  const message = {
    type: "TAB_GRAVEYARD_RESURFACE",
    language,
    theme: state.settings.theme,
    tabs: tabs.map((item) => ({ id: item.id, title: item.title, domain: item.domain, url: item.url, favIconUrl: item.favIconUrl, archived: item.archived }))
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      logResurface("message:delivered", { tabId, attempt });
      return;
    } catch (error) {
      lastError = error;
      logResurface("message:failed", { tabId, attempt, error: String(error) });
      if (attempt === 0) await injectContentScript(tabId);
      await delay(350);
    }
  }
  throw lastError;
}

function resolveUiLanguage(mode: string) {
  if (mode === "zh" || mode === "en") return mode;
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("zh") ? "zh" : "en";
}

async function injectContentScript(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["assets/content.js"]
    });
    logResurface("content-script:injected", { tabId });
  } catch {
    logResurface("content-script:inject-failed", { tabId });
    // Browser pages and restricted URLs may reject extension script injection.
  }
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
  const tabs = getVisibleTabs(state.tabs, state.settings);
  if (!query.trim() || !canUseDeepSeek(state)) {
    return recallTabs(tabs, query, filters);
  }

  try {
    const plan = await planRecallQuery(state, query);
    const intent = buildRecallIntent(query, plan);
    const expandedQuery = [query, intent.primary, ...intent.phrases, ...plan.terms, ...plan.bilingualTerms, ...plan.cues.map((cue) => `${cue.label} ${cue.value}`)].join(" ");
    const localResults = recallTabs(tabs, expandedQuery, {
      ...filters,
      time: filters?.time && filters.time !== "all" ? filters.time : plan.time ?? filters?.time,
      source: filters?.source,
      contentType: filters?.contentType && filters.contentType !== "all" ? filters.contentType : plan.contentType ?? filters?.contentType
    });
    const candidates = prioritizeIntentCandidates(localResults.length ? localResults : recallTabs(tabs, query, filters), intent).slice(0, 30);
    if (!candidates.length) return [];
    return rerankRecallResults(state, query, candidates, plan, intent);
  } catch (error) {
    const reason = formatAiFallbackReason(error);
    await setState(addEvent(state, "deepseek_recall_fallback", { reason, query: query.slice(0, 80) }));
    return recallTabs(tabs, query, filters).map((tab) => ({ ...tab, aiRecallStatus: "fallback" as const, aiFallbackReason: reason }));
  }
}

async function summarizeRecallWithDeepSeek(query: string, tabIds?: string[], sessionId?: string): Promise<RecallSynthesisResult> {
  const state = await getState();
  if (!canUseDeepSeek(state)) throw new Error("DeepSeek is disabled by AI mode or strict privacy mode.");
  const language = resolveUiLanguage(state.settings.language);
  const outputLanguage = language === "zh"
    ? "Simplified Chinese. All user-facing JSON string values must be Chinese. Keep product names, domains, URLs, API names, and code identifiers in their original language."
    : "English. Keep product names, domains, URLs, API names, and code identifiers in their original language.";

  const idSet = new Set(tabIds ?? []);
  const tabs = getVisibleTabs(state.tabs, state.settings)
    .filter((tab) => (sessionId ? tab.sessionId === sessionId : true))
    .filter((tab) => (!idSet.size ? true : idSet.has(tab.id)))
    .slice(0, 24);
  if (!tabs.length) throw new Error("No visible tabs to summarize.");

  const payload = await deepSeekJson<DeepSeekSynthesis>(
    state,
    `You summarize a user's browser-memory tabs. Return compact JSON only. Output language: ${outputLanguage}`,
    `User request: ${query || "Summarize this browser session."}
Tabs:
${tabs.map(formatTabForDeepSeek).join("\n")}

Return JSON:
{
  "summary": "one concise synthesis",
  "bullets": ["specific finding"],
  "gaps": ["missing angle or useful next research step"],
  "topics": ["topic"]
}
Use only the provided tab metadata and behavior signals. Do not claim page-body facts that are not present.
Language requirement is strict: summary, bullets, gaps, and topics must use the output language specified in the system message.`,
    700
  );

  const result = {
    summary: stringOr(payload.summary, ""),
    bullets: cleanStringArray(payload.bullets).slice(0, 5),
    gaps: cleanStringArray(payload.gaps).slice(0, 3),
    topics: cleanStringArray(payload.topics).slice(0, 5),
    tabCount: tabs.length,
    generatedAt: Date.now()
  };
  await setState(addEvent(state, "deepseek_recall_summarized", { tabs: tabs.length, session: sessionId ?? "", query: query.slice(0, 80) }));
  return result;
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
    if (!isVisibleTab(tab, state.settings)) continue;
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
    const sessionTabs = state.tabs.filter((tab) => session.tabIds.includes(tab.id) && isVisibleTab(tab, state.settings)).slice(0, 12);
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

async function planRecallQuery(state: GraveyardState, query: string): Promise<DeepSeekRecallPlanClean> {
  const payload = await deepSeekJson<DeepSeekRecallPlan>(
    state,
    "You parse browser-memory recall queries into structured cues. Return compact JSON only.",
    `User query: ${query}

Return JSON:
{
  "intent": "the user's complete search intent as one phrase",
  "intentPhrases": ["compound phrases that must be treated together"],
  "terms": ["short English or URL terms"],
  "bilingualTerms": ["Chinese/English equivalents"],
  "cues": [{"type": "time|source|domain|topic|entity|contentType|readingStatus|importance|task|visual|keyword", "label": "specific user-facing cue with value", "value": "normalized specific value"}],
  "time": "today|yesterday|week|last-week|all|null",
  "contentType": "article|video|pdf|tweet|repo|doc|image|saas|null",
  "source": "twitter|slack|email|search|direct|bookmark|null",
  "clarifications": ["short question or option when the query is ambiguous"]
}
For cues, never use generic labels like "Company", "Topic", or "Domain" by themselves. Use labels like "Company: Tencent", "Topic: coding plan", "Domain: cloud.tencent.com".
Preserve compound concepts. For "tencent coding plan", intent should be "Tencent coding plan" and intentPhrases should include "coding plan" and "tencent coding plan"; do not treat these as three independent weak keywords.
Do not invent private data. Use null when uncertain.`,
    420
  );
  return {
    intent: stringOr(payload.intent, query).slice(0, 120),
    intentPhrases: cleanStringArray(payload.intentPhrases).slice(0, 8),
    terms: cleanStringArray(payload.terms).slice(0, 10),
    bilingualTerms: cleanStringArray(payload.bilingualTerms).slice(0, 10),
    cues: cleanRecallCues(payload.cues).slice(0, 10),
    time: isRecallTime(payload.time) ? payload.time : undefined,
    contentType: isContentType(payload.contentType) ? payload.contentType : undefined,
    source: isSourceType(payload.source) ? payload.source : undefined,
    clarifications: cleanStringArray(payload.clarifications).slice(0, 3)
  };
}

async function rerankRecallResults(state: GraveyardState, query: string, candidates: RecallResult[], plan: DeepSeekRecallPlanClean, intent: RecallIntent): Promise<RecallResult[]> {
  const payload = await deepSeekJson<DeepSeekRerank>(
    state,
    "You rerank browser-memory recall candidates. Return compact JSON only.",
    `User query: ${query}
Complete intent: ${intent.primary}
Compound phrases to preserve: ${intent.phrases.join(", ") || "none"}
Parsed cues: ${plan.cues.map((cue) => `${cue.type}:${cue.label}=${cue.value}`).join(", ") || "none"}
Candidates:
${candidates.map((tab, index) => `${index + 1}. id=${tab.id}\n${formatTabForDeepSeek(tab)}`).join("\n")}

Return JSON:
{
  "ranked": [{"id": "candidate id", "reason": "brief reason"}]
}
Only include candidate ids. Prefer pages matching the complete intent or compound phrases. A page that only matches one generic word must rank below a page matching the whole concept.`,
    700
  );
  const byId = new Map(candidates.map((tab) => [tab.id, tab]));
  const used = new Set<string>();
  const ranked = Array.isArray(payload.ranked)
    ? payload.ranked.flatMap((item) => {
        const id = typeof item?.id === "string" ? item.id : "";
        const tab = byId.get(id);
        if (!tab || used.has(id)) return [];
        used.add(id);
        return [{ ...tab, aiRankReason: stringOr(item.reason, ""), aiCues: plan.cues, aiClarifications: plan.clarifications, aiRecallStatus: "enhanced" as const, aiIntent: intent.primary }];
      })
    : [];
  const rest = candidates.filter((tab) => !used.has(tab.id)).map((tab) => ({ ...tab, aiCues: plan.cues, aiClarifications: plan.clarifications, aiRecallStatus: "enhanced" as const, aiIntent: intent.primary }));
  return [...ranked, ...rest].slice(0, 60);
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
    { role: "system", content: `${system} Return one valid JSON object only. No markdown fences, comments, or trailing prose.` },
    { role: "user", content: user }
  ], maxTokens);
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  return parseDeepSeekJson<T>(state, content, maxTokens);
}

async function parseDeepSeekJson<T>(state: GraveyardState, content: string, maxTokens: number): Promise<T> {
  const extracted = extractJson(content);
  try {
    return JSON.parse(extracted) as T;
  } catch (error) {
    const repaired = await repairDeepSeekJson(state, extracted, maxTokens, error);
    return JSON.parse(extractJson(repaired)) as T;
  }
}

async function repairDeepSeekJson(state: GraveyardState, brokenJson: string, maxTokens: number, parseError: unknown) {
  const payload = await deepSeekChat(state, [
    {
      role: "system",
      content: "Repair malformed JSON. Return exactly one valid JSON object. Do not add markdown fences or explanations."
    },
    {
      role: "user",
      content: `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}

Malformed JSON:
${brokenJson.slice(0, 4000)}`
    }
  ], Math.max(maxTokens, 500));
  return payload.choices?.[0]?.message?.content ?? "{}";
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

function isRecallTime(value: unknown): value is NonNullable<RecallFilters["time"]> {
  return typeof value === "string" && ["today", "yesterday", "week", "last-week", "all"].includes(value);
}

function isRecallCueType(value: unknown): value is RecallCue["type"] {
  return typeof value === "string" && ["time", "source", "domain", "topic", "entity", "contentType", "readingStatus", "importance", "task", "visual", "keyword"].includes(value);
}

function cleanRecallCues(value: unknown): RecallCue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const cue = item as Partial<Record<keyof RecallCue, unknown>>;
    if (!isRecallCueType(cue.type)) return [];
    const normalized = stringOr(cue.value, "").slice(0, 80);
    const rawLabel = stringOr(cue.label, "").slice(0, 80);
    const label = isGenericCueLabel(rawLabel) && normalized ? normalized : rawLabel;
    if (!label || !normalized) return [];
    return [{ type: cue.type, label, value: normalized }];
  });
}

function isGenericCueLabel(value: string) {
  return /^(company|topic|domain|entity|source|type|content type|keyword|time|公司|主题|域名|实体|来源|类型|关键词|时间)$/i.test(value.trim());
}

function isReadingStatus(value: unknown): value is ReadingStatus {
  return typeof value === "string" && ["fully-read", "skimmed", "bounced"].includes(value);
}

function isImportance(value: unknown): value is Importance {
  return typeof value === "string" && ["must", "should", "maybe", "safe"].includes(value);
}

function formatTabForDeepSeek(tab: TabMemory) {
  return [
    `Title: ${tab.title}`,
    `URL: ${tab.url}`,
    `Domain: ${tab.domain}`,
    `Summary: ${tab.card.summary}`,
    `Topics: ${tab.card.topics.join(", ")}`,
    `Entities: ${tab.card.entities.join(", ")}`,
    `Type: ${tab.card.contentType}`,
    `Source: ${tab.card.source}`,
    `Reading: ${tab.card.readingStatus}`,
    `Importance: ${tab.card.importance}`,
    `Queries: ${tab.card.possibleQueries.join(", ")}`,
    `Behavior: active ${Math.round(tab.signals.activeMs / 60000)}m, activations ${tab.signals.activationCount}, scroll ${tab.signals.maxScrollPercent}%, copied ${tab.signals.copiedTextCount}`
  ].join("\n");
}

function buildRecallIntent(query: string, plan: DeepSeekRecallPlanClean): RecallIntent {
  const terms = extractRecallTerms(query);
  const queryPhrase = terms.join(" ");
  const queryCompact = terms.join("");
  const aiPhrases = [plan.intent, ...plan.intentPhrases, ...plan.cues.filter((cue) => cue.type === "topic" || cue.type === "task" || cue.type === "entity").map((cue) => cue.value)];
  const phraseTerms = aiPhrases.flatMap((phrase) => {
    const phraseWords = extractRecallTerms(phrase);
    return phraseWords.length >= 2 ? [phraseWords.join(" "), phraseWords.join("")] : phraseWords;
  });
  const adjacent = terms.flatMap((term, index) => {
    const next = terms[index + 1];
    return next ? [`${term} ${next}`, `${term}${next}`] : [];
  });
  const phrases = Array.from(new Set([queryPhrase, queryCompact, ...adjacent, ...phraseTerms].map((item) => item.trim()).filter((item) => item.length >= 4)));
  return {
    primary: plan.intent || queryPhrase || query.trim(),
    terms,
    phrases
  };
}

function prioritizeIntentCandidates(candidates: RecallResult[], intent: RecallIntent) {
  const scored = candidates.map((tab, index) => ({ tab, index, fit: scoreIntentFit(tab, intent) }));
  const hasStrongIntentMatch = scored.some((item) => item.fit >= 8);
  return scored
    .filter((item) => !hasStrongIntentMatch || item.fit >= 4)
    .sort((a, b) => b.fit - a.fit || b.tab.score - a.tab.score || a.index - b.index)
    .map((item) => ({
      ...item.tab,
      score: item.tab.score + item.fit,
      matchedCues: Array.from(new Set([...item.tab.matchedCues, ...intent.phrases.filter((phrase) => createRecallHaystack(item.tab).includes(phrase)).slice(0, 3)])).slice(0, 8)
    }));
}

function scoreIntentFit(tab: TabMemory, intent: RecallIntent) {
  const haystack = createRecallHaystack(tab);
  const compactHaystack = haystack.replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, "");
  const phraseScore = intent.phrases.reduce((score, phrase) => {
    const compact = phrase.replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, "");
    if (phrase.includes(" ") && haystack.includes(phrase)) return score + 10;
    if (compact.length >= 4 && compactHaystack.includes(compact)) return score + 8;
    if (haystack.includes(phrase)) return score + 5;
    return score;
  }, 0);
  const termScore = intent.terms.reduce((score, term) => (haystack.includes(term) || compactHaystack.includes(term) ? score + 2 : score), 0);
  return phraseScore + termScore;
}

function createRecallHaystack(tab: TabMemory) {
  return [
    tab.title,
    tab.url,
    tab.domain,
    tab.card.summary,
    tab.card.taskContext,
    ...tab.card.topics,
    ...tab.card.entities,
    ...tab.card.possibleQueries,
    ...tab.card.bilingualTopics,
    ...(tab.card.customTags ?? [])
  ].join(" ").toLowerCase();
}

function extractRecallTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
    .filter((term) => term.length >= 2 || /^[\u4e00-\u9fa5]$/u.test(term))
    .slice(0, 8);
}

function formatAiFallbackReason(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/\s+/g, " ").slice(0, 180) || "DeepSeek recall failed.";
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

type DeepSeekRecallPlan = {
  intent?: unknown;
  intentPhrases?: unknown;
  terms?: unknown;
  bilingualTerms?: unknown;
  cues?: unknown;
  time?: unknown;
  contentType?: unknown;
  source?: unknown;
  clarifications?: unknown;
};

type DeepSeekRecallPlanClean = {
  intent: string;
  intentPhrases: string[];
  terms: string[];
  bilingualTerms: string[];
  cues: RecallCue[];
  time?: RecallFilters["time"];
  contentType?: ContentType;
  source?: SourceType;
  clarifications: string[];
};

type RecallIntent = {
  primary: string;
  terms: string[];
  phrases: string[];
};

type DeepSeekRerank = {
  ranked?: Array<{ id?: unknown; reason?: unknown }>;
};

type DeepSeekSynthesis = {
  summary?: unknown;
  bullets?: unknown;
  gaps?: unknown;
  topics?: unknown;
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
