import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Archive, ArrowLeft, ArrowUpRight, Copy, Download, Edit3, Eye, EyeOff, FileUp, Ghost, HelpCircle, History, Layers, RotateCcw, Search, Settings, Sparkles, Trash2 } from "lucide-react";
import "./styles.css";
import { archiveGhosts, clearData, confirmArchivePreview, enhanceWithDeepSeek, exportData, getSnapshot, importData, importHistory, openDashboard, previewArchive, recall, renameSession, restoreSession, restoreTab, saveSettings, seedDemo, testDeepSeek, undoArchive, updateTabCard } from "@/lib/api";
import { buildWhyTip, formatTime, groupTabs } from "@/lib/memory";
import type { AppSnapshot, BrowseGroupMode, LanguageMode, RecallFilters, RecallResult, Settings as SettingsType, TabInfoCard, TabMemory, ThemeMode } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Page = "popup" | "newtab" | "dashboard" | "options";
type UiLanguage = "en" | "zh";

const messages = {
  en: {
    appName: "Tab Graveyard",
    tagline: "Closing tabs no longer means losing them.",
    loading: "Loading Tab Graveyard...",
    settings: "Settings",
    back: "Back",
    settingsGeneralTab: "General",
    settingsPrivacyTab: "Privacy",
    settingsAiTab: "AI",
    settingsRulesTab: "Rules",
    settingsDataTab: "Data",
    todayRecap: "Today's Recap",
    yesterdayRecap: "Yesterday {count} tabs. Standout: {title}.",
    total: "Total",
    ghost: "Ghost",
    today: "Today",
    searchPlaceholder: "Describe what you remember: time, source, color, topic...",
    search: "Search",
    popupSearchPlaceholder: "Describe what you remember...",
    popupRecallTop: "Recall Top 10",
    popupGhostTop: "Ghost Top 10",
    emptyList: "No items yet.",
    searching: "Searching...",
    resurfaceHint: "Resurface: related archived pages will appear while you browse.",
    undoArchive: "Undo last archive",
    archiveGhostTabs: "Archive {count} Ghost Tabs",
    archiveFailed: "Archive failed",
    openGraveyard: "Open Graveyard",
    continueMetric: "Continue where you left off",
    activeCount: "{count} active",
    ghostTabs: "Ghost Tabs",
    ghostTabsDescription: "Inactive tabs that look safe to archive.",
    ghostReason: "Ghost reason",
    matchedCues: "Matched cues",
    recallReason: "Recall match",
    archivedMemory: "Archived Memory",
    continueTitle: "Continue Where You Left Off",
    continueDescription: "Recently active tabs remain one click away.",
    activeSessions: "Active Sessions",
    sessionsDescription: "Conservative groups based on time, window, source, and topic.",
    tabs: "tabs",
    tabLabels: "Tags:",
    lastActive: "last active",
    restore: "Restore",
    restoreGroup: "Restore group",
    expand: "Expand",
    collapse: "Collapse",
    recall: "Recall",
    graveyard: "Graveyard",
    sessions: "Sessions",
    facets: "Facets",
    facetsDescription: "Filters apply to the visible results. Entry source is inferred locally from the URL or referrer-like signals.",
    time: "Time",
    source: "Entry source",
    type: "Type",
    contentType: "Type",
    readingStatus: "Reading",
    color: "Color",
    topic: "Topic",
    entity: "Entity",
    archivedOnly: "Archived only",
    noResults: "Nothing found. Try fewer cues, or browse Sessions.",
    page: "Page",
    status: "Status",
    importance: "Importance",
    activity: "Activity",
    actions: "Actions",
    opened: "Opened",
    from: "from",
    active: "active",
    archived: "archived",
    ghostStatus: "ghost",
    reopen: "Reopen",
    copy: "Copy",
    copied: "Link copied",
    copyFailed: "Copy failed",
    edit: "Edit",
    aiEnhanced: "AI enhanced",
    save: "Save",
    saveAsRule: "Apply to this domain",
    whyTip: "Why Tip",
    browseBy: "Browse by",
    timeline: "Timeline",
    groupSource: "Source",
    groupEntity: "Entity",
    groupSession: "Session",
    previewArchive: "Preview archive",
    confirmArchive: "Confirm archive",
    privacyMap: "Data & Privacy",
    privacyMapDescription: "What Tab Graveyard stores, skips, and may send to configured AI providers.",
    privacyLocalFields: "Stored locally",
    privacyLocalFieldsValue: "URL, title, domain, time, source, behavior signals",
    privacyNeverCaptured: "Never captured",
    privacyNeverCapturedValue: "Passwords, private form values, full page archives",
    privacyAiOutbound: "AI outbound",
    privacyAiOutboundValue: "Title, URL, domain, local card metadata",
    privacyAiDisabled: "Disabled",
    privacyRules: "Local corrections",
    privacyRulesValue: "{count} edited cards · local storage only",
    dataLog: "Data Log",
    leaderboard: "Leaderboard",
    localOnlyStub: "Local-only prototype: cloud sync and billing are not connected.",
    fieldGuide: "Field Guide",
    fieldGuideDescription: "These labels are inferred locally. Edit any card when a label is wrong.",
    contentTypeGuide: "Type: what kind of page this is, such as article, video, repo, doc, or SaaS.",
    sourceGuide: "Entry source: how this page entered your browsing flow, usually inferred from URL/referrer signals.",
    readingGuide: "Reading: fully read means strong reading evidence, skimmed means glanced or partial reading, bounced means quickly left.",
    importanceGuide: "Importance: must/should/maybe/safe estimates how risky it is to archive the page.",
    memoryMatch: "memory match",
    browserMemoryLocal: "Your browser memory stays local by default.",
    firstRun: "First Run",
    firstRunDescription: "Choose how Tab Graveyard should start building memory.",
    generalSettings: "General",
    generalSettingsDescription: "Language, appearance, archive behavior, and resurfacing defaults.",
    importHistory: "Import history",
    useDemo: "Use demo",
    startEmpty: "Start empty",
    privacyRecording: "Privacy & Recording",
    privacyDescription: "Local recording controls and privacy boundaries.",
    pauseRecording: "Pause recording",
    pauseRecordingDescription: "New tabs will not be added to Tab Memory, and resurfacing suggestions will not be shown.",
    strictPrivacy: "Strict privacy mode",
    strictPrivacyDescription: "Recall uses only local URL, title, time, source and behavior signals.",
    resurface: "Resurface",
    resurfaceDescription: "Show related archived pages while browsing.",
    resurfacePausedDescription: "Recording is paused, so resurfacing suggestions are also paused.",
    resurfacePausedNotice: "Pause recording is enabled in Privacy & Recording. Resurfacing settings will not take effect until recording is resumed.",
    resumeRecording: "Resume recording",
    resurfaceFrequency: "Resurface frequency",
    resurfaceCooldown: "Resurface cooldown",
    archiveTrust: "Archive trust stage",
    archivePreannounce: "Preannounce archive",
    archivePreannounceDescription: "Only applies when the archive trust stage is Auto. Creates an in-app pending archive preview with the Ghost Tabs that would be archived, then waits for confirmation.",
    language: "Language",
    languageDescription: "Use system language, Chinese, or English.",
    languageSystemDescription: "Follow Chrome or operating-system language when choosing the interface language.",
    languageChineseDescription: "Always show the interface in Chinese.",
    languageEnglishDescription: "Always show the interface in English.",
    theme: "Theme",
    themeDescription: "Use system appearance, light mode, or dark mode.",
    light: "Light",
    dark: "Dark",
    aiMode: "AI mode",
    aiModeDescription: "Controls whether configured AI providers may help with recall, summaries, and naming.",
    deepSeekProvider: "DeepSeek API",
    deepSeekDescription: "Configure an OpenAI-compatible DeepSeek endpoint. The key is stored locally and only used when AI enhancement is enabled or you test the connection.",
    deepSeekEnabled: "Enable DeepSeek",
    deepSeekEnabledDescription: "Allow Tab Graveyard to use DeepSeek for future AI-enhanced summaries and recall.",
    deepSeekApiKey: "API Key",
    deepSeekApiKeyDescription: "Stored in local browser storage. It is not uploaded anywhere except to your configured DeepSeek endpoint.",
    showApiKey: "Show API key",
    hideApiKey: "Hide API key",
    deepSeekModel: "Model",
    deepSeekModelDescription: "DeepSeek model name used for connection tests, memory enhancement, query expansion, and session naming.",
    deepSeekBaseUrl: "Base URL",
    deepSeekBaseUrlDescription: "OpenAI-compatible endpoint base URL. Keep the default unless you use a proxy or compatible gateway.",
    deepSeekTest: "Test connection",
    deepSeekTesting: "Testing...",
    deepSeekTestOk: "DeepSeek connected",
    deepSeekEnhance: "Enhance existing memory",
    deepSeekEnhancing: "Enhancing...",
    deepSeekEnhanceDescription: "Updates local info cards and session names using title, URL, domain, and existing local metadata only.",
    deepSeekEnhanceOk: "Enhanced {tabs} tabs and renamed {sessions} sessions",
    ghostThreshold: "Ghost threshold",
    ghostThresholdDescription: "How long a normal, low-risk tab must stay inactive before it can become a Ghost Tab.",
    ghostThresholdOption: "{hours} hours without activity before a tab can be considered a ghost.",
    archiveTrustDescription: "Main archive policy for Ghost Tabs: manual click, preview first, or automatic archive.",
    resurfaceFrequencyDescription: "Maximum number of archived-memory suggestions Tab Graveyard may show per day.",
    resurfaceFrequencyOption: "At most {count} resurfacing suggestions per day.",
    resurfaceCooldownDescription: "Minimum time between two resurfacing suggestions, even when more related archives match.",
    resurfaceCooldownOption: "Wait at least {hours} hours before showing another resurfacing suggestion.",
    domainBlacklist: "Domain Blacklist",
    blacklistDescription: "One domain, keyword, or wildcard per line. Example: *.abc.com blocks abc.com and all subdomains.",
    saveBlacklist: "Save blacklist",
    blacklistSaved: "Blacklist saved",
    actionFailed: "Action failed",
    dataExported: "Data exported",
    historyImported: "History imported",
    demoLoaded: "Demo workspace loaded",
    dataCleared: "Local memory cleared",
    dataPortability: "Data Portability",
    dataDescription: "Export, import, seed demo data, or clear local memory.",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    dataImported: "Data imported",
    import30dHistory: "Import 30d history",
    demoWorkspace: "Demo workspace",
    clearAll: "Clear all",
    importTitle: "Import Tab Graveyard Data",
    importDescription: "Paste a JSON export. Existing local data will be replaced.",
    import: "Import",
    all: "all",
    system: "System",
    english: "English",
    chinese: "中文"
  },
  zh: {
    appName: "Tab Graveyard",
    tagline: "关闭标签页，不再等于失去它们。",
    loading: "正在加载 Tab Graveyard...",
    settings: "设置",
    back: "返回",
    settingsGeneralTab: "通用",
    settingsPrivacyTab: "隐私",
    settingsAiTab: "AI",
    settingsRulesTab: "规则",
    settingsDataTab: "数据",
    todayRecap: "今日回顾",
    yesterdayRecap: "昨天打开了 {count} 个标签。最重要的是：{title}。",
    total: "总数",
    ghost: "幽灵",
    today: "今日",
    searchPlaceholder: "描述你记得的：时间、来源、颜色、主题...",
    search: "搜索",
    popupSearchPlaceholder: "描述你记得的内容...",
    popupRecallTop: "找回 Top 10",
    popupGhostTop: "幽灵标签 Top 10",
    emptyList: "暂无内容。",
    searching: "搜索中...",
    resurfaceHint: "主动唤醒：浏览时会提示相关的归档页面。",
    undoArchive: "撤销上次归档",
    archiveGhostTabs: "归档 {count} 个幽灵标签",
    archiveFailed: "归档失败",
    openGraveyard: "打开 Graveyard",
    continueMetric: "继续上次浏览",
    activeCount: "{count} 个活跃",
    ghostTabs: "幽灵标签",
    ghostTabsDescription: "长时间不活跃、且看起来可安全归档的标签。",
    ghostReason: "幽灵判定",
    matchedCues: "匹配线索",
    recallReason: "找回命中",
    archivedMemory: "已归档记忆",
    continueTitle: "继续上次浏览",
    continueDescription: "最近活跃的标签会保留在这里，方便一键回到现场。",
    activeSessions: "活跃会话",
    sessionsDescription: "基于时间、窗口、来源和主题保守分组。",
    tabs: "个标签",
    tabLabels: "标签：",
    lastActive: "最近活跃",
    restore: "恢复",
    restoreGroup: "恢复整组",
    expand: "展开",
    collapse: "收起",
    recall: "找回",
    graveyard: "归档库",
    sessions: "会话",
    facets: "筛选",
    facetsDescription: "筛选会直接作用于当前结果。入口来源是根据 URL 或类似来源信号在本地推断的。",
    time: "时间",
    source: "入口来源",
    type: "类型",
    contentType: "类型",
    readingStatus: "阅读",
    color: "颜色",
    topic: "主题",
    entity: "实体",
    archivedOnly: "仅归档",
    noResults: "没找到。试试减少一个线索，或从会话里浏览。",
    page: "页面",
    status: "状态",
    importance: "重要度",
    activity: "活动",
    actions: "操作",
    opened: "打开于",
    from: "来源",
    active: "未归档",
    archived: "已归档",
    ghostStatus: "幽灵",
    reopen: "重新打开",
    copy: "复制",
    copied: "已复制链接",
    copyFailed: "复制失败",
    edit: "编辑",
    aiEnhanced: "AI 已增强",
    save: "保存",
    saveAsRule: "应用到该域名",
    whyTip: "为什么显示",
    browseBy: "浏览方式",
    timeline: "时间线",
    groupSource: "来源",
    groupEntity: "实体",
    groupSession: "会话",
    previewArchive: "预览归档",
    confirmArchive: "确认归档",
    privacyMap: "数据与隐私",
    privacyMapDescription: "说明 Tab Graveyard 会保存什么、不会记录什么，以及哪些信息可能发送给已配置的 AI 服务。",
    privacyLocalFields: "本地保存",
    privacyLocalFieldsValue: "URL、标题、域名、时间、来源、行为信号",
    privacyNeverCaptured: "不会记录",
    privacyNeverCapturedValue: "密码、私密表单内容、完整网页归档",
    privacyAiOutbound: "AI 外发",
    privacyAiOutboundValue: "标题、URL、域名、本地信息卡元数据",
    privacyAiDisabled: "已关闭",
    privacyRules: "本地修正",
    privacyRulesValue: "{count} 张已编辑信息卡 · 仅本地存储",
    dataLog: "数据日志",
    leaderboard: "排行榜",
    localOnlyStub: "本地原型：云同步和计费后端未连接。",
    fieldGuide: "字段说明",
    fieldGuideDescription: "这些标签由本地规则或 AI 增强推断。如果不准，可以编辑信息卡修正。",
    contentTypeGuide: "类型：页面内容类别，例如文章、视频、代码仓库、文档或 SaaS 页面。",
    sourceGuide: "入口来源：页面是如何进入浏览流程的，通常由 URL、referrer 等信号推断。",
    readingGuide: "阅读：读完表示有较强阅读证据，略读表示只浏览了一部分，跳出表示很快离开。",
    importanceGuide: "重要度：must/should/maybe/safe 用来估计归档这个页面的风险。",
    memoryMatch: "记忆匹配",
    browserMemoryLocal: "你的浏览记忆默认只保存在本地。",
    firstRun: "首次启动",
    firstRunDescription: "选择 Tab Graveyard 如何开始建立记忆。",
    generalSettings: "通用设置",
    generalSettingsDescription: "界面语言、主题外观、归档行为和主动唤醒默认值。",
    importHistory: "导入历史",
    useDemo: "使用示例",
    startEmpty: "从零开始",
    privacyRecording: "隐私与记录",
    privacyDescription: "本地记录控制与隐私边界。",
    pauseRecording: "暂停记录",
    pauseRecordingDescription: "新的标签不会加入 Tab Memory，也不会展示主动唤醒提示。",
    strictPrivacy: "严格隐私模式",
    strictPrivacyDescription: "找回仅使用本地 URL、标题、时间、来源和行为信号。",
    resurface: "主动唤醒",
    resurfaceDescription: "浏览时提示相关的历史归档页面。",
    resurfacePausedDescription: "当前已暂停记录，因此主动唤醒也会暂停。",
    resurfacePausedNotice: "隐私与记录中的暂停记录已开启。在恢复记录前，主动唤醒的所有配置都不会生效。",
    resumeRecording: "启动记录",
    resurfaceFrequency: "主动唤醒频率",
    resurfaceCooldown: "主动唤醒冷却间隔",
    archiveTrust: "归档信任阶段",
    archivePreannounce: "归档前预告",
    archivePreannounceDescription: "仅当归档信任阶段为自动时生效。自动归档前，会在应用内生成一条待确认的归档预览，列出将被归档的幽灵标签，确认后才执行。",
    language: "界面语言",
    languageDescription: "跟随系统，或固定为中文/英文。",
    languageSystemDescription: "根据 Chrome 或系统语言自动选择界面语言。",
    languageChineseDescription: "界面始终显示为中文。",
    languageEnglishDescription: "界面始终显示为英文。",
    theme: "主题模式",
    themeDescription: "跟随系统，或手动切换明亮/黑夜模式。",
    light: "明亮",
    dark: "黑夜",
    aiMode: "AI 模式",
    aiModeDescription: "控制已配置的 AI 是否可以参与找回、摘要增强和会话命名。",
    deepSeekProvider: "DeepSeek API",
    deepSeekDescription: "配置兼容 OpenAI 格式的 DeepSeek 接口。API Key 保存在本地，只会在启用 AI 增强或手动测试连接时使用。",
    deepSeekEnabled: "启用 DeepSeek",
    deepSeekEnabledDescription: "允许 Tab Graveyard 后续用 DeepSeek 做 AI 摘要和增强找回。",
    deepSeekApiKey: "API Key",
    deepSeekApiKeyDescription: "保存在浏览器本地存储中。除你配置的 DeepSeek 接口外，不会上传到其他地方。",
    showApiKey: "显示 API Key",
    hideApiKey: "隐藏 API Key",
    deepSeekModel: "模型",
    deepSeekModelDescription: "用于连接测试、记忆增强、查询扩展和会话命名的 DeepSeek 模型名。",
    deepSeekBaseUrl: "Base URL",
    deepSeekBaseUrlDescription: "兼容 OpenAI 格式的接口地址。除非使用代理或兼容网关，否则保持默认即可。",
    deepSeekTest: "测试连接",
    deepSeekTesting: "测试中...",
    deepSeekTestOk: "DeepSeek 已连接",
    deepSeekEnhance: "增强现有记忆",
    deepSeekEnhancing: "增强中...",
    deepSeekEnhanceDescription: "只使用标题、URL、域名和现有本地信息卡，更新信息卡和会话命名。",
    deepSeekEnhanceOk: "已增强 {tabs} 个标签，并重命名 {sessions} 个会话",
    ghostThreshold: "幽灵阈值",
    ghostThresholdDescription: "普通低风险标签需要多久未活跃，才可能被判定为幽灵标签。",
    ghostThresholdOption: "连续 {hours} 小时未活跃后，标签才可能进入幽灵标签。",
    archiveTrustDescription: "幽灵标签的主归档策略：手动点击、先预览，或自动归档。",
    resurfaceFrequencyDescription: "每天最多展示多少次归档记忆的主动唤醒提示。",
    resurfaceFrequencyOption: "每天最多展示 {count} 次主动唤醒提示。",
    resurfaceCooldownDescription: "两次主动唤醒之间至少间隔多久，即使命中了更多相关归档也不会连续弹出。",
    resurfaceCooldownOption: "至少等待 {hours} 小时后，才会展示下一次主动唤醒提示。",
    domainBlacklist: "域名黑名单",
    blacklistDescription: "每行一个域名、关键词或通配符。例如：*.abc.com 会屏蔽 abc.com 及所有子域名。",
    saveBlacklist: "保存黑名单",
    blacklistSaved: "黑名单已保存",
    actionFailed: "操作失败",
    dataExported: "数据已导出",
    historyImported: "历史记录已导入",
    demoLoaded: "示例工作区已载入",
    dataCleared: "本地记忆已清空",
    dataPortability: "数据迁移",
    dataDescription: "导出、导入、使用示例数据，或清空本地记忆。",
    exportJson: "导出 JSON",
    importJson: "导入 JSON",
    dataImported: "数据已导入",
    import30dHistory: "导入 30 天历史",
    demoWorkspace: "示例工作区",
    clearAll: "清空全部",
    importTitle: "导入 Tab Graveyard 数据",
    importDescription: "粘贴 JSON 导出内容。现有本地数据会被替换。",
    import: "导入",
    all: "全部",
    system: "跟随系统",
    english: "English",
    chinese: "中文"
  }
} as const;

type Text = Record<keyof typeof messages.en, string>;

const I18nContext = React.createContext<{ language: UiLanguage; t: Text } | null>(null);
const ToastContext = React.createContext<((message: string) => void) | null>(null);

function useI18n() {
  const value = React.useContext(I18nContext);
  if (!value) return { language: "en" as const, t: messages.en };
  return value;
}

function useToast() {
  return React.useContext(ToastContext) ?? (() => undefined);
}

function resolveLanguage(mode: LanguageMode): UiLanguage {
  if (mode === "zh" || mode === "en") return mode;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function resolveTheme(mode: ThemeMode) {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

type EnumKind = "source" | "contentType" | "importance" | "readingStatus" | "aiMode" | "archiveTrust" | "time" | "theme";

const enumText: Record<EnumKind, Record<string, { en: string; zh: string; enDescription: string; zhDescription: string }>> = {
  source: {
    twitter: { en: "Twitter/X", zh: "Twitter/X", enDescription: "Likely entered from Twitter/X links.", zhDescription: "可能来自 Twitter/X 链接。" },
    slack: { en: "Slack", zh: "Slack", enDescription: "Likely entered from Slack.", zhDescription: "可能来自 Slack。" },
    email: { en: "Email", zh: "邮件", enDescription: "Likely entered from email.", zhDescription: "可能来自邮件。" },
    search: { en: "Search", zh: "搜索", enDescription: "Likely entered from search.", zhDescription: "可能来自搜索。" },
    direct: { en: "Direct", zh: "直接访问", enDescription: "No specific source signal was found.", zhDescription: "没有识别到更明确的入口来源。" },
    bookmark: { en: "Bookmark", zh: "书签", enDescription: "Likely opened from a saved bookmark.", zhDescription: "可能来自书签。" }
  },
  contentType: {
    article: { en: "Article", zh: "文章", enDescription: "Long-form or normal web article.", zhDescription: "普通文章或长文本页面。" },
    video: { en: "Video", zh: "视频", enDescription: "Video page.", zhDescription: "视频页面。" },
    pdf: { en: "PDF", zh: "PDF", enDescription: "PDF document.", zhDescription: "PDF 文档。" },
    tweet: { en: "Post", zh: "帖子", enDescription: "Social post or thread.", zhDescription: "社交媒体帖子或串文。" },
    repo: { en: "Repo", zh: "代码仓库", enDescription: "Code repository.", zhDescription: "代码仓库。" },
    doc: { en: "Doc", zh: "文档", enDescription: "Document or workspace note.", zhDescription: "文档或工作区笔记。" },
    image: { en: "Image", zh: "图片", enDescription: "Image page.", zhDescription: "图片页面。" },
    saas: { en: "SaaS", zh: "产品页", enDescription: "Product, app, or SaaS page.", zhDescription: "产品、应用或 SaaS 页面。" }
  },
  importance: {
    must: { en: "Must keep", zh: "必须保留", enDescription: "High-risk to archive automatically.", zhDescription: "自动归档风险高。" },
    should: { en: "Should keep", zh: "建议保留", enDescription: "Probably useful later.", zhDescription: "后续可能有用。" },
    maybe: { en: "Maybe", zh: "可能有用", enDescription: "Unclear value, keep searchable.", zhDescription: "价值不确定，但应可找回。" },
    safe: { en: "Safe", zh: "可安全归档", enDescription: "Low-risk to archive.", zhDescription: "归档风险较低。" }
  },
  readingStatus: {
    "fully-read": { en: "Read through", zh: "读完", enDescription: "Strong evidence of deep reading.", zhDescription: "有较强的深度阅读证据。" },
    skimmed: { en: "Skimmed", zh: "略读", enDescription: "Viewed, but not enough evidence of full reading.", zhDescription: "看过，但没有足够证据说明读完。" },
    bounced: { en: "Bounced", zh: "跳出", enDescription: "Opened briefly or left quickly.", zhDescription: "打开后很快离开。" }
  },
  aiMode: {
    smart: { en: "Smart", zh: "智能", enDescription: "Use configured AI when allowed.", zhDescription: "在允许时使用已配置的 AI。" },
    "local-first": { en: "Local first", zh: "本地优先", enDescription: "Prefer local memory, use AI only when enabled.", zhDescription: "优先使用本地记忆，仅在启用时使用 AI。" },
    "local-only": { en: "Local only", zh: "仅本地", enDescription: "Never send metadata to AI providers.", zhDescription: "不向 AI 服务发送元数据。" }
  },
  archiveTrust: {
    manual: { en: "Manual", zh: "手动", enDescription: "Archive only after explicit click.", zhDescription: "只在明确点击后归档。" },
    preview: { en: "Preview", zh: "先预览", enDescription: "Create a preview before archiving.", zhDescription: "归档前先生成预览。" },
    auto: { en: "Auto", zh: "自动", enDescription: "Can archive ghost tabs automatically.", zhDescription: "可自动归档幽灵标签。" }
  },
  time: {
    all: { en: "All", zh: "全部", enDescription: "No time filter.", zhDescription: "不限制时间。" },
    today: { en: "Today", zh: "今天", enDescription: "Opened or active today.", zhDescription: "今天打开或活跃。" },
    yesterday: { en: "Yesterday", zh: "昨天", enDescription: "Opened yesterday.", zhDescription: "昨天打开。" },
    week: { en: "This week", zh: "最近一周", enDescription: "Active within seven days.", zhDescription: "最近七天内活跃。" },
    "last-week": { en: "Last week", zh: "上周", enDescription: "Opened in the previous week bucket.", zhDescription: "上一个周区间打开。" }
  },
  theme: {
    system: { en: "System", zh: "跟随系统", enDescription: "Follow OS appearance.", zhDescription: "跟随系统外观。" },
    light: { en: "Light", zh: "明亮", enDescription: "Force light mode.", zhDescription: "固定明亮模式。" },
    dark: { en: "Dark", zh: "黑夜", enDescription: "Force dark mode.", zhDescription: "固定黑夜模式。" }
  }
};

function enumMeta(kind: EnumKind, value: string, language: UiLanguage) {
  const meta = enumText[kind][value];
  if (!meta) return { label: value, description: value };
  return { label: meta[language], description: language === "zh" ? meta.zhDescription : meta.enDescription };
}

function enumOptions(kind: EnumKind, values: string[], language: UiLanguage) {
  return values.map((value) => {
    const meta = enumMeta(kind, value, language);
    return { value, label: meta.label, description: meta.description };
  });
}

function getDashboardTabFromHash() {
  const value = window.location.hash.replace("#", "");
  return ["recall", "ghosts", "graveyard", "sessions"].includes(value) ? value : "recall";
}

function navigateDashboard(tab: "ghosts" | "graveyard" | "sessions" | "recall") {
  const path = `dashboard.html#${tab}`;
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    window.location.href = chrome.runtime.getURL(path);
    return;
  }
  window.location.href = path;
}

function App() {
  const page = (document.body.dataset.page as Page) ?? "dashboard";
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setSnapshot(await getSnapshot());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const themeMode = snapshot?.settings.theme ?? "system";
  useEffect(() => {
    const applyTheme = () => {
      const resolved = resolveTheme(themeMode);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.style.colorScheme = resolved;
    };
    applyTheme();
    if (themeMode !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  if (!snapshot) {
    return <div className={page === "popup" ? "popup-body p-4" : "min-h-screen p-6"}>Loading Tab Graveyard...</div>;
  }

  const language = resolveLanguage(snapshot.settings.language);
  const t = messages[language];
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  return (
    <I18nContext.Provider value={{ language, t }}>
      <ToastContext.Provider value={notify}>
        {page === "popup" ? <Popup snapshot={snapshot} refresh={refresh} error={error} /> : null}
        {page === "options" ? <SettingsPage snapshot={snapshot} refresh={refresh} /> : null}
        {page === "newtab" || page === "dashboard" ? <Workspace page={page} snapshot={snapshot} refresh={refresh} /> : null}
        {toast ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-lg">{toast}</div> : null}
      </ToastContext.Provider>
    </I18nContext.Provider>
  );
}

function Popup({ snapshot, refresh, error }: { snapshot: AppSnapshot; refresh: () => Promise<void>; error: string | null }) {
  const { t } = useI18n();
  const ghostIds = useMemo(() => new Set(snapshot.ghostTabs.map((tab) => tab.id)), [snapshot.ghostTabs]);
  const recallTop = useMemo(
    () => snapshot.tabs
      .filter((tab) => !tab.archived && !ghostIds.has(tab.id))
      .sort((a, b) => b.lastActivatedAt - a.lastActivatedAt)
      .slice(0, 10),
    [ghostIds, snapshot.tabs]
  );
  const recallCount = useMemo(
    () => snapshot.tabs.filter((tab) => !tab.archived && !ghostIds.has(tab.id)).length,
    [ghostIds, snapshot.tabs]
  );
  const ghostTop = useMemo(
    () => [...snapshot.ghostTabs].sort((a, b) => a.lastActivatedAt - b.lastActivatedAt).slice(0, 10),
    [snapshot.ghostTabs]
  );

  return (
    <main className="popup-body flex flex-col gap-3 overflow-x-hidden p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t.appName}</h1>
          <p className="text-xs text-muted-foreground">{t.tagline}</p>
        </div>
        <Button variant="ghost" size="icon" title={t.settings} onClick={() => chrome.runtime.openOptionsPage()}>
          <Settings className="h-4 w-4" />
        </Button>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{error}</p> : null}

      <div className="grid grid-cols-3 gap-2">
        <Metric label={t.recall} value={recallCount} />
        <Metric label={t.ghost} value={snapshot.ghostTabs.length} />
        <Metric label={t.today} value={snapshot.todayCount} />
      </div>

      <Tabs defaultValue="recall" className="grid min-w-0 gap-2">
        <TabsList className="grid h-10 w-full min-w-0 grid-cols-2 overflow-hidden p-1">
          <TabsTrigger value="recall" className="h-full min-w-0 gap-1 overflow-hidden px-2">{t.recall} <TabCount value={recallCount} /></TabsTrigger>
          <TabsTrigger value="ghosts" className="h-full min-w-0 gap-1 overflow-hidden px-2">{t.ghostTabs} <TabCount value={snapshot.ghostTabs.length} /></TabsTrigger>
        </TabsList>
        <TabsContent value="recall" className="mt-0">
          <PopupTopList tabs={recallTop} refresh={refresh} />
        </TabsContent>
        <TabsContent value="ghosts" className="mt-0">
          <PopupTopList tabs={ghostTop} refresh={refresh} />
        </TabsContent>
      </Tabs>

      {snapshot.lastUndo ? (
        <Button
          variant="secondary"
          onClick={async () => {
            await undoArchive();
            await refresh();
          }}
        >
          <RotateCcw className="h-4 w-4" /> {t.undoArchive}
        </Button>
      ) : null}

      <Button variant="outline" onClick={() => openDashboard()}>
        <ArrowUpRight className="h-4 w-4" /> {t.openGraveyard}
      </Button>
    </main>
  );
}

function Workspace({ page, snapshot, refresh }: { page: Page; snapshot: AppSnapshot; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [filters, setFilters] = useState<RecallFilters>({ archivedOnly: false, time: "all", source: "all", contentType: "all", importance: "all", readingStatus: "all", color: "all", topic: "all", entity: "all" });
  const [results, setResults] = useState<RecallResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const next = await recall(submittedQuery, filters);
        if (!cancelled) setResults(next);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [submittedQuery, filters, snapshot.tabs]);

  const submitSearch = () => {
    setResults([]);
    setSubmittedQuery(query.trim());
  };

  const continueTabs = useMemo(() => snapshot.tabs.filter((tab) => !tab.archived).sort((a, b) => b.lastActivatedAt - a.lastActivatedAt), [snapshot.tabs]);

  return (
    <main className="min-h-screen">
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">{t.appName}</h1>
              <p className="text-sm text-muted-foreground">{t.tagline}</p>
            </div>
            <div className="flex gap-2">
              <FieldGuideDialog />
              <Button variant="outline" onClick={() => chrome.runtime.openOptionsPage()}>
                <Settings className="h-4 w-4" /> {t.settings}
              </Button>
            </div>
          </header>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              className="h-12 pl-12 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder={t.searchPlaceholder}
            />
            </div>
            <Button className="h-12 px-5" disabled={isSearching} onClick={submitSearch}>
              <Search className="h-4 w-4" /> {isSearching ? `${t.search}...` : t.search}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-6">
        <Dashboard snapshot={snapshot} results={results} query={submittedQuery} filters={filters} setFilters={setFilters} refresh={refresh} isSearching={isSearching} />
      </section>
    </main>
  );
}

function NewTabHome({ snapshot, continueTabs, refresh }: { snapshot: AppSnapshot; continueTabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<History className="h-4 w-4" />} title={t.continueMetric} value={interpolate(t.activeCount, { count: continueTabs.length })} onClick={() => document.getElementById("continue-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        <MetricCard icon={<Ghost className="h-4 w-4" />} title={t.ghostTabs} value={String(snapshot.ghostTabs.length)} onClick={() => navigateDashboard("ghosts")} />
        <MetricCard icon={<Archive className="h-4 w-4" />} title={t.archivedMemory} value={String(snapshot.archivedTabs.length)} onClick={() => navigateDashboard("graveyard")} />
      </div>
      <section id="continue-tabs">
        <SectionHeader title={t.continueTitle} description={t.continueDescription} />
        <TabList tabs={continueTabs} refresh={refresh} />
      </section>
      <section>
        <SectionHeader title={t.activeSessions} description={t.sessionsDescription} />
        <div className="grid gap-3">
          {snapshot.sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{session.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.tabIds.length} {t.tabs} · {t.lastActive} {formatTime(session.updatedAt, Date.now(), language)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => restoreSession(session.id)}>
                  {t.restore}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Dashboard({
  snapshot,
  results,
  query,
  filters,
  setFilters,
  refresh,
  isSearching
}: {
  snapshot: AppSnapshot;
  results: RecallResult[];
  query: string;
  filters: RecallFilters;
  setFilters: React.Dispatch<React.SetStateAction<RecallFilters>>;
  refresh: () => Promise<void>;
  isSearching: boolean;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(() => getDashboardTabFromHash());
  useEffect(() => {
    const handleHash = () => setActiveTab(getDashboardTabFromHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);
  const setDashboardTab = (value: string) => {
    setActiveTab(value);
    window.history.replaceState(null, "", `#${value}`);
  };
  const matchedIds = useMemo(() => new Set(results.map((tab) => tab.id)), [results]);
  const hasGlobalQuery = query.trim().length > 0;
  const scopedGhostTabs = hasGlobalQuery ? snapshot.ghostTabs.filter((tab) => matchedIds.has(tab.id)) : snapshot.ghostTabs;
  const scopedArchivedTabs = hasGlobalQuery ? results.filter((tab) => tab.archived) : snapshot.archivedTabs;
  const scopedSessions = hasGlobalQuery
    ? snapshot.sessions.filter((session) => session.tabIds.some((tabId) => matchedIds.has(tabId)))
    : snapshot.sessions;
  const ghostIds = useMemo(() => new Set(snapshot.ghostTabs.map((tab) => tab.id)), [snapshot.ghostTabs]);
  const scopedRecallResults = hasGlobalQuery ? results : results.filter((tab) => !tab.archived && !ghostIds.has(tab.id));
  const recallCount = hasGlobalQuery ? scopedRecallResults.length : snapshot.tabs.filter((tab) => !tab.archived && !ghostIds.has(tab.id)).length;
  return (
    <Tabs value={activeTab} onValueChange={setDashboardTab}>
      <TabsList>
        <TabsTrigger value="recall">{t.recall} <TabCount value={recallCount} /></TabsTrigger>
        <TabsTrigger value="ghosts">{t.ghostTabs} <TabCount value={scopedGhostTabs.length} /></TabsTrigger>
        <TabsTrigger value="graveyard">{t.graveyard} <TabCount value={scopedArchivedTabs.length} /></TabsTrigger>
        <TabsTrigger value="sessions">{t.sessions} <TabCount value={scopedSessions.length} /></TabsTrigger>
      </TabsList>
      <TabsContent value="recall">
        <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
          <Facets snapshot={snapshot} filters={filters} setFilters={setFilters} />
          <div className="grid auto-rows-min gap-3">
            <RecallSynthesis query={query} results={scopedRecallResults} snapshot={snapshot} isSearching={isSearching} />
            <ResultGrid results={scopedRecallResults} fallbackTabs={[]} refresh={refresh} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="ghosts">
        <GhostTabsPanel snapshot={snapshot} tabs={scopedGhostTabs} refresh={refresh} />
      </TabsContent>
      <TabsContent value="graveyard">
        <GraveyardBrowser tabs={scopedArchivedTabs} refresh={refresh} />
      </TabsContent>
      <TabsContent value="sessions">
        <SessionManager snapshot={snapshot} sessions={scopedSessions} visibleTabIds={hasGlobalQuery ? matchedIds : undefined} refresh={refresh} />
      </TabsContent>
    </Tabs>
  );
}

function TabCount({ value }: { value: number }) {
  return (
    <span className="ml-1 rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function RecallSynthesis({ query, results, snapshot, isSearching }: { query: string; results: RecallResult[]; snapshot: AppSnapshot; isSearching: boolean }) {
  const { language, t } = useI18n();
  if (!query.trim()) return null;
  if (isSearching) {
    return (
      <div className="flex min-h-9 self-start items-center rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <span className="font-medium">{t.searching}</span>
      </div>
    );
  }
  const topTopics = Array.from(new Set(results.flatMap((tab) => tab.card.topics))).slice(0, 4);
  const topSources = Array.from(new Set(results.map((tab) => enumMeta("source", tab.card.source, language).label))).slice(0, 3);
  const clarifications = ["twitter", "repo", "article", "yesterday", "pricing", "AI"].filter((cue) => !query.toLowerCase().includes(cue.toLowerCase())).slice(0, 2);
  return (
    <div className="flex min-h-9 self-start flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <span className="font-medium">{results.length ? `${results.length} ${t.memoryMatch}` : t.noResults}</span>
      <span className="min-w-0 truncate text-muted-foreground">
        {results.length
          ? `${topTopics.join(", ") || "general"} · ${topSources.join(", ") || "mixed"} · ${results.filter((tab) => tab.archived).length} archived`
          : `Memory contains ${snapshot.tabs.length} tabs.`}
      </span>
      {clarifications.map((cue) => <Badge key={cue} variant="outline">{cue}</Badge>)}
    </div>
  );
}

function GhostTabsPanel({ snapshot, tabs, refresh }: { snapshot: AppSnapshot; tabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const notify = useToast();
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader title={t.ghostTabs} description={t.ghostTabsDescription} />
        <Button
          disabled={!snapshot.ghostTabs.length}
          onClick={async () => {
            try {
              if (snapshot.settings.archiveTrustStage === "manual") await archiveGhosts();
              else await previewArchive();
              await refresh();
            } catch {
              notify(t.archiveFailed);
            }
          }}
        >
          <Ghost className="h-4 w-4" /> {snapshot.settings.archiveTrustStage === "manual" ? interpolate(t.archiveGhostTabs, { count: snapshot.ghostTabs.length }) : t.previewArchive}
        </Button>
      </div>
      {snapshot.archivePreview ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>{interpolate(t.archiveGhostTabs, { count: snapshot.archivePreview.tabIds.length })}</span>
          <Button
            size="sm"
            onClick={async () => {
              try {
                await confirmArchivePreview(snapshot.archivePreview!.id);
                await refresh();
              } catch {
                notify(t.archiveFailed);
              }
            }}
          >
            {t.confirmArchive}
          </Button>
        </div>
      ) : null}
      {tabs.length ? (
        <TabList tabs={tabs} refresh={refresh} reasonVariant="ghost" reasonResolver={(tab) => buildGhostReason(tab, snapshot, language, t)} />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{t.noResults}</CardContent>
        </Card>
      )}
    </div>
  );
}

function buildGhostReason(tab: TabMemory | RecallResult, snapshot: AppSnapshot, language: UiLanguage, t: Text) {
  const inactiveHours = Math.max(0, Math.floor((Date.now() - tab.lastActivatedAt) / (60 * 60 * 1000)));
  const threshold = snapshot.settings.ghostThresholdHours;
  const importance = enumMeta("importance", tab.card.importance, language).label;
  const parts =
    language === "zh"
      ? [`${inactiveHours} 小时未活跃`, `阈值 ${threshold} 小时`, tab.pinned ? "已置顶" : "未置顶", tab.audible ? "正在播放音频" : "无音频", `重要度 ${importance}`]
      : [`${inactiveHours}h inactive`, `threshold ${threshold}h`, tab.pinned ? "pinned" : "not pinned", tab.audible ? "playing audio" : "no audio", `importance ${importance}`];
  return `${t.ghostReason}: ${parts.join(" · ")}`;
}

function buildRecallReason(tab: TabMemory | RecallResult, language: UiLanguage, t: Text) {
  const matchedCues = "matchedCues" in tab ? tab.matchedCues.filter(Boolean).slice(0, 5) : [];
  const cues = matchedCues.length ? matchedCues.join(", ") : enumMeta("contentType", tab.card.contentType, language).label;
  const status = tab.archived ? t.archived : t.active;
  return `${t.recallReason}: ${t.matchedCues} ${cues} · ${t.status} ${status} · ${buildWhyTip(tab, language).replace(/^为什么显示：|^Why this appears: /, "")}`;
}

function GraveyardBrowser({ tabs, refresh }: { tabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const [mode, setMode] = useState<BrowseGroupMode>("date");
  const groups = useMemo(() => groupTabs(tabs, mode, language), [tabs, mode, language]);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t.browseBy}</span>
        {[
          ["date", t.timeline],
          ["source", t.groupSource],
          ["entity", t.groupEntity],
          ["session", t.groupSession]
        ].map(([value, label]) => (
          <Button key={value} size="sm" variant={mode === value ? "default" : "outline"} onClick={() => setMode(value as BrowseGroupMode)}>
            <Layers className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>
      {groups.map((group) => (
        <section key={group.key} className="grid gap-2">
          <h2 className="text-base font-semibold">{group.label} <span className="text-sm font-normal text-muted-foreground">({group.tabs.length})</span></h2>
          <TabList tabs={group.tabs} refresh={refresh} />
        </section>
      ))}
      {!groups.length ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{t.noResults}</CardContent></Card> : null}
    </div>
  );
}

function SessionManager({ snapshot, sessions, visibleTabIds, refresh }: { snapshot: AppSnapshot; sessions: AppSnapshot["sessions"]; visibleTabIds?: Set<string>; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string[]>([]);
  const toggleExpanded = (id: string) => setExpanded((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  return (
    <div className="overflow-hidden rounded-md border">
      {sessions.map((session) => {
        const sessionTabs = snapshot.tabs
          .filter((tab) => session.tabIds.includes(tab.id) && (!visibleTabIds || visibleTabIds.has(tab.id)))
          .sort((a, b) => b.lastActivatedAt - a.lastActivatedAt);
        return (
        <div key={session.id} className="border-b last:border-b-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => toggleExpanded(session.id)}>
              <span className="block truncate text-sm font-medium">{session.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {t.tabLabels} {session.topics.join(", ") || t.continueMetric}
              </span>
            </button>
            <div className="flex shrink-0 flex-wrap gap-2">
                <RenameSessionButton sessionId={session.id} currentName={session.name} refresh={refresh} />
                <Button size="sm" onClick={() => restoreSession(session.id)}>
                  <ArrowUpRight className="h-4 w-4" /> {t.restoreGroup}
                </Button>
            </div>
          </div>
          {expanded.includes(session.id) ? (
            <div className="border-t bg-muted/20 p-3">
              <TabList tabs={sessionTabs} refresh={refresh} />
            </div>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}

function Facets({ snapshot, filters, setFilters }: { snapshot: AppSnapshot; filters: RecallFilters; setFilters: React.Dispatch<React.SetStateAction<RecallFilters>> }) {
  const { language, t } = useI18n();
  const snapshotTopics = Array.from(new Set(snapshot.tabs.flatMap((tab) => tab.card.topics))).slice(0, 16);
  const snapshotEntities = Array.from(new Set(snapshot.tabs.flatMap((tab) => tab.card.entities))).slice(0, 16);
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>{t.facets}</CardTitle>
        <CardDescription>{t.facetsDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <SelectRow label={t.time} value={filters.time ?? "all"} options={enumOptions("time", ["all", "today", "yesterday", "week", "last-week"], language)} onChange={(time) => setFilters((prev) => ({ ...prev, time: time as RecallFilters["time"] }))} />
        <SelectRow label={t.source} value={filters.source ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("source", ["twitter", "slack", "email", "search", "direct", "bookmark"], language)]} onChange={(source) => setFilters((prev) => ({ ...prev, source: source as RecallFilters["source"] }))} />
        <SelectRow label={t.type} value={filters.contentType ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("contentType", ["article", "video", "pdf", "tweet", "repo", "doc", "image", "saas"], language)]} onChange={(contentType) => setFilters((prev) => ({ ...prev, contentType: contentType as RecallFilters["contentType"] }))} />
        <SelectRow label={t.importance} value={filters.importance ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("importance", ["must", "should", "maybe", "safe"], language)]} onChange={(importance) => setFilters((prev) => ({ ...prev, importance: importance as RecallFilters["importance"] }))} />
        <SelectRow label={t.readingStatus} value={filters.readingStatus ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("readingStatus", ["fully-read", "skimmed", "bounced"], language)]} onChange={(readingStatus) => setFilters((prev) => ({ ...prev, readingStatus: readingStatus as RecallFilters["readingStatus"] }))} />
        <SelectRow label={t.color} value={filters.color ?? "all"} options={["all", "blue", "black", "slate", "orange", "white", "purple"]} onChange={(color) => setFilters((prev) => ({ ...prev, color }))} />
        <SelectRow label={t.topic} value={filters.topic ?? "all"} options={["all", ...snapshotTopics]} onChange={(topic) => setFilters((prev) => ({ ...prev, topic }))} />
        <SelectRow label={t.entity} value={filters.entity ?? "all"} options={["all", ...snapshotEntities]} onChange={(entity) => setFilters((prev) => ({ ...prev, entity }))} />
        <label className="flex items-center justify-between rounded-md border p-2 text-sm">
          {t.archivedOnly}
          <Switch checked={Boolean(filters.archivedOnly)} onCheckedChange={(archivedOnly) => setFilters((prev) => ({ ...prev, archivedOnly }))} />
        </label>
      </CardContent>
    </Card>
  );
}

function ResultGrid({ results, fallbackTabs, refresh }: { results: RecallResult[]; fallbackTabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const tabs = results.length ? results : fallbackTabs.map((tab) => ({ ...tab, score: 0, matchedCues: [] }));
  if (!tabs.length) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{t.noResults}</CardContent></Card>;
  }
  return <TabList tabs={tabs} refresh={refresh} reasonVariant={results.length ? "recall" : "default"} reasonResolver={results.length ? (tab) => buildRecallReason(tab, language, t) : undefined} />;
}

function SettingsPage({ snapshot, refresh }: { snapshot: AppSnapshot; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const [blacklist, setBlacklist] = useState(snapshot.settings.blacklistDomains.join("\n"));
  const [deepSeekStatus, setDeepSeekStatus] = useState<string | null>(null);
  const [deepSeekTesting, setDeepSeekTesting] = useState(false);
  const [deepSeekEnhancing, setDeepSeekEnhancing] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");

  const update = async (settings: Partial<SettingsType>) => {
    await saveSettings(settings);
    await refresh();
  };

  const updateDeepSeek = async (deepSeek: Partial<SettingsType["deepSeek"]>) => {
    await update({ deepSeek: { ...snapshot.settings.deepSeek, ...deepSeek } });
  };

  const download = async () => {
    const state = await exportData();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tab-graveyard-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const runWithToast = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      notify(successMessage);
    } catch (error) {
      notify(error instanceof Error ? error.message : t.actionFailed);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-4xl content-start items-start gap-5 px-5 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.settings}</h1>
          <p className="text-sm text-muted-foreground">{t.browserMemoryLocal}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else void openDashboard();
          }}
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Button>
      </header>

      {!snapshot.settings.onboardingComplete ? <Onboarding refresh={refresh} /> : null}

      <Tabs
        value={settingsTab}
        onValueChange={(value) => {
          setSettingsTab(value);
          window.scrollTo(0, 0);
        }}
        className="w-full self-start"
      >
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="general">{t.settingsGeneralTab}</TabsTrigger>
          <TabsTrigger value="privacy">{t.settingsPrivacyTab}</TabsTrigger>
          <TabsTrigger value="ai">{t.settingsAiTab}</TabsTrigger>
          <TabsTrigger value="rules">{t.settingsRulesTab}</TabsTrigger>
          <TabsTrigger value="data">{t.settingsDataTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4 grid items-start gap-5">
      <Card>
        <CardContent className="grid gap-6 p-5">
          <SelectRow
            label={t.language}
            value={snapshot.settings.language}
            options={[
              { value: "system", label: t.system, description: t.languageSystemDescription },
              { value: "zh", label: t.chinese, description: t.languageChineseDescription },
              { value: "en", label: t.english, description: t.languageEnglishDescription }
            ]}
            description={t.languageDescription}
            showOptionDescription
            onChange={(language) => update({ language: language as SettingsType["language"] })}
          />
          <SelectRow
            label={t.theme}
            value={snapshot.settings.theme}
            options={enumOptions("theme", ["system", "light", "dark"], language)}
            description={t.themeDescription}
            showOptionDescription
            onChange={(theme) => update({ theme: theme as SettingsType["theme"] })}
          />
          <SelectRow
            label={t.ghostThreshold}
            value={String(snapshot.settings.ghostThresholdHours)}
            options={["12", "24", "48", "168"].map((hours) => ({ value: hours, label: `${hours}h`, description: interpolate(t.ghostThresholdOption, { hours }) }))}
            description={t.ghostThresholdDescription}
            showOptionDescription
            onChange={(value) => update({ ghostThresholdHours: Number(value) })}
          />
          <SettingGroup title={t.archiveTrust}>
            <SelectRow label={t.archiveTrust} value={snapshot.settings.archiveTrustStage} options={enumOptions("archiveTrust", ["manual", "preview", "auto"], language)} description={t.archiveTrustDescription} showOptionDescription onChange={(archiveTrustStage) => update({ archiveTrustStage: archiveTrustStage as SettingsType["archiveTrustStage"] })} />
            <ToggleRow
              label={t.archivePreannounce}
              description={t.archivePreannounceDescription}
              checked={snapshot.settings.archivePreannounce}
              disabled={snapshot.settings.archiveTrustStage !== "auto"}
              onChange={(archivePreannounce) => update({ archivePreannounce })}
            />
          </SettingGroup>
          <SettingGroup title={t.resurface}>
            {snapshot.settings.recordingPaused ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                <p className="min-w-0 flex-1 text-muted-foreground">{t.resurfacePausedNotice}</p>
                <Button size="sm" variant="outline" onClick={() => update({ recordingPaused: false })}>
                  {t.resumeRecording}
                </Button>
              </div>
            ) : null}
            <ToggleRow
              label={t.resurface}
              description={snapshot.settings.recordingPaused ? t.resurfacePausedDescription : t.resurfaceDescription}
              checked={snapshot.settings.resurfaceEnabled}
              disabled={snapshot.settings.recordingPaused}
              onChange={(resurfaceEnabled) => update({ resurfaceEnabled })}
            />
            <SelectRow
              label={t.resurfaceFrequency}
              value={String(snapshot.settings.resurfaceRule.maxPerDay)}
              options={["1", "3", "5"].map((count) => ({ value: count, label: count, description: interpolate(t.resurfaceFrequencyOption, { count }) }))}
              description={t.resurfaceFrequencyDescription}
              disabled={snapshot.settings.recordingPaused}
              showOptionDescription
              onChange={(value) => update({ resurfaceRule: { ...snapshot.settings.resurfaceRule, maxPerDay: Number(value) } })}
            />
            <SelectRow
              label={t.resurfaceCooldown}
              value={String(snapshot.settings.resurfaceRule.cooldownHours)}
              options={["1", "3", "6", "12", "24"].map((hours) => ({ value: hours, label: `${hours}h`, description: interpolate(t.resurfaceCooldownOption, { hours }) }))}
              description={t.resurfaceCooldownDescription}
              disabled={snapshot.settings.recordingPaused}
              showOptionDescription
              onChange={(value) => update({ resurfaceRule: { ...snapshot.settings.resurfaceRule, cooldownHours: Number(value) } })}
            />
          </SettingGroup>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4 grid items-start gap-5">
      <Card>
        <CardContent className="grid gap-6 p-5">
          <ToggleRow label={t.pauseRecording} description={t.pauseRecordingDescription} checked={snapshot.settings.recordingPaused} onChange={(recordingPaused) => update({ recordingPaused })} />
          <ToggleRow label={t.strictPrivacy} description={t.strictPrivacyDescription} checked={snapshot.settings.strictPrivacy} onChange={(strictPrivacy) => update({ strictPrivacy, aiMode: strictPrivacy ? "local-only" : snapshot.settings.aiMode })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.privacyMap}</CardTitle>
          <CardDescription>{t.privacyMapDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <PrivacyFact label={t.privacyLocalFields} value={t.privacyLocalFieldsValue} />
          <PrivacyFact label={t.privacyNeverCaptured} value={t.privacyNeverCapturedValue} />
          <PrivacyFact label={t.privacyAiOutbound} value={snapshot.settings.deepSeek.enabled && !snapshot.settings.strictPrivacy ? t.privacyAiOutboundValue : t.privacyAiDisabled} />
          <PrivacyFact label={t.privacyRules} value={interpolate(t.privacyRulesValue, { count: snapshot.tabs.filter((tab) => tab.card.userEdited).length })} />
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="ai" className="mt-4 grid items-start gap-5">
      <Card>
        <CardContent className="grid gap-6 p-5">
          <div>
            <CardTitle>{t.deepSeekProvider}</CardTitle>
            <CardDescription>{t.deepSeekDescription}</CardDescription>
          </div>
          <SelectRow
            label={t.aiMode}
            value={snapshot.settings.aiMode}
            options={enumOptions("aiMode", ["smart", "local-first", "local-only"], language)}
            description={t.aiModeDescription}
            showOptionDescription
            onChange={(aiMode) => update({ aiMode: aiMode as SettingsType["aiMode"], strictPrivacy: aiMode === "local-only" })}
          />
          <ToggleRow
            label={t.deepSeekEnabled}
            description={t.deepSeekEnabledDescription}
            checked={snapshot.settings.deepSeek.enabled}
            onChange={(enabled) => updateDeepSeek({ enabled })}
          />
          <TextRow
            label={t.deepSeekApiKey}
            description={t.deepSeekApiKeyDescription}
            type="password"
            value={snapshot.settings.deepSeek.apiKey}
            placeholder="sk-..."
            onChange={(apiKey) => updateDeepSeek({ apiKey })}
          />
          <TextRow
            label={t.deepSeekModel}
            description={t.deepSeekModelDescription}
            value={snapshot.settings.deepSeek.model}
            placeholder="deepseek-chat"
            onChange={(model) => updateDeepSeek({ model })}
          />
          <TextRow
            label={t.deepSeekBaseUrl}
            description={t.deepSeekBaseUrlDescription}
            value={snapshot.settings.deepSeek.baseUrl}
            placeholder="https://api.deepseek.com"
            onChange={(baseUrl) => updateDeepSeek({ baseUrl })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="w-fit"
              variant="outline"
              disabled={deepSeekTesting}
              onClick={async () => {
                setDeepSeekTesting(true);
                setDeepSeekStatus(null);
                try {
                  const result = await testDeepSeek();
                  setDeepSeekStatus(`${t.deepSeekTestOk}: ${result.model}${result.content ? ` · ${result.content}` : ""}`);
                } catch (error) {
                  setDeepSeekStatus(error instanceof Error ? error.message : String(error));
                } finally {
                  setDeepSeekTesting(false);
                }
              }}
            >
              {deepSeekTesting ? t.deepSeekTesting : t.deepSeekTest}
            </Button>
            <Button
              className="w-fit"
              disabled={deepSeekEnhancing}
              onClick={async () => {
                setDeepSeekEnhancing(true);
                setDeepSeekStatus(null);
                try {
                  const result = await enhanceWithDeepSeek();
                  setDeepSeekStatus(interpolate(t.deepSeekEnhanceOk, { tabs: result.enhancedTabs, sessions: result.renamedSessions }));
                  await refresh();
                } catch (error) {
                  setDeepSeekStatus(error instanceof Error ? error.message : String(error));
                } finally {
                  setDeepSeekEnhancing(false);
                }
              }}
            >
              <Sparkles className="h-4 w-4" /> {deepSeekEnhancing ? t.deepSeekEnhancing : t.deepSeekEnhance}
            </Button>
            {deepSeekStatus ? <span className="text-sm text-muted-foreground">{deepSeekStatus}</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">{t.deepSeekEnhanceDescription}</p>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="rules" className="mt-4 grid items-start gap-5">
      <Card>
        <CardContent className="grid gap-5 p-5">
          <div>
            <CardTitle>{t.domainBlacklist}</CardTitle>
            <CardDescription>{t.blacklistDescription}</CardDescription>
          </div>
          <textarea className="min-h-96 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={blacklist} onChange={(event) => setBlacklist(event.target.value)} />
          <Button className="w-fit" onClick={() => runWithToast(() => update({ blacklistDomains: blacklist.split("\n").map((item) => item.trim()).filter(Boolean) }), t.blacklistSaved)}>{t.saveBlacklist}</Button>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="data" className="mt-4 grid items-start gap-5">
      <Card>
        <CardContent className="grid gap-5 p-5">
          <div>
            <CardTitle>{t.dataPortability}</CardTitle>
            <CardDescription>{t.dataDescription}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runWithToast(download, t.dataExported)}><Download className="h-4 w-4" /> {t.exportJson}</Button>
            <ImportButton refresh={refresh} />
            <Button variant="outline" onClick={() => runWithToast(async () => { await importHistory(); await refresh(); }, t.historyImported)}><History className="h-4 w-4" /> {t.import30dHistory}</Button>
            <Button variant="outline" onClick={() => runWithToast(async () => { await seedDemo(); await refresh(); }, t.demoLoaded)}><Sparkles className="h-4 w-4" /> {t.demoWorkspace}</Button>
            <Button variant="destructive" onClick={() => runWithToast(async () => { await clearData(); await refresh(); }, t.dataCleared)}><Trash2 className="h-4 w-4" /> {t.clearAll}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dataLog}</CardTitle>
          <CardDescription>{snapshot.events.length} local events</CardDescription>
        </CardHeader>
        <CardContent className="max-h-56 overflow-auto text-xs">
          {snapshot.events.slice(-80).reverse().map((event) => (
            <div key={`${event.createdAt}-${event.type}`} className="grid gap-1 border-b py-2 md:grid-cols-[150px_150px_minmax(180px,1fr)_minmax(220px,1.2fr)] md:gap-3">
              <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
              <span className="font-medium">{formatEventType(event.type)}</span>
              <span className="truncate" title={eventMetaText(event, "title")}>{eventMetaText(event, "title") || eventMetaText(event, "domain") || "-"}</span>
              <span className="truncate text-muted-foreground" title={eventMetaText(event, "url") || eventMetaText(event, "urls") || JSON.stringify(event.meta ?? {})}>
                {eventMetaText(event, "url") || eventMetaText(event, "urls") || JSON.stringify(event.meta ?? {})}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.leaderboard}</CardTitle>
          <CardDescription>{t.localOnlyStub}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Metric label="Archived" value={snapshot.archivedTabs.length} />
          <Metric label="Restored" value={snapshot.tabs.reduce((sum, tab) => sum + tab.signals.restoreClicks, 0)} />
          <Metric label="Recall events" value={snapshot.events.filter((event) => event.type === "result_opened").length} />
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function PrivacyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium text-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function FieldGuideItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

function FieldGuideDialog() {
  const { t } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title={t.fieldGuide}>
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.fieldGuide}</DialogTitle>
          <DialogDescription>{t.fieldGuideDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <FieldGuideItem title={t.contentType} description={t.contentTypeGuide} />
          <FieldGuideItem title={t.source} description={t.sourceGuide} />
          <FieldGuideItem title={t.readingStatus} description={t.readingGuide} />
          <FieldGuideItem title={t.importance} description={t.importanceGuide} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function eventMetaText(event: { meta?: Record<string, string | number | boolean> }, key: string) {
  const value = event.meta?.[key];
  return value == null ? "" : String(value);
}

function formatEventType(type: string) {
  const labels: Record<string, string> = {
    tab_recorded: "开启记录",
    tab_activated: "切换激活",
    tab_closed: "关闭标签",
    result_opened: "重新打开",
    archive_confirm: "归档确认",
    archive_undo: "撤销归档",
    session_restored: "恢复会话",
    content_signal: "页面信号",
    url_copied: "复制链接"
  };
  return labels[type] ?? type;
}

function Onboarding({ refresh }: { refresh: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{t.firstRun}</CardTitle>
        <CardDescription>{t.firstRunDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Button onClick={async () => { await saveSettings({ aiMode: "local-first", strictPrivacy: false, onboardingComplete: true }); await importHistory(); await refresh(); }}>{t.importHistory}</Button>
        <Button variant="secondary" onClick={async () => { await seedDemo(); await saveSettings({ onboardingComplete: true }); await refresh(); }}>{t.useDemo}</Button>
        <Button variant="outline" onClick={async () => { await saveSettings({ aiMode: "local-only", strictPrivacy: true, onboardingComplete: true }); await refresh(); }}>{t.startEmpty}</Button>
      </CardContent>
    </Card>
  );
}

type ReasonVariant = "default" | "ghost" | "recall";

function TabList({
  tabs,
  refresh,
  reasonResolver,
  reasonVariant = "default"
}: {
  tabs: Array<TabMemory | RecallResult>;
  refresh: () => Promise<void>;
  reasonResolver?: (tab: TabMemory | RecallResult) => string;
  reasonVariant?: ReasonVariant;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {tabs.map((tab) => (
          <TabListRow key={tab.id} tab={tab} refresh={refresh} reason={reasonResolver?.(tab)} reasonVariant={reasonVariant} />
        ))}
      </div>
    </Card>
  );
}

function TabListRow({ tab, refresh, reason, reasonVariant }: { tab: TabMemory | RecallResult; refresh: () => Promise<void>; reason?: string; reasonVariant: ReasonVariant }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const contentType = enumMeta("contentType", tab.card.contentType, language);
  const importance = enumMeta("importance", tab.card.importance, language);
  const source = enumMeta("source", tab.card.source, language);
  const readingStatus = enumMeta("readingStatus", tab.card.readingStatus, language);
  const statusLabel = reasonVariant === "ghost" ? t.ghostStatus : tab.archived ? t.archived : t.active;
  return (
    <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,760px)] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Favicon tab={tab} />
        <div className="min-w-0 flex-1">
          <button className="flex min-w-0 items-start gap-1.5 text-left text-sm font-medium leading-5 hover:underline" title={t.reopen} onClick={async () => { await restoreTab(tab.id); await refresh(); }}>
            {tab.card.aiEnhanced ? (
              <span className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-300" title={t.aiEnhanced}>
                <Sparkles className="h-3.5 w-3.5" aria-label={t.aiEnhanced} />
              </span>
            ) : null}
            <span className="line-clamp-2 min-w-0">{tab.card.summary}</span>
          </button>
          <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate" title={tab.url}>{tab.url}</span>
            <button
              className="shrink-0 rounded-sm p-0.5 hover:bg-muted hover:text-foreground"
              title={t.copy}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(tab.url);
                  notify(t.copied);
                } catch {
                  notify(t.copyFailed);
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge variant="muted" title={contentType.description}>{t.contentType}: {contentType.label}</Badge>
            <Badge variant={tab.archived || reasonVariant === "ghost" ? "default" : "outline"}>{t.status}: {statusLabel}</Badge>
            <Badge variant="outline" title={importance.description}>{t.importance}: {importance.label}</Badge>
            <EditCardButton tab={tab} refresh={refresh} compact />
          </div>
        </div>
      </div>
      <div className="min-w-0 text-xs leading-5 text-muted-foreground">
        <div className="truncate">
          <span>{t.lastActive}: <span className="font-medium text-foreground">{formatTime(tab.lastActivatedAt, Date.now(), language)}</span></span>
          <span className="mx-2 text-border">|</span>
          <span>{t.opened}: <span className="font-medium text-foreground">{formatTime(tab.openedAt, Date.now(), language)}</span></span>
          <span className="mx-2 text-border">|</span>
          <span title={source.description}>{t.source}: <span className="font-medium text-foreground">{source.label}</span></span>
          <span className="mx-2 text-border">|</span>
          <span title={readingStatus.description}>{t.readingStatus}: <span className="font-medium text-foreground">{readingStatus.label}</span></span>
        </div>
        <div className={reasonClassName(reasonVariant)} title={reason ?? buildWhyTip(tab, language)}>{reason ?? buildWhyTip(tab, language)}</div>
      </div>
    </div>
  );
}

function Favicon({ tab }: { tab: TabMemory | RecallResult }) {
  const [failed, setFailed] = useState(false);
  if (tab.favIconUrl && !failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background p-1.5">
        <img
          src={tab.favIconUrl}
          alt=""
          className="h-6 w-6 rounded-sm object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
      {tab.domain.slice(0, 2).toUpperCase()}
    </div>
  );
}

function reasonClassName(variant: ReasonVariant) {
  const base = "truncate rounded-sm border-l-2 px-2 py-1 font-medium";
  if (variant === "ghost") return `${base} border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200`;
  if (variant === "recall") return `${base} border-sky-500 bg-sky-500/10 text-sky-800 dark:text-sky-200`;
  return "truncate text-muted-foreground/85";
}

function EditCardButton({ tab, refresh, compact = false }: { tab: TabMemory | RecallResult; refresh: () => Promise<void>; compact?: boolean }) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({
    summary: tab.card.summary,
    topics: tab.card.topics.join(", "),
    entities: tab.card.entities.join(", "),
    customTags: (tab.card.customTags ?? []).join(", "),
    importance: tab.card.importance,
    readingStatus: tab.card.readingStatus,
    contentType: tab.card.contentType,
    source: tab.card.source,
    taskContext: tab.card.taskContext ?? ""
  });
  const toCardPatch = (): Partial<TabInfoCard> => ({
    summary: draft.summary.trim(),
    topics: splitCsv(draft.topics),
    entities: splitCsv(draft.entities),
    customTags: splitCsv(draft.customTags),
    importance: draft.importance as TabInfoCard["importance"],
    readingStatus: draft.readingStatus as TabInfoCard["readingStatus"],
    contentType: draft.contentType as TabInfoCard["contentType"],
    source: draft.source as TabInfoCard["source"],
    taskContext: draft.taskContext.trim()
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={compact ? "ghost" : "outline"} className={compact ? "h-6 px-1.5" : undefined} title={t.edit}><Edit3 className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.edit}</DialogTitle>
          <DialogDescription>{tab.domain}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <TextRow label="Summary" value={draft.summary} onChange={(summary) => setDraft((prev) => ({ ...prev, summary }))} />
          <TextRow label={t.topic} value={draft.topics} onChange={(topics) => setDraft((prev) => ({ ...prev, topics }))} />
          <TextRow label={t.entity} value={draft.entities} onChange={(entities) => setDraft((prev) => ({ ...prev, entities }))} />
          <TextRow label="Tags" value={draft.customTags} onChange={(customTags) => setDraft((prev) => ({ ...prev, customTags }))} />
          <TextRow label="Task context" value={draft.taskContext} onChange={(taskContext) => setDraft((prev) => ({ ...prev, taskContext }))} />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectRow label={t.importance} value={draft.importance} options={enumOptions("importance", ["must", "should", "maybe", "safe"], language)} onChange={(importance) => setDraft((prev) => ({ ...prev, importance }))} />
            <SelectRow label={t.readingStatus} value={draft.readingStatus} options={enumOptions("readingStatus", ["fully-read", "skimmed", "bounced"], language)} onChange={(readingStatus) => setDraft((prev) => ({ ...prev, readingStatus }))} />
            <SelectRow label={t.type} value={draft.contentType} options={enumOptions("contentType", ["article", "video", "pdf", "tweet", "repo", "doc", "image", "saas"], language)} onChange={(contentType) => setDraft((prev) => ({ ...prev, contentType }))} />
            <SelectRow label={t.source} value={draft.source} options={enumOptions("source", ["twitter", "slack", "email", "search", "direct", "bookmark"], language)} onChange={(source) => setDraft((prev) => ({ ...prev, source }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={async () => { await updateTabCard(tab.id, toCardPatch()); setOpen(false); await refresh(); }}>{t.save}</Button>
            <Button variant="outline" onClick={async () => { await updateTabCard(tab.id, toCardPatch(), true); setOpen(false); await refresh(); }}>{t.saveAsRule}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenameSessionButton({ sessionId, currentName, refresh }: { sessionId: string; currentName: string; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">{t.edit}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.sessions}</DialogTitle></DialogHeader>
        <TextRow label="Name" value={name} onChange={setName} />
        <Button onClick={async () => { await renameSession(sessionId, name); setOpen(false); await refresh(); }}>{t.save}</Button>
      </DialogContent>
    </Dialog>
  );
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function PopupTopList({ tabs, refresh }: { tabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <section className="rounded-md border bg-card">
      {tabs.length ? (
        <div className="divide-y">
          {tabs.map((tab) => (
            <PopupListItem key={tab.id} tab={tab} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="px-3 py-4 text-sm text-muted-foreground">{t.emptyList}</p>
      )}
    </section>
  );
}

function PopupListItem({ tab, refresh }: { tab: TabMemory; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <button
      className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left hover:bg-accent"
      onClick={async () => {
        await restoreTab(tab.id);
        await refresh();
      }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border bg-background text-[10px] font-semibold">
        {tab.favIconUrl && !failed ? (
          <img src={tab.favIconUrl} alt="" className="h-4 w-4 rounded-sm object-contain" onError={() => setFailed(true)} />
        ) : (
          tab.domain.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="flex min-w-0 items-start gap-1 text-sm font-medium leading-5">
          {tab.card.aiEnhanced ? (
            <span className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-300" title={t.aiEnhanced}>
              <Sparkles className="h-3.5 w-3.5" aria-label={t.aiEnhanced} />
            </span>
          ) : null}
          <span className="line-clamp-2 min-w-0 break-words">{tab.card.summary}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {tab.domain} · {formatTime(tab.lastActivatedAt, Date.now(), language)}
        </span>
      </span>
    </button>
  );
}

function CompactResult({ tab, refresh }: { tab: RecallResult; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <button className="w-full rounded-lg border bg-card p-3 text-left hover:bg-accent" onClick={async () => { await restoreTab(tab.id); await refresh(); }}>
      <p className="line-clamp-1 text-sm font-medium">{tab.card.summary}</p>
      <p className="truncate text-xs text-muted-foreground">{tab.domain} · {tab.matchedCues.join(", ") || t.memoryMatch}</p>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MetricCard({ icon, title, value, onClick }: { icon: React.ReactNode; title: string; value: string; onClick?: () => void }) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={onClick ? "cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : undefined}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ToggleRow({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-md border p-2.5 ${disabled ? "opacity-60" : ""}`}>
      <span className="min-w-0">
        <SettingLabel label={label} description={description} />
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

function TextRow({
  label,
  description,
  value,
  placeholder,
  type = "text",
  onChange
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && passwordVisible ? "text" : type;
  return (
    <label className="grid gap-1 text-sm">
      <SettingLabel label={label} description={description} />
      <span className="relative">
        <Input
          className={isPassword ? "pr-10" : undefined}
          type={inputType}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={passwordVisible ? t.hideApiKey : t.showApiKey}
            onClick={(event) => {
              event.preventDefault();
              setPasswordVisible((visible) => !visible);
            }}
          >
            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  description,
  disabled,
  showOptionDescription,
  onChange
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string; description?: string }>;
  description?: string;
  disabled?: boolean;
  showOptionDescription?: boolean;
  onChange: (value: string) => void;
}) {
  const normalizedOptions = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  return (
    <label className={`grid gap-1 text-sm ${disabled ? "opacity-60" : ""}`}>
      <SettingLabel label={label} description={description} />
      <select className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {normalizedOptions.map((item) => {
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
      {showOptionDescription && selectedOption?.description ? <span className="text-xs text-muted-foreground">{selectedOption.description}</span> : null}
    </label>
  );
}

function SettingLabel({ label, description }: { label: string; description?: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-sm font-medium">{label}</span>
      {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    </span>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-md border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function ImportButton({ refresh }: { refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><FileUp className="h-4 w-4" /> {t.importJson}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.importTitle}</DialogTitle>
          <DialogDescription>{t.importDescription}</DialogDescription>
        </DialogHeader>
        <textarea className="min-h-40 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={text} onChange={(event) => setText(event.target.value)} />
        <Button
          onClick={async () => {
            try {
              await importData(JSON.parse(text));
              setOpen(false);
              await refresh();
              notify(t.dataImported);
            } catch (error) {
              notify(error instanceof Error ? error.message : t.actionFailed);
            }
          }}
        >
          {t.import}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
