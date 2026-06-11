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
  previewImageUrl?: string;
  taskContext?: string;
  customTags?: string[];
  userEdited?: boolean;
  userEditedAt?: number;
  aiEnhanced?: boolean;
  aiEnhancedAt?: number;
  aiEnhancedSource?: "auto" | "manual";
  aiEnhanceFailedAt?: number;
  aiEnhanceFailureReason?: string;
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
  aiSummary?: RecallSynthesisResult;
  aiSummarySourceHash?: string;
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
  includeGhostTabs: boolean;
};

export type Settings = {
  recordingPaused: boolean;
  aiMode: AiMode;
  language: LanguageMode;
  theme: ThemeMode;
  deepSeek: DeepSeekSettings;
  strictPrivacy: boolean;
  ghostThresholdHours: number;
  resurfaceEnabled: boolean;
  resurfaceRule: ResurfaceRule;
  archiveTrustStage: ArchiveTrustStage;
  archivePreannounce: boolean;
  leaderboardEnabled: boolean;
  blacklistDomains: string[];
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
  deletedUrls: string[];
  lastUndo?: UndoArchive;
  archivePreview?: ArchivePreview;
  rules: UserRule[];
  events: AnalyticsEvent[];
  dailyDigests: DailyDigest[];
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
  aiRankReason?: string;
  aiCues?: RecallCue[];
  aiClarifications?: string[];
  aiRecallStatus?: "enhanced" | "fallback";
  aiFallbackReason?: string;
  aiIntent?: string;
};

export type RecallCue = {
  type: "time" | "source" | "domain" | "topic" | "entity" | "contentType" | "readingStatus" | "importance" | "task" | "visual" | "keyword";
  label: string;
  value: string;
};

export type QuickRecallItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favIconUrl?: string;
  category: "active" | "ghost" | "archived" | "session";
  reason: string;
  aiEnhanced?: boolean;
};

export type RecallSynthesisResult = {
  summary: string;
  bullets: string[];
  gaps: string[];
  tabCount: number;
  topics: string[];
  generatedAt: number;
};

export type DailyDigest = {
  id: string;
  dateKey: string;
  presentationDateKey: string;
  sourceHash: string;
  generationSource: "ai" | "local";
  generatedAt: number;
  tipShownAt?: number;
  viewedAt?: number;
  dismissedAt?: number;
  tabIds: string[];
  tabCount: number;
  summary: string;
  themes: string[];
  insights: string[];
  suggestions: string[];
  reflectionQuestions: string[];
  gaps: string[];
};

export type DailyDigestResponse = {
  status: "idle" | "generating" | "ready" | "error";
  targetDateKey: string;
  tabCount: number;
  digest?: DailyDigest;
  history: DailyDigest[];
  shouldNotify: boolean;
  generated?: boolean;
  error?: string;
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
  dailyDigests: DailyDigest[];
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
  | { type: "archiveTab"; tabId: string }
  | { type: "unarchiveTab"; tabId: string }
  | { type: "undoArchive" }
  | { type: "restoreTab"; tabId: string; inWindow?: boolean }
  | { type: "restoreSession"; sessionId: string }
  | { type: "deleteTab"; tabId: string }
  | { type: "updateTabCard"; tabId: string; card: Partial<TabInfoCard>; saveRule?: boolean }
  | { type: "renameSession"; sessionId: string; name: string }
  | { type: "splitSession"; sessionId: string; tabIds: string[] }
  | { type: "mergeSessions"; sessionIds: string[]; name?: string }
  | { type: "previewArchive" }
  | { type: "cancelArchivePreview" }
  | { type: "confirmArchivePreview"; previewId: string }
  | { type: "contentSignal"; tabId?: number; url: string; signal: Partial<BehaviorSignals> }
  | { type: "pageMetadata"; tabId?: number; url: string; metadata: { previewImageUrl?: string } }
  | { type: "resurfaceAction"; tabIds: string[]; action: "shown" | "dismissed" | "opened" }
  | { type: "copyUrlTrigger"; url: string }
  | { type: "recall"; query: string; filters?: RecallFilters }
  | { type: "quickRecall"; query: string }
  | { type: "commandPaletteContext" }
  | { type: "summarizeRecall"; query: string; tabIds?: string[]; sessionId?: string }
  | { type: "getDailyDigest"; mode?: "auto" | "manual"; dateKey?: string }
  | { type: "ackDailyDigestTip"; digestId: string }
  | { type: "markDailyDigestViewed"; digestId: string }
  | { type: "dismissDailyDigestTip"; digestId: string }
  | { type: "saveSettings"; settings: Partial<Settings> }
  | { type: "exportData" }
  | { type: "importData"; state: GraveyardState }
  | { type: "clearData" }
  | { type: "importHistory" }
  | { type: "testDeepSeek" }
  | { type: "enhanceWithDeepSeek" }
  | { type: "getCloudAuthStatus" }
  | { type: "startGitHubAuth" }
  | { type: "pollGitHubAuth"; deviceCode: string }
  | { type: "clearCloudAuth" }
  | { type: "openUrl"; url: string }
  | { type: "openMemoryTab"; tabId: string }
  | { type: "openDashboard" };

export type DeepSeekEnhanceResult = {
  enhancedTabs: number;
  renamedSessions: number;
};

export type CloudAuthStatus = {
  provider: "github";
  authenticatedAt: number;
  expiresIn: number;
  user?: {
    login?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    followers?: number;
    following?: number;
  };
} | null;

export type GitHubDeviceAuthStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
};

export type GitHubDeviceAuthPoll =
  | { status: "pending"; interval?: number }
  | { status: "expired" }
  | { status: "denied" }
  | { status: "authorized"; auth: NonNullable<CloudAuthStatus> };

export type ExtensionResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};
