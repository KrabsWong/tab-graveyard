export type Importance = "must" | "should" | "maybe" | "safe";
export type ReadingStatus = "fully-read" | "skimmed" | "bounced";
export type ContentType = "article" | "video" | "pdf" | "tweet" | "repo" | "doc" | "image" | "saas";
export type SourceType = "twitter" | "slack" | "email" | "search" | "direct" | "bookmark";
export type AiMode = "smart" | "local-first" | "local-only";
export type LanguageMode = "system" | "en" | "zh";
export type ThemeMode = "system" | "light" | "dark";
export type ArchiveTrustStage = "manual" | "preview" | "auto";
export type BrowseGroupMode = "date" | "session" | "source" | "entity";

export type TabInfoCard = {
  summary: string;
  topics: string[];
  entities: string[];
  contentType: ContentType;
  source: SourceType;
  readingStatus: ReadingStatus;
  importance: Importance;
  color: string;
  possibleQueries: string[];
  bilingualTopics: string[];
  fingerprint: string;
  taskContext?: string;
  customTags?: string[];
  userEdited?: boolean;
  userEditedAt?: number;
  aiEnhanced?: boolean;
  aiEnhancedAt?: number;
};

export type BehaviorSignals = {
  activeMs: number;
  activationCount: number;
  maxScrollPercent: number;
  copiedTextCount: number;
  lastCopiedAt?: number;
  referrerUrl?: string;
  openerTabId?: number;
  closeWithin10s?: boolean;
  restoreClicks: number;
  resurfaceShown: number;
  resurfaceDismissed: number;
  resurfaceOpened: number;
};

export type TabMemory = {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  domain: string;
  openedAt: number;
  lastActivatedAt: number;
  windowId?: number;
  tabId?: number;
  index?: number;
  pinned: boolean;
  audible: boolean;
  archived: boolean;
  archivedAt?: number;
  restored: boolean;
  restoredAt?: number;
  sessionId: string;
  card: TabInfoCard;
  signals: BehaviorSignals;
};

export type SessionMemory = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tabIds: string[];
  topics: string[];
  sourceHint: string;
  userNamed?: boolean;
  aiNamed?: boolean;
  aiNamedAt?: number;
};

export type UserRule = {
  id: string;
  scope: "domain" | "source" | "contentType";
  value: string;
  patch: Partial<Pick<TabInfoCard, "importance" | "readingStatus" | "contentType" | "source">> & {
    topics?: string[];
    customTags?: string[];
  };
  createdAt: number;
  updatedAt: number;
};

export type ArchivePreview = {
  id: string;
  createdAt: number;
  expiresAt: number;
  tabIds: string[];
};

export type ResurfaceRule = {
  maxPerDay: number;
  cooldownHours: number;
};

export type Settings = {
  recordingPaused: boolean;
  aiMode: AiMode;
  language: LanguageMode;
  theme: ThemeMode;
  deepSeek: DeepSeekSettings;
  strictPrivacy: boolean;
  ghostThresholdHours: number;
  newTabEnabled: boolean;
  resurfaceEnabled: boolean;
  resurfaceRule: ResurfaceRule;
  archiveTrustStage: ArchiveTrustStage;
  archivePreannounce: boolean;
  leaderboardEnabled: boolean;
  blacklistDomains: string[];
  onboardingComplete: boolean;
};

export type DeepSeekSettings = {
  enabled: boolean;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type GraveyardState = {
  tabs: TabMemory[];
  sessions: SessionMemory[];
  settings: Settings;
  lastUndo?: UndoArchive;
  archivePreview?: ArchivePreview;
  rules: UserRule[];
  events: AnalyticsEvent[];
};

export type UndoArchive = {
  id: string;
  expiresAt: number;
  tabs: TabMemory[];
};

export type AnalyticsEvent = {
  type: string;
  createdAt: number;
  meta?: Record<string, string | number | boolean>;
};

export type RecallFilters = {
  time?: "today" | "yesterday" | "week" | "last-week" | "all";
  source?: SourceType | "all";
  contentType?: ContentType | "all";
  importance?: Importance | "all";
  readingStatus?: ReadingStatus | "all";
  color?: string;
  topic?: string;
  entity?: string;
  archivedOnly?: boolean;
};

export type RecallResult = TabMemory & {
  score: number;
  matchedCues: string[];
};

export type GraveyardGroup = {
  key: string;
  label: string;
  tabs: TabMemory[];
};

export type AppSnapshot = {
  tabs: TabMemory[];
  sessions: SessionMemory[];
  settings: Settings;
  ghostTabs: TabMemory[];
  archivedTabs: TabMemory[];
  totalTabs: number;
  todayCount: number;
  yesterdayCount: number;
  recapTitle: string;
  lastUndo?: UndoArchive;
  archivePreview?: ArchivePreview;
  rules: UserRule[];
  events: AnalyticsEvent[];
};

export type ExtensionRequest =
  | { type: "getSnapshot" }
  | { type: "archiveGhosts" }
  | { type: "undoArchive" }
  | { type: "restoreTab"; tabId: string; inWindow?: boolean }
  | { type: "restoreSession"; sessionId: string }
  | { type: "deleteTab"; tabId: string }
  | { type: "updateTabCard"; tabId: string; card: Partial<TabInfoCard>; saveRule?: boolean }
  | { type: "renameSession"; sessionId: string; name: string }
  | { type: "splitSession"; sessionId: string; tabIds: string[] }
  | { type: "mergeSessions"; sessionIds: string[]; name?: string }
  | { type: "previewArchive" }
  | { type: "confirmArchivePreview"; previewId: string }
  | { type: "contentSignal"; tabId?: number; url: string; signal: Partial<BehaviorSignals> }
  | { type: "resurfaceAction"; tabIds: string[]; action: "shown" | "dismissed" | "opened" }
  | { type: "copyUrlTrigger"; url: string }
  | { type: "recall"; query: string; filters?: RecallFilters }
  | { type: "saveSettings"; settings: Partial<Settings> }
  | { type: "exportData" }
  | { type: "importData"; state: GraveyardState }
  | { type: "clearData" }
  | { type: "seedDemo" }
  | { type: "importHistory" }
  | { type: "testDeepSeek" }
  | { type: "enhanceWithDeepSeek" }
  | { type: "openUrl"; url: string }
  | { type: "openDashboard" };

export type DeepSeekEnhanceResult = {
  enhancedTabs: number;
  renamedSessions: number;
};

export type ExtensionResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};
