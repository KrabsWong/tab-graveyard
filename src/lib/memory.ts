import type {
  AnalyticsEvent,
  BehaviorSignals,
  BrowseGroupMode,
  AppSnapshot,
  ContentType,
  DailyDigest,
  GraveyardGroup,
  GraveyardState,
  RecallFilters,
  RecallResult,
  SessionMemory,
  Settings,
  SourceType,
  TabInfoCard,
  TabMemory,
  UserRule
} from "@/lib/types";

const STORAGE_KEY = "tabGraveyardState";

export const defaultSettings: Settings = {
  recordingPaused: false,
  aiMode: "local-first",
  language: "system",
  theme: "system",
  deepSeek: {
    enabled: true,
    apiKey: "",
    model: "deepseek-v4-flash",
    baseUrl: "https://api.deepseek.com"
  },
  strictPrivacy: true,
  ghostThresholdHours: 48,
  resurfaceEnabled: true,
  resurfaceRule: {
    maxPerDay: 3,
    cooldownHours: 12,
    includeGhostTabs: false
  },
  archiveTrustStage: "manual",
  archivePreannounce: true,
  leaderboardEnabled: false,
  blacklistDomains: [
    "mail.google.com",
    "accounts.google.com",
    "bank",
    "1password",
    "lastpass",
    "bitwarden",
    "localhost",
    "127.0.0.1"
  ]
};

export const emptyState = (): GraveyardState => ({
  tabs: [],
  sessions: [],
  settings: defaultSettings,
  deletedUrls: [],
  rules: [],
  events: [],
  dailyDigests: []
});

export function isExtensionRuntime() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

export async function getState(): Promise<GraveyardState> {
  if (!isExtensionRuntime()) return emptyState();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeState(data[STORAGE_KEY]);
}

export async function setState(state: GraveyardState, options: { replaceDeletedUrls?: boolean } = {}) {
  if (!isExtensionRuntime()) return undefined;
  const normalized = normalizeState(state);
  const next = options.replaceDeletedUrls ? normalized : await mergeExistingDeletedUrls(normalized);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export function normalizeState(raw: unknown): GraveyardState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const candidate = raw as Partial<GraveyardState>;
  const deletedUrls = Array.isArray(candidate.deletedUrls)
    ? Array.from(new Set(candidate.deletedUrls.map(normalizeDeletedUrl).filter(Boolean))).slice(-1000)
    : [];
  const deletedUrlSet = new Set(deletedUrls);
  const tabs = Array.isArray(candidate.tabs)
    ? candidate.tabs
        .map(normalizeTabMemory)
        .filter((tab) => !shouldSkipUrl(tab.url) && !deletedUrlSet.has(normalizeDeletedUrl(tab.url)))
    : [];
  const candidateSettings = (candidate.settings ?? {}) as Partial<Settings>;
  const knownSettings = Object.fromEntries(
    (Object.keys(defaultSettings) as Array<keyof Settings>)
      .filter((key) => candidateSettings[key] !== undefined)
      .map((key) => [key, candidateSettings[key]])
  ) as Partial<Settings>;
  const settings = {
    ...defaultSettings,
    ...knownSettings,
    deepSeek: {
      ...defaultSettings.deepSeek,
      ...(candidate.settings?.deepSeek ?? {})
    },
    resurfaceRule: {
      ...defaultSettings.resurfaceRule,
      ...(candidate.settings?.resurfaceRule ?? {})
    }
  };
  return {
    tabs,
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions : [],
    settings,
    deletedUrls,
    lastUndo: candidate.lastUndo,
    archivePreview: candidate.archivePreview,
    rules: Array.isArray(candidate.rules) ? candidate.rules : [],
    events: Array.isArray(candidate.events) ? candidate.events.slice(-400) : [],
    dailyDigests: Array.isArray(candidate.dailyDigests)
      ? candidate.dailyDigests.flatMap((digest) => {
          const normalized = normalizeDailyDigest(digest);
          return normalized ? [normalized] : [];
        }).slice(-90)
      : []
  };
}

export function createSnapshot(state: GraveyardState, now = Date.now()): AppSnapshot {
  const tabs = getVisibleTabs(state.tabs, state.settings);
  const visibleTabIds = new Set(tabs.map((tab) => tab.id));
  const sessions = state.sessions
    .map((session) => ({ ...session, tabIds: session.tabIds.filter((tabId) => visibleTabIds.has(tabId)) }))
    .filter((session) => session.tabIds.length > 0);
  const ghostTabs = tabs.filter((tab) => isGhostTab(tab, state.settings, now));
  const archivedTabs = tabs.filter((tab) => tab.archived);
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const todayCount = tabs.filter((tab) => tab.openedAt >= todayStart).length;
  const yesterdayTabs = tabs.filter((tab) => tab.openedAt >= yesterdayStart && tab.openedAt < todayStart);
  const recapTitle = yesterdayTabs
    .sort((a, b) => importanceWeight(b.card.importance) - importanceWeight(a.card.importance))[0]?.title;

  return {
    tabs,
    sessions,
    settings: state.settings,
    ghostTabs,
    archivedTabs,
    dailyDigests: state.dailyDigests,
    totalTabs: tabs.length,
    todayCount,
    yesterdayCount: yesterdayTabs.length,
    recapTitle: recapTitle ?? "No standout tab yet",
    lastUndo: state.lastUndo && state.lastUndo.expiresAt > now ? state.lastUndo : undefined,
    archivePreview: state.archivePreview && state.archivePreview.expiresAt > now ? state.archivePreview : undefined,
    rules: state.rules,
    events: state.events
  };
}

export function createTabMemory(tab: chrome.tabs.Tab, existing?: TabMemory, now = Date.now()): TabMemory | undefined {
  if (!tab.url || shouldSkipUrl(tab.url)) return undefined;
  const domain = getDomain(tab.url);
  const title = tab.title?.trim() || domain;
  return {
    id: existing?.id ?? makeId("tab"),
    url: tab.url,
    title,
    favIconUrl: tab.favIconUrl,
    domain,
    openedAt: existing?.openedAt ?? now,
    lastActivatedAt: existing?.lastActivatedAt ?? now,
    windowId: tab.windowId,
    tabId: tab.id,
    index: tab.index,
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    archived: existing?.archived ?? false,
    archivedAt: existing?.archivedAt,
    restored: existing?.restored ?? false,
    restoredAt: existing?.restoredAt,
    sessionId: existing?.sessionId ?? createFallbackSessionId(now, tab.windowId),
    card: createInfoCard(title, tab.url, existing?.card),
    signals: {
      ...defaultBehaviorSignals(),
      ...(existing?.signals ?? {}),
      openerTabId: existing?.signals?.openerTabId ?? tab.openerTabId
    }
  };
}

export function mergeTab(state: GraveyardState, incoming: TabMemory): GraveyardState {
  const duplicateIndex = state.tabs.findIndex(
    (tab) => tab.id === incoming.id || (!tab.archived && tab.tabId === incoming.tabId && incoming.tabId != null)
  );
  const tabs = [...state.tabs];
  if (duplicateIndex >= 0) {
    tabs[duplicateIndex] = { ...tabs[duplicateIndex], ...incoming };
  } else {
    tabs.unshift(incoming);
  }
  return ensureSessions({ ...state, tabs });
}

export function ensureSessions(state: GraveyardState): GraveyardState {
  const previous = new Map(state.sessions.map((session) => [session.id, session]));
  const assignments = inferTaskSessionAssignments(state.tabs, previous);
  const tabs = state.tabs.map((tab) => ({ ...tab, sessionId: assignments.get(tab.id) ?? createSoloSessionId(tab) }));
  const sessionsById = new Map<string, SessionMemory>();
  for (const tab of tabs) {
    if (tab.sessionId.startsWith("solo-")) continue;
    const existing = sessionsById.get(tab.sessionId);
    const saved = previous.get(tab.sessionId);
    const topics = Array.from(new Set([...(existing?.topics ?? []), ...tab.card.topics])).slice(0, 4);
    const sourceHint = tab.card.source !== "direct" ? tab.card.source : existing?.sourceHint ?? tab.domain;
    const preservedName = saved?.userNamed || saved?.aiNamed ? saved.name : undefined;
    sessionsById.set(tab.sessionId, {
      id: tab.sessionId,
      name: preservedName ?? existing?.name ?? buildSessionName(tab),
      createdAt: Math.min(existing?.createdAt ?? tab.openedAt, tab.openedAt),
      updatedAt: Math.max(existing?.updatedAt ?? tab.lastActivatedAt, tab.lastActivatedAt),
      tabIds: [...(existing?.tabIds ?? []), tab.id],
      topics,
      sourceHint,
      userNamed: saved?.userNamed,
      aiNamed: saved?.aiNamed,
      aiNamedAt: saved?.aiNamedAt,
      aiSummary: saved?.aiSummary,
      aiSummarySourceHash: saved?.aiSummarySourceHash
    });
  }
  const sessions = Array.from(sessionsById.values())
    .filter((session) => session.tabIds.length >= 2 || Boolean(session.userNamed))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { ...state, tabs, sessions };
}

export function isGhostTab(tab: TabMemory, settings: Settings, now = Date.now()) {
  if (typeof tab.tabId !== "number") return false;
  if (tab.archived || tab.pinned || tab.audible) return false;
  if (tab.card.importance === "must" || tab.card.importance === "should") return false;
  if (isBlacklisted(tab.domain, settings.blacklistDomains)) return false;
  return now - tab.lastActivatedAt >= settings.ghostThresholdHours * 60 * 60 * 1000;
}

export function isVisibleTab(tab: TabMemory, settings: Settings) {
  return !isBlacklisted(tab.domain, settings.blacklistDomains);
}

export function getVisibleTabs(tabs: TabMemory[], settings: Settings) {
  return tabs.filter((tab) => isVisibleTab(tab, settings));
}

export function getLocalDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function getPreviousLocalDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date.getTime());
}

export function startOfLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(Date.now()) - dayMs(1);
  return new Date(year, month - 1, day).getTime();
}

export function getDailyDigestTabs(tabs: TabMemory[], settings: Settings, dateKey: string, limit = 48) {
  const start = startOfLocalDateKey(dateKey);
  const end = start + dayMs(1);
  return dedupeTabs(
    getVisibleTabs(tabs, settings).filter((tab) => (
      (tab.lastActivatedAt >= start && tab.lastActivatedAt < end)
      || (tab.openedAt >= start && tab.openedAt < end)
    ))
  )
    .sort((left, right) => dailyDigestTabScore(right) - dailyDigestTabScore(left) || right.lastActivatedAt - left.lastActivatedAt)
    .slice(0, limit);
}

export function buildDailyDigestSourceHash(tabs: TabMemory[]) {
  const input = [...tabs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((tab) => [
      tab.id,
      tab.url,
      tab.title,
      tab.card.summary,
      tab.card.topics.join(","),
      tab.card.entities.join(","),
      tab.card.importance,
      tab.card.readingStatus,
      tab.card.contentType,
      tab.card.source,
      tab.lastActivatedAt,
      tab.openedAt,
      tab.signals.activeMs,
      tab.signals.activationCount,
      tab.signals.maxScrollPercent,
      tab.signals.copiedTextCount
    ].join("|"))
    .join("\n");
  return hashText(input);
}

export function recallTabs(tabs: TabMemory[], query: string, filters: RecallFilters = {}, now = Date.now()): RecallResult[] {
  const hasQuery = query.trim().length > 0;
  const cues = parseCues(query);
  return tabs
    .filter((tab) => applyFilters(tab, filters, now))
    .map((tab) => scoreTab(tab, cues, query))
    .filter((result) => (hasQuery ? result.matchedCues.length > 0 : true))
    .sort((a, b) => (hasQuery ? b.score - a.score || b.lastActivatedAt - a.lastActivatedAt : b.lastActivatedAt - a.lastActivatedAt))
    .slice(0, 60);
}

export function matchesOriginalQuery(tab: TabMemory, query: string) {
  const terms = extractSearchTerms(query);
  if (!terms.length) return true;
  const haystack = createSearchHaystack(tab);
  return terms.some((term) => haystack.includes(term));
}

export function createInfoCard(title: string, url: string, existing?: TabInfoCard): TabInfoCard {
  const domain = getDomain(url);
  const contentType = inferContentType(url);
  const source = inferSource(url);
  const words = extractTerms(`${title} ${domain}`).slice(0, 8);
  const topics = inferTopics(title, domain, contentType);
  const summary = existing?.summary ?? summarizeTitle(title, domain, contentType);
  return {
    summary,
    topics: existing?.topics?.length ? existing.topics : topics,
    entities: existing?.entities?.length ? existing.entities : inferEntities(title, domain),
    contentType,
    source,
    readingStatus: existing?.readingStatus ?? "skimmed",
    importance: existing?.importance ?? inferImportance(url, title),
    color: existing?.color ?? inferColor(domain, contentType),
    possibleQueries: existing?.possibleQueries?.length ? existing.possibleQueries : words,
    bilingualTopics: existing?.bilingualTopics?.length ? existing.bilingualTopics : topics.flatMap((topic) => [topic, translateTopic(topic)]),
    fingerprint: normalizeFingerprint(url),
    previewImageUrl: existing?.previewImageUrl,
    taskContext: existing?.taskContext ?? "",
    customTags: existing?.customTags ?? [],
    userEdited: existing?.userEdited,
    userEditedAt: existing?.userEditedAt,
    aiEnhanced: existing?.aiEnhanced,
    aiEnhancedAt: existing?.aiEnhancedAt,
    aiEnhancedSource: existing?.aiEnhancedSource,
    aiEnhanceFailedAt: existing?.aiEnhanceFailedAt,
    aiEnhanceFailureReason: existing?.aiEnhanceFailureReason
  };
}

export function addEvent(state: GraveyardState, type: string, meta?: AnalyticsEvent["meta"]): GraveyardState {
  return {
    ...state,
    events: [...state.events, { type, meta, createdAt: Date.now() }].slice(-400)
  };
}

function normalizeDailyDigest(value: unknown): DailyDigest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const digest = value as Partial<DailyDigest>;
  if (!digest.dateKey || !digest.summary) return undefined;
  const generatedAt = Number(digest.generatedAt) || Date.now();
  return {
    id: stringValue(digest.id, `digest-${digest.dateKey}`),
    dateKey: stringValue(digest.dateKey, getPreviousLocalDateKey(generatedAt)),
    presentationDateKey: stringValue(digest.presentationDateKey, getLocalDateKey(generatedAt)),
    sourceHash: stringValue(digest.sourceHash, ""),
    generationSource: digest.generationSource === "ai" ? "ai" : "local",
    generatedAt,
    tipShownAt: optionalNumber(digest.tipShownAt),
    viewedAt: optionalNumber(digest.viewedAt),
    dismissedAt: optionalNumber(digest.dismissedAt),
    tabIds: stringArray(digest.tabIds).slice(0, 80),
    tabCount: Number(digest.tabCount) || stringArray(digest.tabIds).length,
    summary: stringValue(digest.summary, ""),
    themes: stringArray(digest.themes).slice(0, 8),
    insights: stringArray(digest.insights).slice(0, 8),
    suggestions: stringArray(digest.suggestions).slice(0, 8),
    reflectionQuestions: stringArray(digest.reflectionQuestions).slice(0, 8),
    gaps: stringArray(digest.gaps).slice(0, 8)
  };
}

export function applyRules(tab: TabMemory, rules: UserRule[]) {
  const matched = rules.filter((rule) => {
    if (rule.scope === "domain") return tab.domain.includes(rule.value);
    if (rule.scope === "source") return tab.card.source === rule.value;
    if (rule.scope === "contentType") return tab.card.contentType === rule.value;
    return false;
  });
  if (!matched.length) return tab;
  const card = matched.reduce<TabInfoCard>((next, rule) => ({
    ...next,
    ...rule.patch,
    topics: rule.patch.topics?.length ? rule.patch.topics : next.topics,
    customTags: rule.patch.customTags?.length ? rule.patch.customTags : next.customTags
  }), tab.card);
  return { ...tab, card };
}

export function buildWhyTip(tab: TabMemory, language: "en" | "zh" = "en") {
  const facts: string[] = [];
  if (tab.signals.maxScrollPercent >= 85) facts.push(language === "zh" ? "你几乎读到了页面底部" : "you read close to the bottom");
  if (tab.signals.activeMs >= 10 * 60 * 1000) facts.push(language === "zh" ? `停留了 ${Math.round(tab.signals.activeMs / 60000)} 分钟` : `you spent ${Math.round(tab.signals.activeMs / 60000)} min on it`);
  if (tab.signals.activationCount >= 3) facts.push(language === "zh" ? `返回过 ${tab.signals.activationCount} 次` : `you returned ${tab.signals.activationCount} times`);
  if (tab.signals.copiedTextCount > 0) facts.push(language === "zh" ? "你曾从这里复制内容" : "you copied from this page");
  if (tab.card.importance === "must" || tab.card.importance === "should") facts.push(language === "zh" ? `被标为 ${tab.card.importance}` : `marked ${tab.card.importance}`);
  if (!facts.length) facts.push(language === "zh" ? `匹配 ${tab.card.topics[0] ?? tab.domain}` : `matches ${tab.card.topics[0] ?? tab.domain}`);
  return language === "zh" ? `为什么显示：${facts.slice(0, 2).join("，")}。` : `Why this appears: ${facts.slice(0, 2).join("; ")}.`;
}

export function groupTabs(tabs: TabMemory[], mode: BrowseGroupMode, language: "en" | "zh" = "en"): GraveyardGroup[] {
  const groups = new Map<string, GraveyardGroup>();
  for (const tab of tabs) {
    const keys = groupKeys(tab, mode, language);
    for (const { key, label } of keys) {
      const existing = groups.get(key);
      if (existing) existing.tabs.push(tab);
      else groups.set(key, { key, label, tabs: [tab] });
    }
  }
  return Array.from(groups.values())
    .map((group) => ({ ...group, tabs: dedupeTabs(group.tabs).sort((a, b) => b.lastActivatedAt - a.lastActivatedAt) }))
    .sort((a, b) => b.tabs[0]?.lastActivatedAt - a.tabs[0]?.lastActivatedAt);
}

export function dedupeTabs(tabs: TabMemory[]) {
  const seen = new Set<string>();
  const output: TabMemory[] = [];
  for (const tab of tabs.sort((a, b) => b.lastActivatedAt - a.lastActivatedAt)) {
    const key = tab.card.fingerprint || normalizeFingerprint(tab.url);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tab);
  }
  return output;
}

export function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isBlacklisted(domain: string, blacklist: string[]) {
  const normalized = domain.toLowerCase();
  return blacklist.some((item) => {
    const needle = item.toLowerCase().trim();
    if (!needle) return false;
    if (needle.startsWith("*.")) {
      const root = needle.slice(2);
      return normalized === root || normalized.endsWith(`.${root}`);
    }
    if (needle.includes("*")) {
      return wildcardToRegExp(needle).test(normalized);
    }
    return normalized === needle || normalized.endsWith(`.${needle}`) || normalized.includes(needle);
  });
}

function wildcardToRegExp(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function formatTime(timestamp: number, now = Date.now(), language: "en" | "zh" = "en") {
  const diff = now - timestamp;
  const day = 24 * 60 * 60 * 1000;
  const date = new Date(timestamp);
  const locale = language === "zh" ? "zh-CN" : "en-US";
  if (timestamp >= startOfDay(now)) {
    const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    return language === "zh" ? `今天 ${time}` : `Today ${time}`;
  }
  if (timestamp >= startOfDay(now) - day) {
    const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    return language === "zh" ? `昨天 ${time}` : `Yesterday ${time}`;
  }
  if (diff < 7 * day) return date.toLocaleDateString(locale, { weekday: "short", hour: "numeric" });
  if (diff < 30 * day) {
    const weeks = Math.max(1, Math.round(diff / (7 * day)));
    const weekday = date.toLocaleDateString(locale, { weekday: "short" });
    return language === "zh" ? `${weeks} 周前，${weekday}` : `${weeks} weeks ago, ${weekday}`;
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" });
}

function applyFilters(tab: TabMemory, filters: RecallFilters, now: number) {
  if (filters.archivedOnly && !tab.archived) return false;
  if (filters.source && filters.source !== "all" && tab.card.source !== filters.source) return false;
  if (filters.contentType && filters.contentType !== "all" && tab.card.contentType !== filters.contentType) return false;
  if (filters.importance && filters.importance !== "all" && tab.card.importance !== filters.importance) return false;
  if (filters.readingStatus && filters.readingStatus !== "all" && tab.card.readingStatus !== filters.readingStatus) return false;
  if (filters.color && filters.color !== "all" && tab.card.color !== filters.color) return false;
  if (filters.topic && filters.topic !== "all" && !tab.card.topics.some((topic) => sameText(topic, filters.topic))) return false;
  if (filters.entity && filters.entity !== "all" && !tab.card.entities.some((entity) => sameText(entity, filters.entity))) return false;
  if (!filters.time || filters.time === "all") return true;
  const today = startOfDay(now);
  if (filters.time === "today") return tab.openedAt >= today || tab.lastActivatedAt >= today;
  if (filters.time === "yesterday") return tab.openedAt >= today - dayMs(1) && tab.openedAt < today;
  if (filters.time === "week") return tab.openedAt >= today - dayMs(7) || tab.lastActivatedAt >= today - dayMs(7);
  if (filters.time === "last-week") return tab.openedAt >= today - dayMs(14) && tab.openedAt < today - dayMs(7);
  return true;
}

function scoreTab(tab: TabMemory, cues: string[], query: string): RecallResult {
  const haystack = createSearchHaystack(tab);
  const matchedCues = cues.filter((cue) => haystack.includes(cue));
  const queryTerms = extractTerms(query);
  const matchedTerms = queryTerms.filter((term) => haystack.includes(term));
  const hasQuery = query.trim().length > 0;
  const matchScore = matchedCues.length * 6 + matchedTerms.length * 3;
  const score = hasQuery ? matchScore + importanceWeight(tab.card.importance) / 10 : (tab.archived ? 2 : 0) + importanceWeight(tab.card.importance);
  return { ...tab, score, matchedCues: Array.from(new Set([...matchedCues, ...matchedTerms])).slice(0, 6) };
}

function createSearchHaystack(tab: TabMemory) {
  return [
    tab.title,
    tab.url,
    tab.domain,
    tab.card.summary,
    tab.card.contentType,
    tab.card.source,
    tab.card.readingStatus,
    tab.card.importance,
    tab.card.color,
    tab.signals.referrerUrl,
    tab.card.taskContext,
    ...tab.card.topics,
    ...tab.card.entities,
    ...tab.card.possibleQueries,
    ...tab.card.bilingualTopics,
    ...(tab.card.customTags ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

function parseCues(query: string) {
  const lower = query.toLowerCase();
  const cues = extractTerms(lower);
  const mapped: string[] = [];
  if (/twitter|x\.com|推特/.test(lower)) mapped.push("twitter", "x.com");
  if (/substack/.test(lower)) mapped.push("substack");
  if (/youtube|video|视频/.test(lower)) mapped.push("video", "youtube");
  if (/pdf|paper|论文/.test(lower)) mapped.push("pdf", "paper");
  if (/github|repo|代码/.test(lower)) mapped.push("repo", "github");
  if (/pricing|price|定价|价格/.test(lower)) mapped.push("pricing", "定价");
  if (/llm|模型|评估|eval/.test(lower)) mapped.push("llm", "evaluation", "评估");
  return Array.from(new Set([...cues, ...mapped]));
}

export function shouldSkipUrl(url: string) {
  const lower = url.toLowerCase();
  if (/^(chrome|edge|brave|opera|vivaldi|arc|chrome-extension):/.test(lower)) return true;
  return isTransientAuthUrl(url);
}

export function normalizeDeletedUrl(url: string) {
  try {
    return new URL(url).toString();
  } catch {
    return url.trim();
  }
}

async function mergeExistingDeletedUrls(state: GraveyardState) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const current = normalizeState(data[STORAGE_KEY]);
  const deletedUrls = Array.from(new Set([...current.deletedUrls, ...state.deletedUrls])).slice(-1000);
  if (!deletedUrls.length) return state;
  const deletedUrlSet = new Set(deletedUrls);
  return {
    ...state,
    deletedUrls,
    tabs: state.tabs.filter((tab) => !deletedUrlSet.has(normalizeDeletedUrl(tab.url)))
  };
}

function inferContentType(url: string): ContentType {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com")) return "video";
  if (lower.endsWith(".pdf") || lower.includes("/pdf")) return "pdf";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "tweet";
  if (isCodeRepositoryUrl(url)) return "repo";
  if (lower.includes("notion.so") || lower.includes("docs.google.com")) return "doc";
  if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/.test(lower)) return "image";
  if (lower.includes("app.") || lower.includes(".app")) return "saas";
  return "article";
}

function inferSource(url: string): SourceType {
  const lower = url.toLowerCase();
  if (lower.includes("twitter.com") || lower.includes("x.com") || lower.includes("t.co")) return "twitter";
  if (lower.includes("slack.com")) return "slack";
  if (lower.includes("mail.google.com") || lower.includes("outlook")) return "email";
  if (lower.includes("google.") || lower.includes("bing.com") || lower.includes("perplexity.ai")) return "search";
  return "direct";
}

export function defaultBehaviorSignals(): BehaviorSignals {
  return {
    activeMs: 0,
    activationCount: 0,
    maxScrollPercent: 0,
    copiedTextCount: 0,
    restoreClicks: 0,
    resurfaceShown: 0,
    resurfaceDismissed: 0,
    resurfaceOpened: 0
  };
}

export function normalizeTabMemory(tab: TabMemory): TabMemory {
  return {
    ...tab,
    signals: { ...defaultBehaviorSignals(), ...(tab.signals ?? {}) },
    card: {
      ...tab.card,
      customTags: tab.card.customTags ?? [],
      taskContext: tab.card.taskContext ?? ""
    }
  };
}

function sameText(left: string, right?: string) {
  return left.toLowerCase() === (right ?? "").toLowerCase();
}

function groupKeys(tab: TabMemory, mode: BrowseGroupMode, language: "en" | "zh") {
  if (mode === "session") {
    if (tab.sessionId.startsWith("solo-")) return [{ key: "unsessioned", label: language === "zh" ? "未形成任务会话" : "No task session" }];
    return [{ key: tab.sessionId, label: tab.sessionId }];
  }
  if (mode === "source") return [{ key: tab.card.source, label: tab.card.source }];
  if (mode === "entity") {
    const entities = tab.card.entities.length ? tab.card.entities : [tab.domain];
    return entities.slice(0, 4).map((entity) => ({ key: entity.toLowerCase(), label: entity }));
  }
  const date = new Date(tab.archivedAt ?? tab.lastActivatedAt ?? tab.openedAt);
  const key = date.toISOString().slice(0, 10);
  const label = date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { weekday: "short", month: "short", day: "numeric" });
  return [{ key, label }];
}

function inferImportance(url: string, title: string) {
  const lower = `${url} ${title}`.toLowerCase();
  if (/docs\.google|notion|linear|figma|meeting|meet\.google|zoom/.test(lower) || isCodeRepositoryUrl(url)) return "should";
  if (/pricing|research|paper|eval|benchmark|market map/.test(lower)) return "maybe";
  return "safe";
}

function inferColor(domain: string, contentType: ContentType) {
  if (contentType === "video") return "black";
  if (domain.includes("github")) return "slate";
  if (domain.includes("substack")) return "orange";
  if (domain.includes("notion")) return "white";
  if (domain.includes("runway")) return "purple";
  return "blue";
}

function inferTopics(title: string, domain: string, type: ContentType) {
  const lower = `${title} ${domain}`.toLowerCase();
  const topics: string[] = [];
  if (/ai|llm|openai|model|eval|karpathy/.test(lower)) topics.push("AI");
  if (/video|runway|sora|pika/.test(lower)) topics.push("Video");
  if (/pricing|price|subscription|credit/.test(lower)) topics.push("Pricing");
  if (/market|map|research|competitor/.test(lower)) topics.push("Research");
  if (/repo|code/.test(lower) || type === "repo") topics.push("Code");
  if (!topics.length) topics.push(type === "article" ? "Reading" : type);
  return topics.slice(0, 4);
}

function isTransientAuthUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
    if (host === "github.com" || host === "www.github.com") {
      return path === "/login" || path.startsWith("/login/") || path === "/session" || path.startsWith("/session/") || path === "/logout";
    }
    return host === "accounts.google.com" || host === "login.microsoftonline.com";
  } catch {
    return false;
  }
}

function isCodeRepositoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.toLowerCase().split("/").filter(Boolean);
    if (host === "gist.github.com") return segments.length >= 2;
    if (host !== "github.com" && host !== "www.github.com" && !host.endsWith(".gitlab.com") && host !== "gitlab.com") return false;
    if (segments.length < 2) return false;
    return !CODE_HOST_RESERVED_PATHS.has(segments[0]);
  } catch {
    return false;
  }
}

const CODE_HOST_RESERVED_PATHS = new Set([
  "about",
  "account",
  "apps",
  "codespaces",
  "collections",
  "contact",
  "dashboard",
  "events",
  "explore",
  "features",
  "gist",
  "issues",
  "login",
  "logout",
  "marketplace",
  "new",
  "notifications",
  "orgs",
  "organizations",
  "pricing",
  "pulls",
  "search",
  "security",
  "session",
  "settings",
  "sponsors",
  "topics"
]);

function inferEntities(title: string, domain: string) {
  const entities = title.match(/\b[A-Z][A-Za-z0-9]{2,}\b/g) ?? [];
  const domainName = domain.split(".")[0];
  return Array.from(new Set([domainName, ...entities])).slice(0, 5);
}

function summarizeTitle(title: string, domain: string, contentType: ContentType) {
  const clean = title.replace(/\s+/g, " ").replace(/\s[-|]\s.*$/, "").trim();
  if (clean.length > 8) return clean.slice(0, 120);
  return `${contentType} from ${domain}`;
}

function translateTopic(topic: string) {
  const dictionary: Record<string, string> = {
    AI: "人工智能",
    Video: "视频",
    Pricing: "定价",
    Research: "调研",
    Code: "代码",
    Reading: "阅读"
  };
  return dictionary[topic] ?? topic;
}

function normalizeFingerprint(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function extractTerms(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
    .filter((term) => term.length >= 2 || /^[\u4e00-\u9fa5]$/u.test(term))
    .slice(0, 24);
}

function extractSearchTerms(text: string) {
  const stopWords = new Set(["the", "and", "for", "from", "has", "have", "with", "that", "this", "into", "onto", "are", "was", "were"]);
  return extractTerms(text).filter((term) => {
    if (stopWords.has(term)) return false;
    if (/^\d+$/.test(term)) return false;
    return term.length >= 4 || /^[a-z]{2,4}$/i.test(term) || /^[\u4e00-\u9fa5]+$/u.test(term);
  });
}

function buildSessionName(tab: TabMemory) {
  const topic = tab.card.topics[0] ?? "browsing";
  return topic;
}

type SessionCandidate = {
  key: string;
  strength: number;
  tabs: TabMemory[];
};

const TASK_SESSION_MAX_SPAN_MS = 7 * 24 * 60 * 60 * 1000;
const GENERIC_SESSION_TERMS = new Set(["reading", "article", "video", "pdf", "tweet", "repo", "doc", "image", "saas", "direct", "search"]);

function inferTaskSessionAssignments(tabs: TabMemory[], previous: Map<string, SessionMemory>) {
  const assignments = new Map<string, string>();
  const manualSessionIds = new Set(Array.from(previous.values()).filter((session) => session.userNamed).map((session) => session.id));
  for (const tab of tabs) {
    if (manualSessionIds.has(tab.sessionId)) assignments.set(tab.id, tab.sessionId);
  }

  const candidates = new Map<string, SessionCandidate>();
  for (const tab of tabs) {
    if (assignments.has(tab.id)) continue;
    for (const candidate of taskSessionKeys(tab)) {
      const existing = candidates.get(candidate.key);
      if (existing) existing.tabs.push(tab);
      else candidates.set(candidate.key, { ...candidate, tabs: [tab] });
    }
  }

  const validCandidates = Array.from(candidates.values())
    .map((candidate) => ({ ...candidate, tabs: dedupeTabs(candidate.tabs) }))
    .filter((candidate) => candidate.tabs.length >= 2 && hasCompactTimeSpan(candidate.tabs))
    .sort((a, b) => b.strength - a.strength || b.tabs.length - a.tabs.length || latestActivation(b.tabs) - latestActivation(a.tabs));

  for (const candidate of validCandidates) {
    const available = candidate.tabs.filter((tab) => !assignments.has(tab.id));
    if (available.length < 2) continue;
    const sessionId = `task-${hashText(candidate.key)}`;
    for (const tab of available) assignments.set(tab.id, sessionId);
  }

  return assignments;
}

function taskSessionKeys(tab: TabMemory) {
  const topics = tab.card.topics.map(normalizeSessionTerm).filter(isSpecificSessionTerm).slice(0, 3);
  const entities = tab.card.entities.map(normalizeSessionTerm).filter(isSpecificSessionTerm).slice(0, 4);
  const tags = [
    tab.card.taskContext,
    ...(tab.card.customTags ?? [])
  ].map(normalizeSessionTerm).filter(isSpecificSessionTerm).slice(0, 4);
  const domain = normalizeSessionTerm(tab.domain);
  const source = normalizeSessionTerm(tab.card.source);
  const keys: Array<{ key: string; strength: number }> = [];

  for (const tag of tags) keys.push({ key: `task:${tag}`, strength: 5 });
  for (const entity of entities) {
    for (const topic of topics) keys.push({ key: `entity-topic:${entity}:${topic}`, strength: 4 });
  }
  for (const topic of topics) {
    keys.push({ key: `domain-topic:${domain}:${topic}`, strength: 3 });
    if (source !== "direct") keys.push({ key: `source-topic:${source}:${topic}`, strength: 2 });
  }

  return keys;
}

function hasCompactTimeSpan(tabs: TabMemory[]) {
  const times = tabs.map((tab) => tab.openedAt);
  return Math.max(...times) - Math.min(...times) <= TASK_SESSION_MAX_SPAN_MS;
}

function latestActivation(tabs: TabMemory[]) {
  return Math.max(...tabs.map((tab) => tab.lastActivatedAt));
}

function dailyDigestTabScore(tab: TabMemory) {
  return (
    importanceWeight(tab.card.importance) * 120_000
    + Math.min(tab.signals.activeMs, 45 * 60 * 1000)
    + tab.signals.activationCount * 60_000
    + tab.signals.maxScrollPercent * 2_000
    + tab.signals.copiedTextCount * 90_000
  );
}

function normalizeSessionTerm(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isSpecificSessionTerm(value: string) {
  if (!value || GENERIC_SESSION_TERMS.has(value)) return false;
  return value.length >= 2;
}

function createSoloSessionId(tab: TabMemory) {
  return `solo-${tab.id}`;
}

function createFallbackSessionId(now: number, windowId?: number) {
  const bucket = Math.floor(now / (4 * 60 * 60 * 1000));
  return `session-${windowId ?? "w"}-${bucket}`;
}

function hashText(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(now: number) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function dayMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function importanceWeight(importance: string) {
  return { must: 6, should: 4, maybe: 2, safe: 0 }[importance] ?? 0;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}
