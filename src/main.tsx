import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { AlertCircle, Archive, ArrowLeft, ArrowUpRight, BarChart3, Bell, CheckCircle2, Copy, Database, Download, Edit3, Eye, EyeOff, FileUp, Ghost, History, Layers, Loader2, PieChart, RotateCcw, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import "./styles.css";
import { archiveGhosts, archiveTab, cancelArchivePreview, clearData, confirmArchivePreview, exportData, getSnapshot, importData, importHistory, openDashboard, previewArchive, recall, renameSession, restoreSession, restoreTab, saveSettings, seedDemo, summarizeRecall, testDeepSeek, unarchiveTab, undoArchive, updateTabCard } from "@/lib/api";
import { buildWhyTip, formatTime, groupTabs } from "@/lib/memory";
import type { AppSnapshot, BrowseGroupMode, ContentType, LanguageMode, RecallFilters, RecallResult, RecallSynthesisResult, Settings as SettingsType, TabInfoCard, TabMemory, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Page = "popup" | "newtab" | "dashboard" | "options";
type UiLanguage = "en" | "zh";
type DashboardTab = "analytics" | "recall" | "ghosts" | "graveyard" | "sessions";

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
    settingsArchiveTab: "Archive",
    settingsResurfaceTab: "Resurface",
    settingsSectionStatus: "Status",
    settingsGeneralHint: "Language and appearance.",
    settingsArchiveHint: "Ghost timing and archive confirmation.",
    settingsResurfaceHint: "Suggestions while browsing.",
    settingsPrivacyHint: "Recording and privacy boundaries.",
    settingsAiHint: "Provider and AI permissions.",
    settingsRulesHint: "Domains to skip.",
    settingsDataHint: "Export, import, and logs.",
    todayRecap: "Today's Recap",
    yesterdayRecap: "Yesterday {count} tabs. Standout: {title}.",
    total: "Total",
    ghost: "Ghost",
    today: "Today",
    searchPlaceholder: "Describe what you remember: time, source, color, topic...",
    search: "Search",
    close: "Close",
    popupSearchPlaceholder: "Describe what you remember...",
    popupRecallTop: "Recall Top 10",
    popupGhostTop: "Ghost Top 10",
    emptyList: "No items yet.",
    searching: "Searching...",
    summarizeTabs: "Summarize tabs",
    summarizingTabs: "Summarizing...",
    summaryFailed: "Summary failed",
    aiSummary: "AI summary",
    summaryReady: "Summary ready",
    summaryStale: "Summary may be outdated",
    regenerateSummary: "Regenerate",
    summaryScope: "Scope",
    summaryHighlights: "Key observations",
    summarySourceNote: "Based on tab metadata and behavior signals, not page-body content.",
    summaryPendingTitle: "Generating browser-context summary",
    summaryPendingDescription: "Tab Graveyard is reading the selected tabs, behavior signals, and local info cards.",
    summaryStepRead: "Reading tab metadata",
    summaryStepGenerate: "Synthesizing context",
    summaryStepFinish: "Preparing summary card",
    searchPendingTitle: "Searching memory",
    searchPendingDescription: "Matching local memory first, then applying AI recall when enabled.",
    actionComplete: "Complete",
    retry: "Retry",
    saving: "Saving...",
    exporting: "Exporting...",
    importing: "Importing...",
    restoring: "Restoring...",
    previewingArchive: "Preparing archive preview...",
    cancellingArchive: "Cancelling...",
    confirmingArchive: "Archiving...",
    testingConnection: "Testing connection",
    enhancingMemory: "Enhancing memory",
    researchGaps: "Gaps",
    aiCues: "AI cues",
    aiRecallFallback: "AI Recall fell back to local search",
    aiRecallOn: "AI Recall on",
    localRecall: "Local Recall",
    providerChromeLocal: "Chrome local model",
    providerDeepSeek: "DeepSeek",
    intentRerank: "Intent rerank",
    tabSummaries: "Tab summaries",
    resetFilters: "Reset filters",
    moreFilters: "More filters",
    fewerFilters: "Fewer filters",
    activeFilters: "Active filters",
    matchedBecause: "Matched",
    aiIntent: "AI intent",
    behaviorSignals: "Behavior",
    trustSummary: "Status summary",
    recordingStatus: "Recording",
    recordingActiveStatus: "Active",
    recordingPausedStatus: "Paused",
    aiStatus: "AI",
    provider: "Provider",
    lastAiCall: "Last AI call",
    outboundData: "Outbound data",
    blockedDomains: "Blocked domains",
    localMemory: "Local memory",
    enabled: "Enabled",
    disabled: "Disabled",
    notYet: "Not yet",
    resurfaceHint: "Resurface: related archived pages will appear while you browse.",
    undoArchive: "Undo last archive",
    archiveGhostTabs: "Archive {count} Ghost Tabs",
    archiveTab: "Archive",
    archiveThisTab: "Archive this tab",
    unarchiveTab: "Unarchive",
    unarchiveThisTab: "Move back to Recall",
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
    sessionsDescription: "Conservative task groups based on topic, entity, source, and time proximity.",
    tabs: "tabs",
    links: "links",
    tabLabels: "Tags:",
    sessionSource: "Mostly:",
    sessionTime: "Time:",
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
    cancelArchive: "Cancel archive",
    privacyMap: "Data & Privacy",
    privacyMapDescription: "What Tab Graveyard stores, skips, and may send to configured AI providers.",
    privacyLocalFields: "Stored locally",
    privacyLocalFieldsValue: "URL, title, domain, time, source, behavior signals",
    privacyNeverCaptured: "Never captured",
    privacyNeverCapturedValue: "Passwords, private form values, full page archives",
    privacyAiOutbound: "AI outbound",
    privacyAiOutboundValue: "On endpoint fallback only: title, URL, domain, and local card metadata.",
    privacyAiDisabled: "Disabled",
    privacyRules: "Local corrections",
    privacyRulesValue: "{count} edited cards · local storage only",
    dataLog: "Data Log",
    leaderboard: "Leaderboard",
    localOnlyStub: "Local-only prototype: cloud sync and billing are not connected.",
    memoryMatch: "memory match",
    browserMemoryLocal: "Your browser memory stays local by default.",
    firstRun: "First Run",
    firstRunDescription: "Choose how Tab Graveyard should start building memory.",
    generalSettings: "General",
    generalSettingsDescription: "Language and appearance defaults.",
    archiveSettingsDescription: "Control when inactive tabs become Ghost Tabs and how much confirmation archive actions require.",
    resurfaceSettingsDescription: "Control when related archived pages should surface while you browse.",
    rulesSettingsDescription: "Keep private, noisy, or irrelevant domains out of Tab Memory.",
    dataSettingsDescription: "Export, import, inspect local events, or clear local memory.",
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
    resurfaceIncludeGhosts: "Include Ghost Tabs",
    resurfaceIncludeGhostsDescription: "Also match long-inactive tabs that are still open. Opening one will focus the existing tab when possible.",
    resurfaceFrequency: "Resurface frequency",
    resurfaceCooldown: "Resurface cooldown",
    resurfacePolicy: "Resurface Policy",
    archiveTrust: "Archive trust stage",
    archivePolicy: "Archive Policy",
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
    aiMode: "AI",
    aiModeDescription: "Enable AI-assisted recall, summaries, and naming.",
    aiEnabled: "Enable AI",
    aiEnabledDescription: "When enabled, Tab Graveyard tries Chrome's local model first, then falls back to the configured endpoint when available.",
    browserAiProvider: "Chrome local model",
    deepSeekProvider: "DeepSeek / OpenAI-compatible endpoint",
    deepSeekDescription: "Configure DeepSeek, LM Studio, or another OpenAI-compatible chat completions endpoint. The key is stored locally and only sent to the configured endpoint.",
    deepSeekApiKey: "API Key",
    deepSeekApiKeyDescription: "Stored in local browser storage. For local services such as LM Studio, use any placeholder if the server does not require a key.",
    showApiKey: "Show API key",
    hideApiKey: "Hide API key",
    deepSeekModel: "Model",
    deepSeekModelDescription: "Model name used for fallback requests, connection tests, memory enhancement, query expansion, and session naming.",
    deepSeekBaseUrl: "Base URL",
    deepSeekBaseUrlDescription: "OpenAI-compatible base URL. Examples: https://api.deepseek.com or http://127.0.0.1:1234/v1.",
    deepSeekRequestUrl: "Request URL",
    deepSeekRequestUrlDescription: "Actual request URL:",
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
    resurfaceFrequencyAlways: "Always resurface",
    resurfaceFrequencyAlwaysDescription: "No daily limit. Matching pages can resurface whenever cooldown allows.",
    resurfaceCooldownDescription: "Minimum time between two resurfacing suggestions, even when more related archives match.",
    resurfaceCooldownOption: "Wait at least {hours} hours before showing another resurfacing suggestion.",
    resurfaceCooldownMinutesOption: "Wait at least {minutes} minutes before showing another resurfacing suggestion.",
    resurfaceCooldownNone: "No cooldown",
    resurfaceCooldownNoneDescription: "Show a resurfacing suggestion whenever a related page matches, subject only to the daily frequency setting.",
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
    settingsArchiveTab: "归档",
    settingsResurfaceTab: "唤醒",
    settingsSectionStatus: "状态",
    settingsGeneralHint: "语言与外观。",
    settingsArchiveHint: "幽灵阈值与归档确认。",
    settingsResurfaceHint: "浏览时的主动提示。",
    settingsPrivacyHint: "记录开关与隐私边界。",
    settingsAiHint: "服务商与 AI 权限。",
    settingsRulesHint: "需要跳过的域名。",
    settingsDataHint: "导入导出与日志。",
    todayRecap: "今日回顾",
    yesterdayRecap: "昨天打开了 {count} 个标签。最重要的是：{title}。",
    total: "总数",
    ghost: "幽灵",
    today: "今日",
    searchPlaceholder: "描述你记得的：时间、来源、颜色、主题...",
    search: "搜索",
    close: "关闭",
    popupSearchPlaceholder: "描述你记得的内容...",
    popupRecallTop: "找回 Top 10",
    popupGhostTop: "幽灵标签 Top 10",
    emptyList: "暂无内容。",
    searching: "搜索中...",
    summarizeTabs: "总结这组标签",
    summarizingTabs: "总结中...",
    summaryFailed: "总结失败",
    aiSummary: "AI 摘要",
    summaryReady: "摘要已生成",
    summaryStale: "摘要可能已过期",
    regenerateSummary: "重新生成",
    summaryScope: "依据范围",
    summaryHighlights: "关键观察",
    summarySourceNote: "基于标签元数据和行为信号，不是页面正文总结。",
    summaryPendingTitle: "正在生成浏览上下文摘要",
    summaryPendingDescription: "Tab Graveyard 正在读取这组标签、行为信号和本地信息卡。",
    summaryStepRead: "读取标签元数据",
    summaryStepGenerate: "生成上下文摘要",
    summaryStepFinish: "整理摘要卡片",
    searchPendingTitle: "正在搜索记忆",
    searchPendingDescription: "先匹配本地记忆，启用 AI 时再进行意图找回。",
    actionComplete: "已完成",
    retry: "重试",
    saving: "正在保存...",
    exporting: "正在导出...",
    importing: "正在导入...",
    restoring: "正在恢复...",
    previewingArchive: "正在准备归档预览...",
    cancellingArchive: "正在取消...",
    confirmingArchive: "正在归档...",
    testingConnection: "正在测试连接",
    enhancingMemory: "正在增强记忆",
    researchGaps: "缺口",
    aiCues: "AI 线索",
    aiRecallFallback: "AI 找回已回退到本地搜索",
    aiRecallOn: "AI 找回开启",
    localRecall: "本地找回",
    providerChromeLocal: "Chrome 本地模型",
    providerDeepSeek: "DeepSeek",
    intentRerank: "意图重排",
    tabSummaries: "标签总结",
    resetFilters: "重置筛选",
    moreFilters: "更多筛选",
    fewerFilters: "收起筛选",
    activeFilters: "当前筛选",
    matchedBecause: "匹配原因",
    aiIntent: "AI 意图",
    behaviorSignals: "行为信号",
    trustSummary: "状态摘要",
    recordingStatus: "记录",
    recordingActiveStatus: "运行中",
    recordingPausedStatus: "已暂停",
    aiStatus: "AI",
    provider: "服务商",
    lastAiCall: "最近 AI 调用",
    outboundData: "外发数据",
    blockedDomains: "屏蔽域名",
    localMemory: "本地记忆",
    enabled: "已启用",
    disabled: "已关闭",
    notYet: "暂无",
    resurfaceHint: "主动唤醒：浏览时会提示相关的归档页面。",
    undoArchive: "撤销上次归档",
    archiveGhostTabs: "归档 {count} 个幽灵标签",
    archiveTab: "归档",
    archiveThisTab: "归档这个标签",
    unarchiveTab: "取消归档",
    unarchiveThisTab: "移回找回列表",
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
    sessionsDescription: "基于主题、实体、来源和时间接近度的保守任务分组。",
    tabs: "个标签",
    links: "个链接",
    tabLabels: "标签：",
    sessionSource: "主要来源：",
    sessionTime: "时间：",
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
    cancelArchive: "取消归档",
    privacyMap: "数据与隐私",
    privacyMapDescription: "说明 Tab Graveyard 会保存什么、不会记录什么，以及哪些信息可能发送给已配置的 AI 服务。",
    privacyLocalFields: "本地保存",
    privacyLocalFieldsValue: "URL、标题、域名、时间、来源、行为信号",
    privacyNeverCaptured: "不会记录",
    privacyNeverCapturedValue: "密码、私密表单内容、完整网页归档",
    privacyAiOutbound: "AI 外发",
    privacyAiOutboundValue: "仅 endpoint 回退时发送：标题、URL、域名、本地信息卡元数据。",
    privacyAiDisabled: "已关闭",
    privacyRules: "本地修正",
    privacyRulesValue: "{count} 张已编辑信息卡 · 仅本地存储",
    dataLog: "数据日志",
    leaderboard: "排行榜",
    localOnlyStub: "本地原型：云同步和计费后端未连接。",
    memoryMatch: "记忆匹配",
    browserMemoryLocal: "你的浏览记忆默认只保存在本地。",
    firstRun: "首次启动",
    firstRunDescription: "选择 Tab Graveyard 如何开始建立记忆。",
    generalSettings: "通用设置",
    generalSettingsDescription: "界面语言与主题外观默认值。",
    archiveSettingsDescription: "控制不活跃标签何时进入幽灵状态，以及归档动作需要多少确认。",
    resurfaceSettingsDescription: "控制浏览时何时提示相关的历史归档页面。",
    rulesSettingsDescription: "把私密、嘈杂或无关的域名排除在 Tab Memory 之外。",
    dataSettingsDescription: "导出、导入、查看本地事件，或清空本地记忆。",
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
    resurfaceIncludeGhosts: "包含幽灵标签",
    resurfaceIncludeGhostsDescription: "主动唤醒时也匹配仍打开但长时间未活跃的幽灵标签。打开时会尽量切换到原标签页。",
    resurfaceFrequency: "主动唤醒频率",
    resurfaceCooldown: "主动唤醒冷却间隔",
    resurfacePolicy: "唤醒策略",
    archiveTrust: "归档信任阶段",
    archivePolicy: "归档策略",
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
    aiMode: "AI",
    aiModeDescription: "启用 AI 找回、摘要增强和会话命名。",
    aiEnabled: "启用 AI",
    aiEnabledDescription: "开启后会优先尝试 Chrome 本地模型；不可用时，再自动回退到已配置的 endpoint。",
    browserAiProvider: "Chrome 本地模型",
    deepSeekProvider: "DeepSeek / OpenAI-compatible endpoint",
    deepSeekDescription: "配置 DeepSeek、LM Studio 或其他兼容 OpenAI Chat Completions 格式的接口。API Key 保存在本地，只发送到你配置的 endpoint。",
    deepSeekApiKey: "API Key",
    deepSeekApiKeyDescription: "保存在浏览器本地存储中。LM Studio 等本地服务如果不需要 key，可以填任意占位值。",
    showApiKey: "显示 API Key",
    hideApiKey: "隐藏 API Key",
    deepSeekModel: "模型",
    deepSeekModelDescription: "用于回退请求、连接测试、记忆增强、查询扩展和会话命名的模型名。",
    deepSeekBaseUrl: "Base URL",
    deepSeekBaseUrlDescription: "兼容 OpenAI 格式的接口地址。例如：https://api.deepseek.com 或 http://127.0.0.1:1234/v1。",
    deepSeekRequestUrl: "请求 URL",
    deepSeekRequestUrlDescription: "实际请求地址：",
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
    resurfaceFrequencyAlways: "始终唤醒",
    resurfaceFrequencyAlwaysDescription: "不限制每日次数。只要命中相关归档，并满足冷却间隔，就可以继续提示。",
    resurfaceCooldownDescription: "两次主动唤醒之间至少间隔多久，即使命中了更多相关归档也不会连续弹出。",
    resurfaceCooldownOption: "至少等待 {hours} 小时后，才会展示下一次主动唤醒提示。",
    resurfaceCooldownMinutesOption: "至少等待 {minutes} 分钟后，才会展示下一次主动唤醒提示。",
    resurfaceCooldownNone: "不冷却",
    resurfaceCooldownNoneDescription: "只要命中相关归档，就可以展示主动唤醒提示，仅受每日频率限制。",
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

function AppLogo({ size = "md", onClick }: { size?: "sm" | "md" | "lg"; onClick?: () => void }) {
  const className = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const image = (
    <img
      src="icons/icon-128.png"
      alt=""
      aria-hidden="true"
      className={`${className} shrink-0 rounded-xl border bg-background object-cover shadow-sm`}
    />
  );
  if (!onClick) return image;
  return (
    <button
      type="button"
      className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      title="View logo"
    >
      {image}
    </button>
  );
}

function LogoShowcase({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { language, t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <button
        type="button"
        className="logo-showcase grid place-items-center rounded-xl border bg-card p-8 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={() => onOpenChange(false)}
        aria-label={t.appName}
      >
        <div className="graveyard-dance-scene">
          <svg className="graveyard-animation-layer" viewBox="0 0 360 360" aria-hidden="true">
            <defs>
              <radialGradient id="graveyardCollectGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0.2" />
                <stop offset="58%" stopColor="#5eead4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="graveyardTrace" x1="72" x2="288" y1="72" y2="288" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#5eead4" stopOpacity="0" />
                <stop offset="52%" stopColor="#5eead4" stopOpacity="0.58" />
                <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
              </linearGradient>
              <filter id="graveyardSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            <circle className="graveyard-collect-glow" cx="180" cy="180" r="138" fill="url(#graveyardCollectGlow)" />
            <g className="graveyard-collect-traces" filter="url(#graveyardSoftGlow)">
              <path className="trace-one" d="M102 110 C126 102 151 119 168 151 C174 162 178 172 180 180" />
              <path className="trace-two" d="M263 103 C235 101 211 120 195 151 C189 163 184 173 180 180" />
              <path className="trace-three" d="M83 236 C111 243 143 224 164 194 C171 184 176 180 180 180" />
              <path className="trace-four" d="M281 241 C248 247 218 226 197 195 C190 185 184 180 180 180" />
              <path className="trace-five" d="M184 62 C178 90 181 120 184 151 C185 164 183 174 180 180" />
            </g>
            <g className="graveyard-memory-tabs">
              <g className="graveyard-memory-tab tab-one">
                <rect x="74" y="94" width="58" height="36" rx="10" />
                <circle cx="91" cy="112" r="4" />
                <path d="M102 108 H120 M102 117 H114" />
              </g>
              <g className="graveyard-memory-tab tab-two">
                <rect x="235" y="86" width="56" height="34" rx="10" />
                <circle cx="251" cy="103" r="4" />
                <path d="M262 99 H280 M262 108 H274" />
              </g>
              <g className="graveyard-memory-tab tab-three">
                <rect x="55" y="221" width="56" height="34" rx="10" />
                <circle cx="71" cy="238" r="4" />
                <path d="M82 234 H99 M82 243 H94" />
              </g>
              <g className="graveyard-memory-tab tab-four">
                <rect x="250" y="226" width="58" height="36" rx="10" />
                <circle cx="267" cy="244" r="4" />
                <path d="M278 240 H296 M278 249 H290" />
              </g>
              <g className="graveyard-memory-tab tab-five">
                <rect x="156" y="48" width="56" height="34" rx="10" />
                <circle cx="172" cy="65" r="4" />
                <path d="M183 61 H201 M183 70 H195" />
              </g>
            </g>
            <g className="graveyard-memory-sparkles">
              <circle cx="142" cy="142" r="3" />
              <circle cx="222" cy="149" r="3" />
              <circle cx="180" cy="174" r="2.5" />
            </g>
          </svg>
          <img src="icons/icon-1024.png" alt={t.appName} className="graveyard-final-logo" />
        </div>
      </button>
    </div>
  );
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

function canUseAiFeatures(settings: SettingsType) {
  return settings.aiMode !== "local-only";
}

function toChatCompletionsUrl(baseUrl: string) {
  const normalized = (baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
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
  return ["analytics", "recall", "ghosts", "graveyard", "sessions"].includes(value) ? value as DashboardTab : "recall";
}

function navigateDashboard(tab: DashboardTab) {
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
  const popupSections = [
    { id: "recall", label: t.recall, count: recallCount, tabs: recallTop },
    { id: "ghosts", label: t.ghostTabs, count: snapshot.ghostTabs.length, tabs: ghostTop }
  ].filter((section) => section.count > 0);

  return (
    <main className="popup-body flex flex-col gap-3 overflow-x-hidden p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo size="sm" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{t.appName}</h1>
            <p className="truncate text-xs text-muted-foreground">{t.tagline}</p>
          </div>
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

      {popupSections.length === 1 ? (
        <PopupSingleSection tabs={popupSections[0].tabs} refresh={refresh} />
      ) : (
        <Tabs defaultValue={popupSections[0]?.id ?? "recall"} className="grid min-w-0 gap-2 overflow-hidden">
          <TabsList className="grid h-10 w-full min-w-0 grid-cols-2 overflow-hidden p-1">
            <TabsTrigger value="recall" className="h-full min-w-0 gap-1 overflow-hidden px-2">{t.recall} <TabCount value={recallCount} /></TabsTrigger>
            <TabsTrigger value="ghosts" className="h-full min-w-0 gap-1 overflow-hidden px-2">{t.ghostTabs} <TabCount value={snapshot.ghostTabs.length} /></TabsTrigger>
          </TabsList>
          <TabsContent value="recall" className="mt-0 min-w-0 overflow-hidden">
            <PopupTopList tabs={recallTop} refresh={refresh} />
          </TabsContent>
          <TabsContent value="ghosts" className="mt-0 min-w-0 overflow-hidden">
            <PopupTopList tabs={ghostTop} refresh={refresh} />
          </TabsContent>
        </Tabs>
      )}

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
  const [logoOpen, setLogoOpen] = useState(false);
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
    if (window.location.hash !== "#recall") window.location.hash = "recall";
    setResults([]);
    setSubmittedQuery(query.trim());
  };

  const aiAvailable = canUseAiFeatures(snapshot.settings);
  const aiFallbackReason = results.find((tab) => tab.aiRecallStatus === "fallback")?.aiFallbackReason;
  const continueTabs = useMemo(() => snapshot.tabs.filter((tab) => !tab.archived).sort((a, b) => b.lastActivatedAt - a.lastActivatedAt), [snapshot.tabs]);

  return (
    <main className="min-h-screen">
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AppLogo size="lg" onClick={() => setLogoOpen(true)} />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal">{t.appName}</h1>
                <p className="text-sm text-muted-foreground">{t.tagline}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => chrome.runtime.openOptionsPage()}>
                <Settings className="h-4 w-4" /> {t.settings}
              </Button>
            </div>
          </header>
          <RecallSearchBar query={query} setQuery={setQuery} isSearching={isSearching} onSubmit={submitSearch} aiAvailable={aiAvailable} fallbackReason={aiFallbackReason} />
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-6">
        <Dashboard snapshot={snapshot} results={results} query={submittedQuery} filters={filters} setFilters={setFilters} refresh={refresh} isSearching={isSearching} />
      </section>
      <LogoShowcase open={logoOpen} onOpenChange={setLogoOpen} />
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

function RecallSearchBar({
  query,
  setQuery,
  isSearching,
  onSubmit,
  aiAvailable,
  fallbackReason
}: {
  query: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  onSubmit: () => void;
  aiAvailable: boolean;
  fallbackReason?: string;
}) {
  const { language, t } = useI18n();
  const modeLabel = fallbackReason ? t.localRecall : aiAvailable ? t.aiRecallOn : t.localRecall;
  return (
    <div className={cn("rounded-md border bg-background", aiAvailable && !fallbackReason ? "border-primary/20" : "border-border")}>
      <div className="flex gap-2 p-2">
        <div className="relative min-w-0 flex-1">
          {aiAvailable ? (
            <Sparkles className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-foreground" />
          ) : (
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
          )}
          <Input
            className="h-12 border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmit();
            }}
            placeholder={t.searchPlaceholder}
          />
        </div>
        <Button variant="secondary" className="h-12 px-5" disabled={isSearching} onClick={onSubmit}>
          <Search className="h-4 w-4" /> {isSearching ? `${t.search}...` : t.search}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{modeLabel}</span>
        {aiAvailable ? (
          <>
            <Badge variant="secondary">{t.providerDeepSeek}</Badge>
            <Badge variant="outline">{t.intentRerank}</Badge>
            <Badge variant="outline">{t.tabSummaries}</Badge>
          </>
        ) : (
          <span>{t.strictPrivacyDescription}</span>
        )}
        {fallbackReason ? <span className="min-w-0 truncate text-amber-700 dark:text-amber-300">{t.aiRecallFallback}: {fallbackReason}</span> : null}
      </div>
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
  const { language, t } = useI18n();
  const [activeTab, setActiveTab] = useState(() => getDashboardTabFromHash());
  useEffect(() => {
    const handleHash = () => setActiveTab(getDashboardTabFromHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);
  const setDashboardTab = (value: string) => {
    setActiveTab(value as DashboardTab);
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
        <TabsTrigger value="analytics" className="ml-2 border-l border-border/80 pl-4">{language === "zh" ? "看板" : "Analytics"} <TabCount value={snapshot.totalTabs} /></TabsTrigger>
      </TabsList>
      <TabsContent value="recall">
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(150px,210px)_minmax(0,1fr)]">
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
      <TabsContent value="analytics">
        <AnalyticsPanel snapshot={snapshot} refresh={refresh} />
      </TabsContent>
    </Tabs>
  );
}

const analyticsTypeOrder: ContentType[] = ["article", "doc", "pdf", "video", "repo", "tweet", "image", "saas"];
const analyticsTypeColors: Record<ContentType, string> = {
  article: "#0ea5e9",
  doc: "#14b8a6",
  pdf: "#f59e0b",
  video: "#f97316",
  repo: "#ec4899",
  tweet: "#8b5cf6",
  image: "#84cc16",
  saas: "#64748b"
};

type AnalyticsWeek = {
  key: string;
  label: string;
  shortLabel: string;
  start: number;
  end: number;
  total: number;
  typeCounts: Record<ContentType, number>;
  ghost7: number;
  ghost30: number;
  ghost90: number;
};

type RankItem = {
  label: string;
  value: number;
  percent: number;
};

type AnalyticsDrilldown = {
  id: string;
  title: string;
  description: string;
  accentColor?: string;
  tabs: TabMemory[];
};

function AnalyticsPanel({ snapshot, refresh }: { snapshot: AppSnapshot; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const labels = getAnalyticsLabels(language);
  const [drilldown, setDrilldown] = useState<AnalyticsDrilldown | null>(null);
  const analytics = useMemo(() => buildAnalytics(snapshot), [snapshot]);
  const topType = analytics.typeShare[0];
  const ghostIds = useMemo(() => new Set(snapshot.ghostTabs.map((tab) => tab.id)), [snapshot.ghostTabs]);
  const sortRecent = (tabs: TabMemory[]) => [...tabs].sort((a, b) => b.lastActivatedAt - a.lastActivatedAt);
  const openActivityDrilldown = (week: AnalyticsWeek, type: ContentType) => {
    const typeLabel = enumMeta("contentType", type, language).label;
    const tabs = sortRecent(snapshot.tabs.filter((tab) => tab.openedAt >= week.start && tab.openedAt < week.end && tab.card.contentType === type));
    setDrilldown({
      id: `activity-${week.key}-${type}`,
      title: `${typeLabel} · ${week.label}`,
      description: `${labels.addedLinks}: ${tabs.length}`,
      accentColor: analyticsTypeColors[type],
      tabs
    });
  };
  const openTypeDrilldown = (type: ContentType) => {
    const typeLabel = enumMeta("contentType", type, language).label;
    const tabs = sortRecent(snapshot.tabs.filter((tab) => tab.card.contentType === type));
    setDrilldown({
      id: `type-${type}`,
      title: typeLabel,
      description: `${labels.linkShare}: ${tabs.length} ${t.links}`,
      accentColor: analyticsTypeColors[type],
      tabs
    });
  };
  const openGhostDrilldown = (week: AnalyticsWeek, bucket: GhostBucket) => {
    const tabs = sortRecent(snapshot.tabs.filter((tab) => tab.lastActivatedAt >= week.start && tab.lastActivatedAt < week.end && getGhostBucket(tab) === bucket));
    setDrilldown({
      id: `ghost-${week.key}-${bucket}`,
      title: `${ghostBucketLabel(bucket, labels)} · ${week.label}`,
      description: `${labels.ghostLinks}: ${tabs.length}`,
      accentColor: ghostBucketColor(bucket),
      tabs
    });
  };
  const openDomainDrilldown = (item: RankItem, ghostOnly = false) => {
    const domain = item.label;
    const sourceTabs = ghostOnly ? snapshot.ghostTabs : snapshot.tabs;
    const tabs = sortRecent(sourceTabs.filter((tab) => tab.domain === domain));
    setDrilldown({
      id: `${ghostOnly ? "ghost-domain" : "domain"}-${domain}`,
      title: domain,
      description: ghostOnly
        ? `${labels.ghostLinks}: ${tabs.length} ${t.links}`
        : `${labels.domainLinks}: ${tabs.length} ${t.links} · ${labels.domainVisits}: ${formatNumber(item.value)}`,
      tabs
    });
  };
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AnalyticsMetric icon={<Database className="h-4 w-4" />} label={labels.totalLinks} value={snapshot.totalTabs} detail={labels.localMemory} />
        <AnalyticsMetric icon={<TrendingUp className="h-4 w-4" />} label={labels.weeklyNew} value={analytics.weeklyNew} detail={formatDelta(analytics.weeklyNew, analytics.previousWeeklyNew, language)} />
        <AnalyticsMetric icon={<Eye className="h-4 w-4" />} label={labels.weeklyVisits} value={analytics.weeklyVisits} detail={formatDelta(analytics.weeklyVisits, analytics.previousWeeklyVisits, language)} />
        <AnalyticsMetric icon={<Ghost className="h-4 w-4" />} label={labels.ghostLinks} value={snapshot.ghostTabs.length} detail={formatPercent(snapshot.ghostTabs.length, Math.max(snapshot.totalTabs, 1), language)} />
        <AnalyticsMetric icon={<Archive className="h-4 w-4" />} label={labels.archivedLinks} value={snapshot.archivedTabs.length} detail={formatPercent(snapshot.archivedTabs.length, Math.max(snapshot.totalTabs, 1), language)} />
        <AnalyticsMetric icon={<Sparkles className="h-4 w-4" />} label={labels.cleanupCandidates} value={analytics.cleanupCandidates} detail={labels.duplicates.replace("{count}", String(analytics.duplicateLinks))} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <StackedActivityChart weeks={analytics.weeks} labels={labels} language={language} onDrilldown={openActivityDrilldown} />
        <TypeShareCard typeShare={analytics.typeShare} topType={topType} labels={labels} language={language} onDrilldown={openTypeDrilldown} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <GhostTrendChart weeks={analytics.weeks} labels={labels} onDrilldown={openGhostDrilldown} />
        <div className="grid gap-5">
          <RankingCard icon={<BarChart3 className="h-4 w-4" />} title={labels.topDomains} description={labels.topDomainsDescription} items={analytics.topVisitDomains} emptyLabel={labels.noData} onDrilldown={(item) => openDomainDrilldown(item)} />
          <RankingCard icon={<Ghost className="h-4 w-4" />} title={labels.ghostDomains} description={labels.ghostDomainsDescription} items={analytics.topGhostDomains} emptyLabel={labels.noData} onDrilldown={(item) => openDomainDrilldown(item, true)} />
        </div>
      </div>

      {drilldown ? (
        <AnalyticsDrilldownPanel
          drilldown={drilldown}
          refresh={refresh}
          ghostIds={ghostIds}
          emptyLabel={labels.noData}
          closeLabel={t.close}
          onClose={() => setDrilldown(null)}
        />
      ) : null}
    </div>
  );
}

function AnalyticsMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return (
    <Card>
      <CardContent className="grid gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-medium">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function StackedActivityChart({
  weeks,
  labels,
  language,
  onDrilldown
}: {
  weeks: AnalyticsWeek[];
  labels: AnalyticsLabels;
  language: UiLanguage;
  onDrilldown: (week: AnalyticsWeek, type: ContentType) => void;
}) {
  const [hoveredType, setHoveredType] = useState<ContentType | null>(null);
  const data = weeks.map((week) => ({
    weekKey: week.key,
    label: week.label,
    shortLabel: week.shortLabel,
    total: week.total,
    ...week.typeCounts
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {labels.topActivity}</CardTitle>
        <CardDescription>{labels.topActivityDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="shortLabel" tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={1} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <ChartTooltip shared={true} content={<ActivityChartTooltip labels={labels} language={language} hoveredType={hoveredType} />} cursor={false} />
              {analyticsTypeOrder.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="links"
                  fill={analyticsTypeColors[type]}
                  className="cursor-pointer"
                  opacity={hoveredType && hoveredType !== type ? 0.42 : 1}
                  activeBar={false}
                  onMouseEnter={() => setHoveredType(type)}
                  onMouseMove={() => setHoveredType(type)}
                  onMouseOver={() => setHoveredType(type)}
                  onMouseLeave={() => setHoveredType(null)}
                  onClick={(entry) => {
                    const week = weeks.find((item) => item.key === String(entry?.payload?.weekKey));
                    if (week && Number(entry?.payload?.[type] ?? 0) > 0) onDrilldown(week, type);
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TypeLegend language={language} />
      </CardContent>
    </Card>
  );
}

function TypeShareCard({
  typeShare,
  topType,
  labels,
  language,
  onDrilldown
}: {
  typeShare: RankItem[];
  topType?: RankItem;
  labels: AnalyticsLabels;
  language: UiLanguage;
  onDrilldown: (type: ContentType) => void;
}) {
  const [hoveredType, setHoveredType] = useState<ContentType | null>(null);
  const topTypeLabel = topType ? enumMeta("contentType", topType.label, language).label : "";
  const shareRow = typeShare.reduce<Record<string, string | number>>((row, item) => {
    row[item.label] = item.percent;
    return row;
  }, { name: labels.linkShare });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PieChart className="h-4 w-4" /> {labels.linkShare}</CardTitle>
        <CardDescription>{topType ? labels.linkShareDescription.replace("{type}", topTypeLabel).replace("{percent}", `${topType.percent.toFixed(1)}%`) : labels.noData}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-20 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[shareRow]} layout="vertical" margin={{ top: 10, right: 8, bottom: 10, left: 8 }}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="name" hide />
              <ChartTooltip shared={true} content={<ShareChartTooltip language={language} hoveredType={hoveredType} />} cursor={false} />
              {analyticsTypeOrder.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="share"
                  fill={analyticsTypeColors[type]}
                  className="cursor-pointer"
                  opacity={hoveredType && hoveredType !== type ? 0.42 : 1}
                  activeBar={false}
                  onMouseEnter={() => setHoveredType(type)}
                  onMouseMove={() => setHoveredType(type)}
                  onMouseOver={() => setHoveredType(type)}
                  onMouseLeave={() => setHoveredType(null)}
                  onClick={(entry) => {
                    if (Number(entry?.payload?.[type] ?? 0) > 0) onDrilldown(type);
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3">
          {typeShare.map((item, index) => {
            const type = item.label as ContentType;
            return (
              <button key={item.label} type="button" className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md py-0.5 text-left text-sm hover:bg-muted/40" onClick={() => onDrilldown(type)}>
                <span className="text-right text-muted-foreground">{index + 1}.</span>
                <span className="flex min-w-0 items-center gap-2 truncate font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: analyticsTypeColors[type] }} />
                  {enumMeta("contentType", type, language).label}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{item.value} · {item.percent.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GhostTrendChart({ weeks, labels, onDrilldown }: { weeks: AnalyticsWeek[]; labels: AnalyticsLabels; onDrilldown: (week: AnalyticsWeek, bucket: GhostBucket) => void }) {
  const [hoveredBucket, setHoveredBucket] = useState<GhostBucket | null>(null);
  const data = weeks.map((week) => ({
    weekKey: week.key,
    label: week.label,
    shortLabel: week.shortLabel,
    [labels.inactive7]: week.ghost7,
    [labels.inactive30]: week.ghost30,
    [labels.inactive90]: week.ghost90
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ghost className="h-4 w-4" /> {labels.ghostTrend}</CardTitle>
        <CardDescription>{labels.ghostTrendDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="shortLabel" tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={1} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <ChartTooltip shared={true} content={<GhostChartTooltip labels={labels} hoveredBucket={hoveredBucket} />} cursor={false} />
              <Bar dataKey={labels.inactive7} stackId="ghosts" fill={ghostBucketColor("7d")} className="cursor-pointer" opacity={hoveredBucket && hoveredBucket !== "7d" ? 0.42 : 1} activeBar={false} onMouseEnter={() => setHoveredBucket("7d")} onMouseMove={() => setHoveredBucket("7d")} onMouseOver={() => setHoveredBucket("7d")} onMouseLeave={() => setHoveredBucket(null)} onClick={(entry) => handleGhostBarClick(entry, weeks, labels.inactive7, "7d", onDrilldown)} />
              <Bar dataKey={labels.inactive30} stackId="ghosts" fill={ghostBucketColor("30d")} className="cursor-pointer" opacity={hoveredBucket && hoveredBucket !== "30d" ? 0.42 : 1} activeBar={false} onMouseEnter={() => setHoveredBucket("30d")} onMouseMove={() => setHoveredBucket("30d")} onMouseOver={() => setHoveredBucket("30d")} onMouseLeave={() => setHoveredBucket(null)} onClick={(entry) => handleGhostBarClick(entry, weeks, labels.inactive30, "30d", onDrilldown)} />
              <Bar dataKey={labels.inactive90} stackId="ghosts" fill={ghostBucketColor("90d")} className="cursor-pointer" opacity={hoveredBucket && hoveredBucket !== "90d" ? 0.42 : 1} activeBar={false} radius={[3, 3, 0, 0]} onMouseEnter={() => setHoveredBucket("90d")} onMouseMove={() => setHoveredBucket("90d")} onMouseOver={() => setHoveredBucket("90d")} onMouseLeave={() => setHoveredBucket(null)} onClick={(entry) => handleGhostBarClick(entry, weeks, labels.inactive90, "90d", onDrilldown)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <LegendDot color="#94a3b8" label={labels.inactive7} />
          <LegendDot color="#f59e0b" label={labels.inactive30} />
          <LegendDot color="#f43f5e" label={labels.inactive90} />
        </div>
      </CardContent>
    </Card>
  );
}

function RankingCard({
  icon,
  title,
  description,
  items,
  emptyLabel,
  onDrilldown
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: RankItem[];
  emptyLabel: string;
  onDrilldown?: (item: RankItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length ? items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md py-1 text-left text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onDrilldown?.(item)}
          >
            <span className="text-right text-muted-foreground">{index + 1}.</span>
            <div className="min-w-0">
              <div className="truncate font-medium">{item.label}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(item.percent, 4)}%` }} />
              </div>
            </div>
            <div className="text-right tabular-nums text-muted-foreground">
              <div>{formatNumber(item.value)}</div>
              <div className="text-xs">{item.percent.toFixed(1)}%</div>
            </div>
          </button>
        )) : <div className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>}
      </CardContent>
    </Card>
  );
}

function AnalyticsDrilldownPanel({
  drilldown,
  refresh,
  ghostIds,
  emptyLabel,
  closeLabel,
  onClose
}: {
  drilldown: AnalyticsDrilldown;
  refresh: () => Promise<void>;
  ghostIds: Set<string>;
  emptyLabel: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const drilldownLabel = language === "zh" ? "下钻结果" : "Drilldown";
  return (
    <div className="analytics-drilldown-backdrop fixed inset-0 z-40 bg-background/45 backdrop-blur-[1px]" onClick={onClose}>
      <aside
        className="analytics-drilldown-drawer fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-xl flex-col overflow-x-hidden border-l bg-background shadow-xl sm:w-[560px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{drilldownLabel}</span>
              {drilldown.accentColor ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: drilldown.accentColor }} /> : null}
            </div>
            <h3 className="break-words text-lg font-semibold leading-6">{drilldown.title}</h3>
            <p className="mt-1 break-words text-sm font-medium text-foreground/75">{drilldown.description}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>{closeLabel}</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
          {drilldown.tabs.length ? (
            <div className="grid gap-2">
              {drilldown.tabs.map((tab) => (
                <AnalyticsDrilldownRow key={tab.id} tab={tab} refresh={refresh} isGhost={ghostIds.has(tab.id)} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {drilldown.tabs.length} {t.links}
        </div>
      </aside>
    </div>
  );
}

function AnalyticsDrilldownRow({ tab, refresh, isGhost }: { tab: TabMemory; refresh: () => Promise<void>; isGhost: boolean }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const [restoring, setRestoring] = useState(false);
  const [copying, setCopying] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const contentType = enumMeta("contentType", tab.card.contentType, language).label;
  const source = enumMeta("source", tab.card.source, language).label;
  const importance = enumMeta("importance", tab.card.importance, language).label;
  const readingStatus = enumMeta("readingStatus", tab.card.readingStatus, language).label;
  const status = tab.archived ? t.archived : isGhost ? t.ghostStatus : t.active;
  const tags = Array.from(new Set([...tab.card.topics, ...tab.card.entities])).filter(Boolean).slice(0, 4);
  const imagePreviewUrl = tab.card.contentType === "image" ? tab.card.previewImageUrl ?? (isDirectImageUrl(tab.url) ? tab.url : undefined) : undefined;
  const imagePreviewUnavailable = language === "zh" ? "暂无可用图片预览" : "No image preview available";

  const openTab = async () => {
    setRestoring(true);
    try {
      await restoreTab(tab.id);
      await refresh();
    } finally {
      setRestoring(false);
    }
  };

  const copyUrl = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(tab.url);
      notify(t.copied);
    } catch {
      notify(t.copyFailed);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-card p-3 text-sm">
      <div className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3">
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border bg-muted text-xs font-semibold uppercase text-muted-foreground">
          {tab.favIconUrl ? <img src={tab.favIconUrl} alt="" className="h-5 w-5 object-contain favicon-image" /> : tab.domain.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            className="block w-full min-w-0 whitespace-normal break-words text-left font-medium leading-5 text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={openTab}
            title={tab.url}
          >
            {tab.title}
          </button>
          <p className="mt-1 break-all text-xs text-muted-foreground">{tab.domain}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <AsyncButton
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={t.reopen}
            aria-label={t.reopen}
            busy={restoring}
            onClick={openTab}
          >
            <ArrowUpRight className="h-4 w-4" />
          </AsyncButton>
          <AsyncButton
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={t.copy}
            aria-label={t.copy}
            busy={copying}
            onClick={copyUrl}
          >
            <Copy className="h-4 w-4" />
          </AsyncButton>
        </div>
      </div>
      <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{tab.card.summary}</p>
      {imagePreviewUrl && !imagePreviewFailed ? (
        <button
          type="button"
          className="mt-3 block w-full overflow-hidden rounded-md border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={openTab}
          title={tab.title}
        >
          <img
            src={imagePreviewUrl}
            alt={tab.title}
            className="max-h-64 w-full object-contain"
            loading="lazy"
            onError={() => setImagePreviewFailed(true)}
          />
        </button>
      ) : tab.card.contentType === "image" ? (
        <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {imagePreviewUnavailable}
        </div>
      ) : null}
      {tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => <Badge key={tag} variant="secondary" className="max-w-full break-words px-1.5 py-0 text-[11px] whitespace-normal">{tag}</Badge>)}
        </div>
      ) : null}
      <div className="mt-3 grid min-w-0 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        <span className="min-w-0 break-words">{t.type}: <span className="font-medium text-foreground">{contentType}</span></span>
        <span className="min-w-0 break-words">{t.status}: <span className="font-medium text-foreground">{status}</span></span>
        <span className="min-w-0 break-words">{t.from}: <span className="font-medium text-foreground">{source}</span></span>
        <span className="min-w-0 break-words">{t.importance}: <span className="font-medium text-foreground">{importance}</span></span>
        <span className="min-w-0 break-words">{t.readingStatus}: <span className="font-medium text-foreground">{readingStatus}</span></span>
        <span className="min-w-0 break-words">{t.lastActive}: <span className="font-medium text-foreground">{formatTime(tab.lastActivatedAt, Date.now(), language)}</span></span>
        <span className="min-w-0 break-words">{t.opened}: <span className="font-medium text-foreground">{formatAbsoluteDateTime(tab.openedAt)}</span></span>
        <span className="min-w-0 break-words">{t.activity}: <span className="font-medium text-foreground">{Math.round(tab.signals.activeMs / 60000)}m · {tab.signals.activationCount}x</span></span>
      </div>
      <p className="mt-2 break-all text-xs text-muted-foreground">{tab.url}</p>
    </div>
  );
}

function TypeLegend({ language }: { language: UiLanguage }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {analyticsTypeOrder.map((type) => (
        <LegendDot key={type} color={analyticsTypeColors[type]} label={enumMeta("contentType", type, language).label} />
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

type ChartPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  payload?: Record<string, unknown>;
};

type AnalyticsTooltipProps = {
  active?: boolean;
  payload?: ChartPayloadItem[];
};

type GhostBucket = "7d" | "30d" | "90d";

function chartPayloadValue(item?: ChartPayloadItem) {
  if (!item) return 0;
  const key = item.dataKey == null ? "" : String(item.dataKey);
  const rawValue = key ? item.payload?.[key] ?? item.value : item.value;
  if (Array.isArray(rawValue)) {
    const values = rawValue.map(Number).filter(Number.isFinite);
    if (values.length >= 2) return Math.max(0, values[values.length - 1] - values[0]);
    return values[0] ?? 0;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
}

function positiveTooltipItems(payload: ChartPayloadItem[] | undefined) {
  return (payload ?? []).filter((entry) => chartPayloadValue(entry) > 0);
}

function ActivityChartTooltip({
  active,
  payload,
  labels,
  language,
  hoveredType
}: AnalyticsTooltipProps & { labels: AnalyticsLabels; language: UiLanguage; hoveredType: ContentType | null }) {
  if (!active || !payload?.length) return null;
  const items = positiveTooltipItems(payload).sort((left, right) => analyticsTypeOrder.indexOf(String(left.dataKey ?? "") as ContentType) - analyticsTypeOrder.indexOf(String(right.dataKey ?? "") as ContentType));
  if (!items.length) return null;
  const row = items[0]?.payload ?? {};
  return (
    <ChartTooltipBox>
      <div className="font-medium">{String(row.label ?? "")}</div>
      <div className="text-muted-foreground">{labels.addedLinks}: {String(row.total ?? 0)}</div>
      <div className="mt-2 grid gap-1">
        {items.map((item) => {
          const type = String(item.dataKey ?? "") as ContentType;
          const label = analyticsTypeOrder.includes(type) ? enumMeta("contentType", type, language).label : String(item.name ?? item.dataKey ?? "");
          return (
            <ChartTooltipRow
              key={String(item.dataKey ?? label)}
              color={analyticsTypeColors[type] ?? item.color}
              label={label}
              value={String(chartPayloadValue(item))}
              active={hoveredType === type}
            />
          );
        })}
      </div>
    </ChartTooltipBox>
  );
}

function ShareChartTooltip({
  active,
  payload,
  language,
  hoveredType
}: AnalyticsTooltipProps & { language: UiLanguage; hoveredType: ContentType | null }) {
  if (!active || !payload?.length) return null;
  const items = positiveTooltipItems(payload).sort((left, right) => analyticsTypeOrder.indexOf(String(left.dataKey ?? "") as ContentType) - analyticsTypeOrder.indexOf(String(right.dataKey ?? "") as ContentType));
  if (!items.length) return null;
  return (
    <ChartTooltipBox>
      <div className="grid gap-1">
        {items.map((item) => {
          const type = String(item.dataKey ?? "") as ContentType;
          const label = analyticsTypeOrder.includes(type) ? enumMeta("contentType", type, language).label : String(item.name ?? item.dataKey ?? "");
          return (
            <ChartTooltipRow
              key={String(item.dataKey ?? label)}
              color={analyticsTypeColors[type] ?? item.color}
              label={label}
              value={`${chartPayloadValue(item).toFixed(1)}%`}
              active={hoveredType === type}
            />
          );
        })}
      </div>
    </ChartTooltipBox>
  );
}

function GhostChartTooltip({
  active,
  payload,
  labels,
  hoveredBucket
}: AnalyticsTooltipProps & { labels: AnalyticsLabels; hoveredBucket: GhostBucket | null }) {
  if (!active || !payload?.length) return null;
  const items = positiveTooltipItems(payload);
  if (!items.length) return null;
  const row = items[0]?.payload ?? {};
  const hoveredLabel = hoveredBucket ? ghostBucketLabel(hoveredBucket, labels) : undefined;
  return (
    <ChartTooltipBox>
      <div className="font-medium">{String(row.label ?? "")}</div>
      <div className="mt-2 grid gap-1">
        {items.map((item) => {
          const label = String(item.dataKey ?? "");
          return (
            <ChartTooltipRow
              key={label}
              color={item.color}
              label={label}
              value={String(chartPayloadValue(item))}
              active={hoveredLabel === label}
            />
          );
        })}
      </div>
    </ChartTooltipBox>
  );
}

function ChartTooltipRow({ color, label, value, active }: { color?: string; label: string; value: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded px-2 py-1 text-foreground", active ? "bg-muted/70 font-semibold" : "font-medium")}>
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function handleGhostBarClick(
  entry: { payload?: Record<string, unknown> } | undefined,
  weeks: AnalyticsWeek[],
  dataKey: string,
  bucket: GhostBucket,
  onDrilldown: (week: AnalyticsWeek, bucket: GhostBucket) => void
) {
  const week = weeks.find((item) => item.key === String(entry?.payload?.weekKey));
  if (week && Number(entry?.payload?.[dataKey] ?? 0) > 0) onDrilldown(week, bucket);
}

function getGhostBucket(tab: TabMemory, now = Date.now()): GhostBucket | undefined {
  if (now - tab.lastActivatedAt < 7 * 24 * 60 * 60 * 1000) return undefined;
  const inactiveDays = Math.floor((now - tab.lastActivatedAt) / (24 * 60 * 60 * 1000));
  if (inactiveDays >= 90) return "90d";
  if (inactiveDays >= 30) return "30d";
  return "7d";
}

function ghostBucketLabel(bucket: GhostBucket, labels: AnalyticsLabels) {
  if (bucket === "90d") return labels.inactive90;
  if (bucket === "30d") return labels.inactive30;
  return labels.inactive7;
}

function ghostBucketColor(bucket: GhostBucket) {
  if (bucket === "90d") return "#f43f5e";
  if (bucket === "30d") return "#f59e0b";
  return "#94a3b8";
}

function ghostBucketFromLabel(label: string, labels: AnalyticsLabels): GhostBucket | undefined {
  if (label === labels.inactive90) return "90d";
  if (label === labels.inactive30) return "30d";
  if (label === labels.inactive7) return "7d";
  return undefined;
}

function ChartTooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-44 rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      {children}
    </div>
  );
}

type AnalyticsLabels = ReturnType<typeof getAnalyticsLabels>;

function getAnalyticsLabels(language: UiLanguage) {
  if (language === "zh") {
    return {
      totalLinks: "总链接",
      weeklyNew: "本周新增",
      weeklyVisits: "本周访问",
      ghostLinks: "幽灵链接",
      archivedLinks: "已归档",
      cleanupCandidates: "清理候选",
      localMemory: "本地记忆",
      duplicates: "{count} 个重复链接",
      topActivity: "链接活动趋势",
      topActivityDescription: "最近 12 周新增链接趋势，按链接类型堆叠。",
      addedLinks: "新增链接",
      linkShare: "链接类型占比",
      linkShareDescription: "{type} 当前占比最高，占 {percent}。",
      ghostTrend: "幽灵链接趋势",
      ghostTrendDescription: "按最近活跃时间分层，观察哪些链接正在沉入坟场。",
      inactive7: "7 天未访问",
      inactive30: "30 天未访问",
      inactive90: "90 天未访问",
      topDomains: "访问最多域名",
      topDomainsDescription: "按累计激活次数排序。",
      domainLinks: "链接",
      domainVisits: "访问次数",
      ghostDomains: "幽灵最多域名",
      ghostDomainsDescription: "最容易沉睡的来源。",
      noData: "暂无数据"
    };
  }
  return {
    totalLinks: "Total links",
    weeklyNew: "New this week",
    weeklyVisits: "Visits this week",
    ghostLinks: "Ghost links",
    archivedLinks: "Archived",
    cleanupCandidates: "Cleanup candidates",
    localMemory: "Local memory",
    duplicates: "{count} duplicates",
    topActivity: "Link Activity",
    topActivityDescription: "New links over the last 12 weeks, stacked by link type.",
    addedLinks: "Added links",
    linkShare: "Link Type Share",
    linkShareDescription: "{type} is the largest current share at {percent}.",
    ghostTrend: "Ghost Link Trend",
    ghostTrendDescription: "Inactive link cohorts by last active week.",
    inactive7: "7d inactive",
    inactive30: "30d inactive",
    inactive90: "90d inactive",
    topDomains: "Top domains",
    topDomainsDescription: "Ranked by total activation count.",
    domainLinks: "Links",
    domainVisits: "Visits",
    ghostDomains: "Ghost domains",
    ghostDomainsDescription: "Sources most likely to go stale.",
    noData: "No data"
  };
}

function buildAnalytics(snapshot: AppSnapshot) {
  const now = Date.now();
  const currentWeekStart = startOfWeekTimestamp(now);
  const previousWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const start = currentWeekStart - (11 - index) * 7 * 24 * 60 * 60 * 1000;
    const end = start + 7 * 24 * 60 * 60 * 1000;
    return createAnalyticsWeek(start, end);
  });
  const weekByStart = new Map(weeks.map((week) => [week.start, week]));
  const ghostIds = new Set(snapshot.ghostTabs.map((tab) => tab.id));
  const urlCounts = new Map<string, number>();
  const typeTotals = createTypeCounts();
  const visitDomainScores = new Map<string, number>();
  const ghostDomainScores = new Map<string, number>();

  for (const tab of snapshot.tabs) {
    const normalizedUrl = normalizeAnalyticsUrl(tab.url);
    urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) ?? 0) + 1);
    typeTotals[tab.card.contentType] += 1;
    visitDomainScores.set(tab.domain, (visitDomainScores.get(tab.domain) ?? 0) + Math.max(1, tab.signals.activationCount));
    if (ghostIds.has(tab.id)) ghostDomainScores.set(tab.domain, (ghostDomainScores.get(tab.domain) ?? 0) + 1);

    const openedWeek = weekByStart.get(startOfWeekTimestamp(tab.openedAt));
    if (openedWeek) {
      openedWeek.typeCounts[tab.card.contentType] += 1;
      openedWeek.total += 1;
    }

    const lastActiveWeek = weekByStart.get(startOfWeekTimestamp(tab.lastActivatedAt));
    if (lastActiveWeek && now - tab.lastActivatedAt >= 7 * 24 * 60 * 60 * 1000) {
      const inactiveDays = Math.floor((now - tab.lastActivatedAt) / (24 * 60 * 60 * 1000));
      if (inactiveDays >= 90) lastActiveWeek.ghost90 += 1;
      else if (inactiveDays >= 30) lastActiveWeek.ghost30 += 1;
      else lastActiveWeek.ghost7 += 1;
    }
  }

  const duplicateLinks = Array.from(urlCounts.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const weeklyNew = snapshot.tabs.filter((tab) => tab.openedAt >= currentWeekStart).length;
  const previousWeeklyNew = snapshot.tabs.filter((tab) => tab.openedAt >= previousWeekStart && tab.openedAt < currentWeekStart).length;
  const weeklyVisits = snapshot.tabs.filter((tab) => tab.lastActivatedAt >= currentWeekStart).length;
  const previousWeeklyVisits = snapshot.tabs.filter((tab) => tab.lastActivatedAt >= previousWeekStart && tab.lastActivatedAt < currentWeekStart).length;
  const typeShare = analyticsTypeOrder
    .map((type) => ({
      label: type,
      value: typeTotals[type],
      percent: typeTotals[type] / Math.max(snapshot.totalTabs, 1) * 100
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    weeks,
    weeklyNew,
    previousWeeklyNew,
    weeklyVisits,
    previousWeeklyVisits,
    duplicateLinks,
    cleanupCandidates: snapshot.ghostTabs.length + duplicateLinks,
    typeShare,
    topVisitDomains: rankMap(visitDomainScores, 5),
    topGhostDomains: rankMap(ghostDomainScores, 5)
  };
}

function createAnalyticsWeek(start: number, end: number): AnalyticsWeek {
  const date = new Date(start);
  const label = `${formatDate(date)} - ${formatDate(new Date(end - 1))}`;
  return {
    key: String(start),
    label,
    shortLabel: `${date.getMonth() + 1}/${date.getDate()}`,
    start,
    end,
    total: 0,
    typeCounts: createTypeCounts(),
    ghost7: 0,
    ghost30: 0,
    ghost90: 0
  };
}

function createTypeCounts(): Record<ContentType, number> {
  return {
    article: 0,
    video: 0,
    pdf: 0,
    tweet: 0,
    repo: 0,
    doc: 0,
    image: 0,
    saas: 0
  };
}

function startOfWeekTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date.getTime();
}

function normalizeAnalyticsUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function isDirectImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(parsed.pathname);
  } catch {
    return /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(url);
  }
}

function rankMap(map: Map<string, number>, limit: number): RankItem[] {
  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, percent: value / Math.max(total, 1) * 100 }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number, total: number, language: UiLanguage) {
  const percent = value / Math.max(total, 1) * 100;
  return language === "zh" ? `占比 ${percent.toFixed(1)}%` : `${percent.toFixed(1)}% share`;
}

function formatDelta(value: number, previous: number, language: UiLanguage) {
  const delta = value - previous;
  if (delta === 0) return language === "zh" ? "与上周持平" : "Flat vs last week";
  const prefix = delta > 0 ? "+" : "";
  return language === "zh" ? `较上周 ${prefix}${delta}` : `${prefix}${delta} vs last week`;
}

function TabCount({ value }: { value: number }) {
  return (
    <span className="ml-1 rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {value}
    </span>
  );
}

function AsyncButton({
  busy,
  busyLabel,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean; busyLabel?: string }) {
  return (
    <Button disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyLabel}
        </>
      ) : children}
    </Button>
  );
}

function PendingBlock({ title, description, steps, className }: { title: string; description?: string; steps?: string[]; className?: string }) {
  return (
    <div className={cn("grid gap-3 rounded-md border bg-muted/20 p-3 text-sm", className)} aria-busy="true" aria-live="polite">
      <div className="flex min-w-0 items-start gap-2">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {description ? <p className="mt-0.5 text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {steps?.length ? (
        <div className="grid gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", index === 0 ? "bg-primary" : "bg-muted-foreground/40")} />
              <span>{step}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <div className="h-2 w-2/3 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-2 w-5/6 animate-pulse rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

function StatusCallout({
  variant = "info",
  title,
  description,
  action
}: {
  variant?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    error: "border-destructive/30 bg-destructive/10 text-destructive"
  };
  const Icon = variant === "success" ? CheckCircle2 : variant === "error" || variant === "warning" ? AlertCircle : Sparkles;
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm", styles[variant])} role={variant === "error" ? "alert" : "status"} aria-live="polite">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {description ? <p className="mt-0.5 text-current/75">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function RecallSynthesis({ query, results, snapshot, isSearching }: { query: string; results: RecallResult[]; snapshot: AppSnapshot; isSearching: boolean }) {
  const { language, t } = useI18n();
  const [synthesis, setSynthesis] = useState<RecallSynthesisResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const aiAvailable = canUseAiFeatures(snapshot.settings);
  const aiCues = results.find((tab) => tab.aiCues?.length)?.aiCues?.slice(0, 8) ?? [];
  const clarifications = results.find((tab) => tab.aiClarifications?.length)?.aiClarifications?.slice(0, 3) ?? [];
  const fallbackReason = results.find((tab) => tab.aiRecallStatus === "fallback")?.aiFallbackReason;

  useEffect(() => {
    setSynthesis(null);
    setSummaryError(null);
  }, [query, results.map((tab) => tab.id).join("|")]);

  if (!query.trim()) return null;
  if (isSearching) {
    return (
      <PendingBlock
        className="self-start"
        title={t.searchPendingTitle}
        description={t.searchPendingDescription}
        steps={[t.searching, t.matchedCues, t.tabSummaries]}
      />
    );
  }
  const topTopics = Array.from(new Set(results.flatMap((tab) => tab.card.topics))).slice(0, 4);
  const topSources = Array.from(new Set(results.map((tab) => enumMeta("source", tab.card.source, language).label))).slice(0, 3);
  return (
    <div className="grid gap-2">
      <div className="flex min-h-9 self-start flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <span className="font-medium">{results.length ? `${results.length} ${t.memoryMatch}` : t.noResults}</span>
        <span className="min-w-0 truncate text-muted-foreground">
          {results.length
            ? `${topTopics.join(", ") || "general"} · ${topSources.join(", ") || "mixed"} · ${results.filter((tab) => tab.archived).length} archived`
            : `Memory contains ${snapshot.tabs.length} tabs.`}
        </span>
        {aiCues.length ? <span className="font-medium text-muted-foreground">{t.aiCues}</span> : null}
        {aiCues.map((cue) => <Badge key={`${cue.type}-${cue.value}`} variant="outline">{formatRecallCue(cue, language)}</Badge>)}
        {!aiCues.length ? clarifications.map((cue) => <Badge key={cue} variant="outline">{cue}</Badge>) : null}
        {aiAvailable && results.length ? (
          <AsyncButton
            variant="outline"
            size="sm"
            className="h-7"
            busy={isSummarizing}
            busyLabel={t.summarizingTabs}
            onClick={async () => {
              setIsSummarizing(true);
              setSummaryError(null);
              try {
                setSynthesis(await summarizeRecall(query, results.slice(0, 24).map((tab) => tab.id)));
              } catch (error) {
                setSummaryError(error instanceof Error ? error.message : t.summaryFailed);
              } finally {
                setIsSummarizing(false);
              }
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> {t.summarizeTabs}
          </AsyncButton>
        ) : null}
      </div>
      {isSummarizing ? (
        <PendingBlock title={t.summaryPendingTitle} description={t.summaryPendingDescription} steps={[t.summaryStepRead, t.summaryStepGenerate, t.summaryStepFinish]} />
      ) : null}
      {fallbackReason ? <StatusCallout variant="warning" title={t.aiRecallFallback} description={fallbackReason} /> : null}
      {results[0]?.aiRankReason ? <StatusCallout title={t.aiIntent} description={results[0].aiRankReason} /> : null}
      {summaryError ? (
        <StatusCallout
          variant="error"
          title={t.summaryFailed}
          description={summaryError}
          action={<Button variant="outline" size="sm" onClick={() => setSummaryError(null)}>{t.close}</Button>}
        />
      ) : null}
      {synthesis ? <RecallSummaryCard synthesis={synthesis} /> : null}
    </div>
  );
}

function RecallSummaryCard({ synthesis }: { synthesis: RecallSynthesisResult }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 rounded-md bg-emerald-50/60 p-4 text-sm dark:bg-emerald-400/10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground/75">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {t.summaryReady}
        </span>
        <span>{synthesis.tabCount} {t.links}</span>
        {synthesis.topics.length ? (
          <span className="truncate">{synthesis.topics.join(", ")}</span>
        ) : null}
        <span className="min-w-0 flex-1 truncate text-right">{t.summarySourceNote}</span>
      </div>
      <p className="text-base leading-7 text-foreground">{synthesis.summary}</p>
      {synthesis.bullets.length || synthesis.gaps.length ? (
        <div className="grid gap-3 rounded-md border bg-muted/30 px-3 py-3">
          {synthesis.bullets.length ? (
            <div className="grid gap-1.5">
              <div className="text-xs font-semibold text-muted-foreground">{t.summaryHighlights}</div>
              <ul className="grid gap-1.5">
                {synthesis.bullets.map((item) => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>)}
              </ul>
            </div>
          ) : null}
          {synthesis.gaps.length ? (
            <div className="grid gap-1.5">
              <div className="text-xs font-semibold text-muted-foreground">{t.researchGaps}</div>
              <ul className="grid gap-1.5">
                {synthesis.gaps.map((item) => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatRecallCue(cue: NonNullable<RecallResult["aiCues"]>[number], language: UiLanguage) {
  const labels: Record<typeof cue.type, { en: string; zh: string }> = {
    time: { en: "Time", zh: "时间" },
    source: { en: "Source", zh: "来源" },
    domain: { en: "Domain", zh: "域名" },
    topic: { en: "Topic", zh: "主题" },
    entity: { en: "Entity", zh: "实体" },
    contentType: { en: "Type", zh: "类型" },
    readingStatus: { en: "Reading", zh: "阅读" },
    importance: { en: "Importance", zh: "重要度" },
    task: { en: "Task", zh: "任务" },
    visual: { en: "Visual", zh: "视觉" },
    keyword: { en: "Keyword", zh: "关键词" }
  };
  const typeLabel = labels[cue.type][language];
  const value = cue.value || cue.label;
  return `${typeLabel}: ${value}`;
}

function GhostTabsPanel({ snapshot, tabs, refresh }: { snapshot: AppSnapshot; tabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const [dismissedPreviewId, setDismissedPreviewId] = useState<string | null>(null);
  const [archiveAction, setArchiveAction] = useState<"preview" | "cancel" | "confirm" | null>(null);
  const archivePreview = snapshot.archivePreview?.id === dismissedPreviewId ? undefined : snapshot.archivePreview;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader title={t.ghostTabs} description={t.ghostTabsDescription} />
        <AsyncButton
          disabled={!snapshot.ghostTabs.length}
          busy={archiveAction === "preview"}
          busyLabel={t.previewingArchive}
          onClick={async () => {
            setArchiveAction("preview");
            try {
              if (snapshot.settings.archiveTrustStage === "manual") await archiveGhosts();
              else await previewArchive();
              await refresh();
            } catch {
              notify(t.archiveFailed);
            } finally {
              setArchiveAction(null);
            }
          }}
        >
          <Ghost className="h-4 w-4" /> {snapshot.settings.archiveTrustStage === "manual" ? interpolate(t.archiveGhostTabs, { count: snapshot.ghostTabs.length }) : t.previewArchive}
        </AsyncButton>
      </div>
      {archiveAction === "preview" ? <PendingBlock title={t.previewingArchive} description={t.ghostTabsDescription} /> : null}
      {archivePreview ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>{interpolate(t.archiveGhostTabs, { count: archivePreview.tabIds.length })}</span>
          <div className="flex items-center gap-2">
            <AsyncButton
              variant="outline"
              size="sm"
              busy={archiveAction === "cancel"}
              busyLabel={t.cancellingArchive}
              onClick={async () => {
                setDismissedPreviewId(archivePreview.id);
                setArchiveAction("cancel");
                try {
                  await cancelArchivePreview();
                  await refresh();
                } catch {
                  setDismissedPreviewId(null);
                  notify(t.archiveFailed);
                } finally {
                  setArchiveAction(null);
                }
              }}
            >
              {t.cancelArchive}
            </AsyncButton>
            <AsyncButton
              size="sm"
              busy={archiveAction === "confirm"}
              busyLabel={t.confirmingArchive}
              onClick={async () => {
                setArchiveAction("confirm");
                try {
                  await confirmArchivePreview(archivePreview.id);
                  await refresh();
                } catch {
                  notify(t.archiveFailed);
                } finally {
                  setArchiveAction(null);
                }
              }}
            >
              {t.confirmArchive}
            </AsyncButton>
          </div>
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
  return `${t.recallReason}: ${t.matchedCues} ${cues} · ${buildWhyTip(tab, language).replace(/^为什么显示：|^Why this appears: /, "")}`;
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
  const { language, t } = useI18n();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<Record<string, RecallSynthesisResult>>({});
  const [summarizingSession, setSummarizingSession] = useState<string | null>(null);
  const [restoringSession, setRestoringSession] = useState<string | null>(null);
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const aiAvailable = canUseAiFeatures(snapshot.settings);
  const toggleExpanded = (id: string) => setExpanded((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  const ghostIds = useMemo(() => new Set(snapshot.ghostTabs.map((tab) => tab.id)), [snapshot.ghostTabs]);
  return (
    <div className="grid gap-2">
      {sessions.map((session) => {
        const sessionTabs = snapshot.tabs
          .filter((tab) => session.tabIds.includes(tab.id) && (!visibleTabIds || visibleTabIds.has(tab.id)))
          .sort((a, b) => b.lastActivatedAt - a.lastActivatedAt);
        const isSummarizingThisSession = summarizingSession === session.id;
        const sessionSummary = summaries[session.id] ?? session.aiSummary;
        const visibleSessionSummary = isSummarizingThisSession ? undefined : sessionSummary;
        const summaryStale = Boolean(session.aiSummary && session.aiSummarySourceHash && session.aiSummarySourceHash !== buildSessionSummarySourceHash(sessionTabs));
        const isExpanded = expanded.includes(session.id);
        const secondaryTopics = session.topics.filter((topic) => !sessionNameContainsTopic(session.name, topic));
        return (
        <div key={session.id} className={cn("overflow-hidden rounded-md border bg-background transition-colors", isExpanded ? "shadow-sm ring-1 ring-border/60" : "hover:bg-muted/15")}>
          <div className={cn("flex items-center justify-between gap-3 px-4 py-3 transition-colors", isExpanded ? "border-b bg-muted/40" : undefined)}>
            <button className="min-w-0 flex-1 text-left" aria-expanded={isExpanded} onClick={() => toggleExpanded(session.id)}>
              <span className="block truncate text-sm font-medium">
                {session.name}
              </span>
              <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {secondaryTopics.length ? (
                  <span className="truncate text-muted-foreground">
                    {t.tabLabels} <span className="text-foreground/75">{secondaryTopics.join(", ")}</span>
                  </span>
                ) : null}
                <span className="max-w-full truncate rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
                  {t.sessionSource} {session.sourceHint}
                </span>
                <span className="max-w-full truncate rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
                  {t.sessionTime} {formatSessionTimeRange(session.createdAt, session.updatedAt, language)}
                </span>
              </span>
            </button>
            <div className="flex shrink-0 flex-wrap gap-2">
                {aiAvailable && sessionTabs.length ? (
                  <AsyncButton
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title={sessionSummary ? t.regenerateSummary : t.summarizeTabs}
                    aria-label={sessionSummary ? t.regenerateSummary : t.summarizeTabs}
                    busy={isSummarizingThisSession}
	                    onClick={async () => {
                      setExpanded((prev) => (prev.includes(session.id) ? prev : [...prev, session.id]));
	                      setSummarizingSession(session.id);
	                      setSummaryErrors((prev) => ({ ...prev, [session.id]: "" }));
                      setSummaries((prev) => {
                        const next = { ...prev };
                        delete next[session.id];
                        return next;
                      });
	                      try {
	                        const summary = await summarizeRecall(session.name, undefined, session.id);
	                        setSummaries((prev) => ({ ...prev, [session.id]: summary }));
                        await refresh();
                      } catch (error) {
                        setSummaryErrors((prev) => ({ ...prev, [session.id]: error instanceof Error ? error.message : t.summaryFailed }));
                      } finally {
                        setSummarizingSession(null);
                      }
	                    }}
	                  >
                    <Sparkles className="h-4 w-4" />
	                  </AsyncButton>
                ) : null}
                <RenameSessionButton sessionId={session.id} currentName={session.name} refresh={refresh} />
                <AsyncButton
                  size="sm"
                  className="h-9"
                  busy={restoringSession === session.id}
                  busyLabel={t.restoreGroup}
                  onClick={async () => {
                    setRestoringSession(session.id);
                    try {
                      await restoreSession(session.id);
                      await refresh();
                    } finally {
                      setRestoringSession(null);
                    }
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" /> {t.restoreGroup}
                </AsyncButton>
            </div>
          </div>
          {isExpanded && isSummarizingThisSession ? (
            <div className="border-t bg-background p-3">
              <PendingBlock title={t.summaryPendingTitle} description={t.summaryPendingDescription} steps={[t.summaryStepRead, t.summaryStepGenerate, t.summaryStepFinish]} />
            </div>
          ) : null}
          {isExpanded && summaryErrors[session.id] ? (
            <div className="border-t bg-background p-3">
              <StatusCallout
                variant="error"
                title={t.summaryFailed}
                description={summaryErrors[session.id]}
                action={<Button variant="outline" size="sm" onClick={() => setSummaryErrors((prev) => ({ ...prev, [session.id]: "" }))}>{t.close}</Button>}
              />
            </div>
          ) : null}
          {isExpanded && !isSummarizingThisSession && summaryStale ? (
            <div className="border-t bg-background p-3">
              <StatusCallout variant="warning" title={t.summaryStale} description={t.summarySourceNote} />
            </div>
          ) : null}
          {isExpanded && visibleSessionSummary ? (
            <div className="border-t bg-background p-3">
              <RecallSummaryCard synthesis={visibleSessionSummary} />
            </div>
          ) : null}
          {isExpanded ? (
            <div className="bg-muted/25 p-2 sm:p-3">
              <TabList tabs={sessionTabs} refresh={refresh} showStatusBadge ghostIds={ghostIds} />
            </div>
          ) : null}
        </div>
        );
      })}
    </div>
  );
}

function buildSessionSummarySourceHash(tabs: TabMemory[]) {
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
      tab.signals.activeMs,
      tab.signals.activationCount,
      tab.signals.maxScrollPercent,
      tab.signals.copiedTextCount
    ].join("|"))
    .join("\n");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function formatSessionTimeRange(createdAt: number, updatedAt: number, language: UiLanguage) {
  const start = new Date(createdAt);
  const end = new Date(updatedAt);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return `${formatDate(start)} ${formatClock(start)}-${formatClock(end)}`;
  return `${formatDate(start)} ${formatClock(start)} - ${formatDate(end)} ${formatClock(end)}`;
}

function sessionNameContainsTopic(name: string, topic: string) {
  const normalizedName = name.toLowerCase();
  const normalizedTopic = topic.toLowerCase();
  return normalizedTopic.length > 1 && normalizedName.includes(normalizedTopic);
}

function formatAbsoluteDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${formatDate(date)} ${formatClock(date)}`;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatClock(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function Facets({ snapshot, filters, setFilters }: { snapshot: AppSnapshot; filters: RecallFilters; setFilters: React.Dispatch<React.SetStateAction<RecallFilters>> }) {
  const { language, t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const snapshotTopics = Array.from(new Set(snapshot.tabs.flatMap((tab) => tab.card.topics))).slice(0, 16);
  const snapshotEntities = Array.from(new Set(snapshot.tabs.flatMap((tab) => tab.card.entities))).slice(0, 16);
  const activeFilters = Object.entries(filters).filter(([, value]) => value != null && value !== "all" && value !== false);
  const resetFilters = () => setFilters({ archivedOnly: false, time: "all", source: "all", contentType: "all", importance: "all", readingStatus: "all", color: "all", topic: "all", entity: "all" });
  const clearFilter = (key: string) => setFilters((prev) => ({ ...prev, [key]: key === "archivedOnly" ? false : "all" }));
  return (
    <Card className="h-fit min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t.facets}</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!activeFilters.length} onClick={resetFilters}>{t.resetFilters}</Button>
        </div>
        <CardDescription>{activeFilters.length ? t.activeFilters : t.facetsDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        {activeFilters.length ? (
          <div className="flex flex-wrap gap-1">
            {activeFilters.map(([key, value]) => (
              <Badge key={key} variant="secondary" className="gap-1">
                {formatFilterBadge(key, String(value), language, t)}
                <button type="button" className="ml-0.5 rounded-sm px-0.5 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => clearFilter(key)} aria-label={`${t.resetFilters}: ${key}`}>×</button>
              </Badge>
            ))}
          </div>
        ) : null}
        <SelectRow label={t.time} value={filters.time ?? "all"} options={enumOptions("time", ["all", "today", "yesterday", "week", "last-week"], language)} onChange={(time) => setFilters((prev) => ({ ...prev, time: time as RecallFilters["time"] }))} />
        <SelectRow label={t.source} value={filters.source ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("source", ["twitter", "slack", "email", "search", "direct", "bookmark"], language)]} onChange={(source) => setFilters((prev) => ({ ...prev, source: source as RecallFilters["source"] }))} />
        <SelectRow label={t.type} value={filters.contentType ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("contentType", ["article", "video", "pdf", "tweet", "repo", "doc", "image", "saas"], language)]} onChange={(contentType) => setFilters((prev) => ({ ...prev, contentType: contentType as RecallFilters["contentType"] }))} />
        {showMore ? (
          <>
            <SelectRow label={t.importance} value={filters.importance ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("importance", ["must", "should", "maybe", "safe"], language)]} onChange={(importance) => setFilters((prev) => ({ ...prev, importance: importance as RecallFilters["importance"] }))} />
            <SelectRow label={t.readingStatus} value={filters.readingStatus ?? "all"} options={[{ value: "all", label: t.all }, ...enumOptions("readingStatus", ["fully-read", "skimmed", "bounced"], language)]} onChange={(readingStatus) => setFilters((prev) => ({ ...prev, readingStatus: readingStatus as RecallFilters["readingStatus"] }))} />
            <SelectRow label={t.color} value={filters.color ?? "all"} options={["all", "blue", "black", "slate", "orange", "white", "purple"]} onChange={(color) => setFilters((prev) => ({ ...prev, color }))} />
            <SelectRow label={t.topic} value={filters.topic ?? "all"} options={["all", ...snapshotTopics]} onChange={(topic) => setFilters((prev) => ({ ...prev, topic }))} />
            <SelectRow label={t.entity} value={filters.entity ?? "all"} options={["all", ...snapshotEntities]} onChange={(entity) => setFilters((prev) => ({ ...prev, entity }))} />
          </>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setShowMore((value) => !value)}>{showMore ? t.fewerFilters : t.moreFilters}</Button>
        <label className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-2 text-sm">
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

function formatFilterBadge(key: string, value: string, language: UiLanguage, t: Text) {
  const labels: Record<string, string> = {
    archivedOnly: t.archivedOnly,
    time: t.time,
    source: t.source,
    contentType: t.contentType,
    importance: t.importance,
    readingStatus: t.readingStatus,
    color: t.color,
    topic: t.topic,
    entity: t.entity
  };
  if (key === "source") return `${labels[key]}: ${enumMeta("source", value, language).label}`;
  if (key === "contentType") return `${labels[key]}: ${enumMeta("contentType", value, language).label}`;
  if (key === "importance") return `${labels[key]}: ${enumMeta("importance", value, language).label}`;
  if (key === "readingStatus") return `${labels[key]}: ${enumMeta("readingStatus", value, language).label}`;
  if (key === "time") return `${labels[key]}: ${enumMeta("time", value, language).label}`;
  if (key === "archivedOnly") return t.archivedOnly;
  return `${labels[key] ?? key}: ${value}`;
}

function SettingsPage({ snapshot, refresh }: { snapshot: AppSnapshot; refresh: () => Promise<void> }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const [logoOpen, setLogoOpen] = useState(false);
  const [blacklist, setBlacklist] = useState(snapshot.settings.blacklistDomains.join("\n"));
  const [deepSeekStatus, setDeepSeekStatus] = useState<string | null>(null);
  const [deepSeekStatusKind, setDeepSeekStatusKind] = useState<"success" | "error" | "info">("info");
  const [deepSeekTesting, setDeepSeekTesting] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [settingsAction, setSettingsAction] = useState<string | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<{ variant: "success" | "error"; title: string; description: string } | null>(null);

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

  const runWithToast = async (action: () => Promise<void>, successMessage: string, actionId?: string) => {
    if (actionId) {
      setSettingsAction(actionId);
      setSettingsStatus(null);
    }
    try {
      await action();
      notify(successMessage);
      if (actionId) setSettingsStatus({ variant: "success", title: t.actionComplete, description: successMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.actionFailed;
      notify(message);
      if (actionId) setSettingsStatus({ variant: "error", title: t.actionFailed, description: message });
    } finally {
      if (actionId) setSettingsAction(null);
    }
  };

  const languageLabel = snapshot.settings.language === "zh" ? t.chinese : snapshot.settings.language === "en" ? t.english : t.system;
  const themeLabel = enumMeta("theme", snapshot.settings.theme, language).label;
  const archiveTrustLabel = enumMeta("archiveTrust", snapshot.settings.archiveTrustStage, language).label;
  const resurfaceState = snapshot.settings.recordingPaused ? t.recordingPausedStatus : snapshot.settings.resurfaceEnabled ? t.enabled : t.disabled;
  const resurfaceFrequencyLabel = snapshot.settings.resurfaceRule.maxPerDay === 0 ? t.resurfaceFrequencyAlways : String(snapshot.settings.resurfaceRule.maxPerDay);
  const cooldownHours = snapshot.settings.resurfaceRule.cooldownHours;
  const resurfaceCooldownLabel = cooldownHours === 0 ? t.resurfaceCooldownNone : cooldownHours < 1 ? `${Math.round(cooldownHours * 60)}m` : `${cooldownHours}h`;
  const aiOutboundLabel = snapshot.settings.deepSeek.enabled && !snapshot.settings.strictPrivacy
    ? t.privacyAiOutboundValue
    : t.privacyAiDisabled;
  const deepSeekRequestUrl = toChatCompletionsUrl(snapshot.settings.deepSeek.baseUrl);
  const aiProviderLabel = canUseAiFeatures(snapshot.settings)
    ? snapshot.settings.deepSeek.enabled ? t.providerDeepSeek : t.providerChromeLocal
    : t.disabled;
  const settingsSections = [
    { value: "general", title: t.settingsGeneralTab, description: t.settingsGeneralHint, icon: <SlidersHorizontal className="h-4 w-4" /> },
    { value: "archive", title: t.settingsArchiveTab, description: t.settingsArchiveHint, icon: <Archive className="h-4 w-4" /> },
    { value: "resurface", title: t.settingsResurfaceTab, description: t.settingsResurfaceHint, icon: <Bell className="h-4 w-4" /> },
    { value: "privacy", title: t.settingsPrivacyTab, description: t.settingsPrivacyHint, icon: <ShieldCheck className="h-4 w-4" /> },
    { value: "ai", title: t.settingsAiTab, description: t.settingsAiHint, icon: <Sparkles className="h-4 w-4" /> },
    { value: "rules", title: t.settingsRulesTab, description: t.settingsRulesHint, icon: <Layers className="h-4 w-4" /> },
    { value: "data", title: t.settingsDataTab, description: t.settingsDataHint, icon: <Database className="h-4 w-4" /> }
  ];

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start items-start gap-5 px-4 py-5 sm:px-6 lg:py-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo size="lg" onClick={() => setLogoOpen(true)} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{t.settings}</h1>
            <p className="text-sm text-muted-foreground">{t.browserMemoryLocal}</p>
          </div>
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
        className="grid w-full items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]"
      >
        <aside className="min-w-0 lg:sticky lg:top-5">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-lg bg-muted/50 p-1">
            {settingsSections.map((section) => (
              <SettingsNavTrigger key={section.value} {...section} />
            ))}
          </TabsList>
        </aside>

        <div className="min-w-0">
          <TabsContent value="general" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.language, value: languageLabel },
                { label: t.theme, value: themeLabel },
                { label: t.recordingStatus, value: snapshot.settings.recordingPaused ? t.recordingPausedStatus : t.recordingActiveStatus },
                { label: t.aiStatus, value: canUseAiFeatures(snapshot.settings) ? t.enabled : t.disabled }
              ]}
            />
            <SettingsPanel title={t.generalSettings} description={t.generalSettingsDescription}>
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
            </SettingsPanel>
          </TabsContent>

          <TabsContent value="archive" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.ghostTabs, value: String(snapshot.ghostTabs.length) },
                { label: t.ghostThreshold, value: `${snapshot.settings.ghostThresholdHours}h` },
                { label: t.archiveTrust, value: archiveTrustLabel },
                { label: t.archivePreannounce, value: snapshot.settings.archivePreannounce && snapshot.settings.archiveTrustStage === "auto" ? t.enabled : t.disabled }
              ]}
            />
            <SettingsPanel title={t.archivePolicy} description={t.archiveSettingsDescription}>
              <SelectRow
                label={t.ghostThreshold}
                value={String(snapshot.settings.ghostThresholdHours)}
                options={["12", "24", "48", "168"].map((hours) => ({ value: hours, label: `${hours}h`, description: interpolate(t.ghostThresholdOption, { hours }) }))}
                description={t.ghostThresholdDescription}
                showOptionDescription
                onChange={(value) => update({ ghostThresholdHours: Number(value) })}
              />
              <SelectRow label={t.archiveTrust} value={snapshot.settings.archiveTrustStage} options={enumOptions("archiveTrust", ["manual", "preview", "auto"], language)} description={t.archiveTrustDescription} showOptionDescription onChange={(archiveTrustStage) => update({ archiveTrustStage: archiveTrustStage as SettingsType["archiveTrustStage"] })} />
              <ToggleRow
                label={t.archivePreannounce}
                description={t.archivePreannounceDescription}
                checked={snapshot.settings.archivePreannounce}
                disabled={snapshot.settings.archiveTrustStage !== "auto"}
                onChange={(archivePreannounce) => update({ archivePreannounce })}
              />
            </SettingsPanel>
          </TabsContent>

          <TabsContent value="resurface" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.resurface, value: resurfaceState },
                { label: t.resurfaceIncludeGhosts, value: snapshot.settings.resurfaceRule.includeGhostTabs ? t.enabled : t.disabled },
                { label: t.resurfaceFrequency, value: resurfaceFrequencyLabel },
                { label: t.resurfaceCooldown, value: resurfaceCooldownLabel }
              ]}
            />
            <SettingsPanel title={t.resurfacePolicy} description={t.resurfaceSettingsDescription}>
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
              <ToggleRow
                label={t.resurfaceIncludeGhosts}
                description={t.resurfaceIncludeGhostsDescription}
                checked={snapshot.settings.resurfaceRule.includeGhostTabs}
                disabled={snapshot.settings.recordingPaused || !snapshot.settings.resurfaceEnabled}
                onChange={(includeGhostTabs) => update({ resurfaceRule: { ...snapshot.settings.resurfaceRule, includeGhostTabs } })}
              />
              <SelectRow
                label={t.resurfaceFrequency}
                value={String(snapshot.settings.resurfaceRule.maxPerDay)}
                options={[
                  ...["1", "3", "5", "10", "20", "50"].map((count) => ({ value: count, label: count, description: interpolate(t.resurfaceFrequencyOption, { count }) })),
                  { value: "0", label: t.resurfaceFrequencyAlways, description: t.resurfaceFrequencyAlwaysDescription }
                ]}
                description={t.resurfaceFrequencyDescription}
                disabled={snapshot.settings.recordingPaused}
                showOptionDescription
                onChange={(value) => update({ resurfaceRule: { ...snapshot.settings.resurfaceRule, maxPerDay: Number(value) } })}
              />
              <SelectRow
                label={t.resurfaceCooldown}
                value={String(snapshot.settings.resurfaceRule.cooldownHours)}
                options={[
                  { value: "0", label: t.resurfaceCooldownNone, description: t.resurfaceCooldownNoneDescription },
                  ...[
                    { value: "0.0833333333", label: "5m", minutes: "5" },
                    { value: "0.25", label: "15m", minutes: "15" },
                    { value: "0.5", label: "30m", minutes: "30" }
                  ].map((item) => ({ value: item.value, label: item.label, description: interpolate(t.resurfaceCooldownMinutesOption, { minutes: item.minutes }) })),
                  ...["1", "3", "6", "12", "24"].map((hours) => ({ value: hours, label: `${hours}h`, description: interpolate(t.resurfaceCooldownOption, { hours }) }))
                ]}
                description={t.resurfaceCooldownDescription}
                disabled={snapshot.settings.recordingPaused}
                showOptionDescription
                onChange={(value) => update({ resurfaceRule: { ...snapshot.settings.resurfaceRule, cooldownHours: Number(value) } })}
              />
            </SettingsPanel>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.trustSummary}
              items={[
                { label: t.recordingStatus, value: snapshot.settings.recordingPaused ? t.recordingPausedStatus : t.recordingActiveStatus },
                { label: t.strictPrivacy, value: snapshot.settings.strictPrivacy ? t.enabled : t.disabled },
                { label: t.blockedDomains, value: String(snapshot.settings.blacklistDomains.length) },
                { label: t.localMemory, value: String(snapshot.tabs.length) }
              ]}
            />
            <SettingsPanel title={t.privacyRecording} description={t.privacyDescription}>
              <ToggleRow label={t.pauseRecording} description={t.pauseRecordingDescription} checked={snapshot.settings.recordingPaused} onChange={(recordingPaused) => update({ recordingPaused })} />
              <ToggleRow label={t.strictPrivacy} description={t.strictPrivacyDescription} checked={snapshot.settings.strictPrivacy} onChange={(strictPrivacy) => update({ strictPrivacy, aiMode: strictPrivacy ? "local-only" : snapshot.settings.aiMode })} />
            </SettingsPanel>

            <Card>
              <CardHeader>
                <CardTitle>{t.privacyMap}</CardTitle>
                <CardDescription>{t.privacyMapDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <PrivacyFact label={t.privacyLocalFields} value={t.privacyLocalFieldsValue} />
                <PrivacyFact label={t.privacyNeverCaptured} value={t.privacyNeverCapturedValue} />
                <PrivacyFact label={t.privacyAiOutbound} value={aiOutboundLabel} />
                <PrivacyFact label={t.privacyRules} value={interpolate(t.privacyRulesValue, { count: snapshot.tabs.filter((tab) => tab.card.userEdited).length })} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.aiStatus, value: canUseAiFeatures(snapshot.settings) ? t.enabled : t.disabled },
                { label: t.provider, value: aiProviderLabel },
                { label: t.deepSeekModel, value: snapshot.settings.deepSeek.model || t.notYet },
                { label: t.lastAiCall, value: formatLastAiCall(snapshot, language, t) }
              ]}
            />
            <SettingsPanel title={t.deepSeekProvider} description={t.deepSeekDescription}>
              <ToggleRow
                label={t.aiEnabled}
                description={t.aiModeDescription}
                checked={snapshot.settings.aiMode !== "local-only"}
                onChange={(enabled) => update({ aiMode: enabled ? "local-first" : "local-only" })}
              />
              <p className="text-xs leading-5 text-muted-foreground">{t.aiEnabledDescription}</p>
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
                placeholder="deepseek-v4-flash"
                onChange={(model) => updateDeepSeek({ model })}
              />
              <div className="grid gap-2">
                <TextRow
                  label={t.deepSeekBaseUrl}
                  description={t.deepSeekBaseUrlDescription}
                  value={snapshot.settings.deepSeek.baseUrl}
                  placeholder="https://api.deepseek.com"
                  onChange={(baseUrl) => updateDeepSeek({ baseUrl })}
                />
                <p className="break-all text-xs leading-5 text-muted-foreground">{t.deepSeekRequestUrlDescription} <code className="rounded bg-muted/60 px-1.5 py-0.5">{deepSeekRequestUrl}</code></p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AsyncButton
                  className="w-fit"
                  variant="outline"
                  busy={deepSeekTesting}
                  busyLabel={t.deepSeekTesting}
                  onClick={async () => {
                    setDeepSeekTesting(true);
                    setDeepSeekStatus(null);
                    try {
                      const result = await testDeepSeek();
                      setDeepSeekStatusKind("success");
                      setDeepSeekStatus(`${t.deepSeekTestOk}: ${result.model} · ${result.requestUrl}${result.content ? ` · ${result.content}` : ""}`);
                    } catch (error) {
                      setDeepSeekStatusKind("error");
                      setDeepSeekStatus(error instanceof Error ? error.message : String(error));
                    } finally {
                      setDeepSeekTesting(false);
                    }
                  }}
                >
                  {t.deepSeekTest}
                </AsyncButton>
              </div>
              {deepSeekTesting ? <PendingBlock title={t.testingConnection} description={t.deepSeekDescription} /> : null}
              {deepSeekStatus ? <StatusCallout variant={deepSeekStatusKind === "error" ? "error" : "success"} title={deepSeekStatusKind === "error" ? t.actionFailed : t.actionComplete} description={deepSeekStatus} /> : null}
              <p className="text-xs text-muted-foreground">{t.deepSeekEnhanceDescription}</p>
            </SettingsPanel>
          </TabsContent>

          <TabsContent value="rules" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.blockedDomains, value: String(snapshot.settings.blacklistDomains.length) },
                { label: t.localMemory, value: String(snapshot.tabs.length) },
                { label: t.recordingStatus, value: snapshot.settings.recordingPaused ? t.recordingPausedStatus : t.recordingActiveStatus },
                { label: t.strictPrivacy, value: snapshot.settings.strictPrivacy ? t.enabled : t.disabled }
              ]}
            />
            <SettingsPanel title={t.domainBlacklist} description={t.rulesSettingsDescription}>
              <textarea className="min-h-64 rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={blacklist} onChange={(event) => setBlacklist(event.target.value)} />
              <p className="text-xs text-muted-foreground">{t.blacklistDescription}</p>
              <AsyncButton className="w-fit" busy={settingsAction === "blacklist"} busyLabel={t.saving} onClick={() => runWithToast(() => update({ blacklistDomains: blacklist.split("\n").map((item) => item.trim()).filter(Boolean) }), t.blacklistSaved, "blacklist")}>{t.saveBlacklist}</AsyncButton>
              {settingsAction === "blacklist" ? <PendingBlock title={t.saving} description={t.blacklistDescription} /> : null}
              {settingsTab === "rules" && settingsStatus ? <StatusCallout variant={settingsStatus.variant} title={settingsStatus.title} description={settingsStatus.description} /> : null}
            </SettingsPanel>
          </TabsContent>

          <TabsContent value="data" className="mt-0 grid items-start gap-5">
            <TrustStatusSummary
              title={t.settingsSectionStatus}
              items={[
                { label: t.localMemory, value: String(snapshot.tabs.length) },
                { label: t.archived, value: String(snapshot.archivedTabs.length) },
                { label: t.dataLog, value: String(snapshot.events.length) },
                { label: t.blockedDomains, value: String(snapshot.settings.blacklistDomains.length) }
              ]}
            />
            <SettingsPanel title={t.dataPortability} description={t.dataSettingsDescription}>
              <div className="flex flex-wrap gap-2">
                <AsyncButton variant="outline" busy={settingsAction === "export"} busyLabel={t.exporting} onClick={() => runWithToast(download, t.dataExported, "export")}><Download className="h-4 w-4" /> {t.exportJson}</AsyncButton>
                <ImportButton refresh={refresh} />
                <AsyncButton variant="outline" busy={settingsAction === "history"} busyLabel={t.importing} onClick={() => runWithToast(async () => { await importHistory(); await refresh(); }, t.historyImported, "history")}><History className="h-4 w-4" /> {t.import30dHistory}</AsyncButton>
                <AsyncButton variant="outline" busy={settingsAction === "demo"} busyLabel={t.importing} onClick={() => runWithToast(async () => { await seedDemo(); await refresh(); }, t.demoLoaded, "demo")}><Sparkles className="h-4 w-4" /> {t.demoWorkspace}</AsyncButton>
                <AsyncButton variant="destructive" busy={settingsAction === "clear"} busyLabel={t.saving} onClick={() => runWithToast(async () => { await clearData(); await refresh(); }, t.dataCleared, "clear")}><Trash2 className="h-4 w-4" /> {t.clearAll}</AsyncButton>
              </div>
              {settingsTab === "data" && settingsAction ? <PendingBlock title={settingsAction === "export" ? t.exporting : settingsAction === "clear" ? t.saving : t.importing} description={t.dataDescription} /> : null}
              {settingsTab === "data" && settingsStatus ? <StatusCallout variant={settingsStatus.variant} title={settingsStatus.title} description={settingsStatus.description} /> : null}
            </SettingsPanel>

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
        </div>
      </Tabs>
      <LogoShowcase open={logoOpen} onOpenChange={setLogoOpen} />
    </main>
  );
}

function SettingsNavTrigger({
  value,
  title,
  description,
  icon
}: {
  value: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group h-auto w-full justify-start rounded-md px-3 py-2.5 text-left data-[state=active]:bg-background"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground group-data-[state=active]:text-foreground">
          {icon}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="line-clamp-2 text-xs font-normal leading-4 text-muted-foreground">{description}</span>
        </span>
      </span>
    </TabsTrigger>
  );
}

function SettingsPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">{children}</CardContent>
    </Card>
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

function TrustStatusSummary({ title, items }: { title: string; items: Array<{ label: string; value: string }> }) {
  const statusTone = (value: string) => {
    const normalized = value.toLowerCase();
    if (["active", "enabled", "运行中", "已启用"].includes(normalized)) return "bg-emerald-500";
    if (["paused", "disabled", "已暂停", "已关闭"].includes(normalized)) return "bg-muted-foreground/50";
    return undefined;
  };
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{title}</span>
        {items.map((item) => {
          const tone = statusTone(item.value);
          return (
            <div key={item.label} className="flex min-w-0 items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1 text-xs">
              {tone ? <span className={cn("h-2 w-2 shrink-0 rounded-full", tone)} aria-hidden="true" /> : null}
              <span className="shrink-0 text-muted-foreground">{item.label}</span>
              <span className="min-w-0 truncate font-medium text-foreground" title={item.value}>{item.value}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function formatLastAiCall(snapshot: AppSnapshot, language: UiLanguage, t: Text) {
  const event = [...snapshot.events].reverse().find((item) => item.type.startsWith("deepseek_"));
  return event ? formatTime(event.createdAt, Date.now(), language) : t.notYet;
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
  const [action, setAction] = useState<"history" | "demo" | "empty" | null>(null);
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>{t.firstRun}</CardTitle>
        <CardDescription>{t.firstRunDescription}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <AsyncButton
          busy={action === "history"}
          busyLabel={t.importing}
          onClick={async () => {
            setAction("history");
            try {
              await saveSettings({ aiMode: "local-first", strictPrivacy: false, onboardingComplete: true });
              await importHistory();
              await refresh();
            } finally {
              setAction(null);
            }
          }}
        >
          {t.importHistory}
        </AsyncButton>
        <AsyncButton
          variant="secondary"
          busy={action === "demo"}
          busyLabel={t.importing}
          onClick={async () => {
            setAction("demo");
            try {
              await seedDemo();
              await saveSettings({ onboardingComplete: true });
              await refresh();
            } finally {
              setAction(null);
            }
          }}
        >
          {t.useDemo}
        </AsyncButton>
        <AsyncButton
          variant="outline"
          busy={action === "empty"}
          busyLabel={t.saving}
          onClick={async () => {
            setAction("empty");
            try {
              await saveSettings({ aiMode: "local-only", strictPrivacy: true, onboardingComplete: true });
              await refresh();
            } finally {
              setAction(null);
            }
          }}
        >
          {t.startEmpty}
        </AsyncButton>
      </CardContent>
    </Card>
  );
}

type ReasonVariant = "default" | "ghost" | "recall";

function TabList({
  tabs,
  refresh,
  reasonResolver,
  reasonVariant = "default",
  showStatusBadge,
  ghostIds
}: {
  tabs: Array<TabMemory | RecallResult>;
  refresh: () => Promise<void>;
  reasonResolver?: (tab: TabMemory | RecallResult) => string;
  reasonVariant?: ReasonVariant;
  showStatusBadge?: boolean;
  ghostIds?: Set<string>;
}) {
  const statusKinds = new Set(tabs.map((tab) => tab.archived ? "archived" : ghostIds?.has(tab.id) ? "ghost" : "active"));
  const shouldShowStatusBadge = showStatusBadge ?? (reasonVariant !== "ghost" && statusKinds.size > 1);
  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {tabs.map((tab) => (
          <MemoryResultRow key={tab.id} tab={tab} refresh={refresh} reason={reasonResolver?.(tab)} reasonVariant={reasonVariant} showStatusBadge={shouldShowStatusBadge} isGhost={Boolean(ghostIds?.has(tab.id))} />
        ))}
      </div>
    </Card>
  );
}

function MemoryResultRow({ tab, refresh, reason, reasonVariant, showStatusBadge, isGhost }: { tab: TabMemory | RecallResult; refresh: () => Promise<void>; reason?: string; reasonVariant: ReasonVariant; showStatusBadge: boolean; isGhost: boolean }) {
  const { language, t } = useI18n();
  const notify = useToast();
  const [restoring, setRestoring] = useState(false);
  const [copying, setCopying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const contentType = enumMeta("contentType", tab.card.contentType, language);
  const importance = enumMeta("importance", tab.card.importance, language);
  const source = enumMeta("source", tab.card.source, language);
  const readingStatus = enumMeta("readingStatus", tab.card.readingStatus, language);
  const statusLabel = tab.archived ? t.archived : reasonVariant === "ghost" || isGhost ? t.ghostStatus : t.active;
  const isAiEnhanced = Boolean(tab.card.aiEnhanced);
  const handleArchive = async () => {
    setArchiving(true);
    try {
      await archiveTab(tab.id);
      await refresh();
    } catch {
      notify(t.archiveFailed);
    } finally {
      setArchiving(false);
    }
  };
  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      await unarchiveTab(tab.id);
      await refresh();
    } catch {
      notify(t.archiveFailed);
    } finally {
      setArchiving(false);
    }
  };
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 border-l-2 px-4 py-3 transition-colors xl:grid-cols-[minmax(420px,1fr)_minmax(360px,0.9fr)] xl:items-center",
        isAiEnhanced
          ? "border-l-[#0099FF] bg-[#0099FF]/[0.055] dark:bg-[#0099FF]/[0.09]"
          : "border-l-transparent"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Favicon tab={tab} />
        <div className="min-w-0 flex-1">
          <button
            className={cn(
              "flex min-w-0 items-start gap-1.5 text-left text-sm font-medium leading-5 hover:underline disabled:cursor-wait disabled:opacity-70",
              isAiEnhanced ? "text-[#005F99] dark:text-[#D8F1FF]" : undefined
            )}
            title={t.reopen}
            disabled={restoring}
            onClick={async () => {
              setRestoring(true);
              try {
                await restoreTab(tab.id);
                await refresh();
              } finally {
                setRestoring(false);
              }
            }}
          >
            {restoring ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
            {tab.card.aiEnhanced ? (
              <span className="mt-0.5 shrink-0 rounded-sm bg-[#0099FF]/15 p-0.5 text-[#0099FF] ring-1 ring-[#0099FF]/25" title={t.aiEnhanced}>
                <Sparkles className="h-3.5 w-3.5" aria-label={t.aiEnhanced} />
              </span>
            ) : null}
            <span className="line-clamp-2 min-w-0 break-words [overflow-wrap:anywhere]" title={tab.title}>{tab.title}</span>
          </button>
          {tab.card.summary && tab.card.summary.trim() !== tab.title.trim() ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 min-w-0 break-words text-sm leading-5 [overflow-wrap:anywhere]",
                isAiEnhanced ? "text-[#006BB3] dark:text-[#8FD5FF]" : "text-muted-foreground"
              )}
              title={tab.card.summary}
            >
              {tab.card.summary}
            </p>
          ) : null}
          <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate" title={tab.url}>{tab.url}</span>
            <button
              className="shrink-0 rounded-sm p-0.5 hover:bg-muted hover:text-foreground"
              title={t.copy}
              onClick={async () => {
                setCopying(true);
                try {
                  await navigator.clipboard.writeText(tab.url);
                  notify(t.copied);
                } catch {
                  notify(t.copyFailed);
                } finally {
                  setCopying(false);
                }
              }}
            >
              {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge variant="muted" title={contentType.description}>{t.contentType}: {contentType.label}</Badge>
            {showStatusBadge ? <Badge variant={tab.archived || isGhost ? "default" : "outline"}>{t.status}: {statusLabel}</Badge> : null}
            <Badge variant="outline" title={importance.description}>{t.importance}: {importance.label}</Badge>
            <EditCardButton tab={tab} refresh={refresh} compact />
            {!tab.archived && tab.card.importance === "safe" ? (
              <AsyncButton
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                title={t.archiveThisTab}
                aria-label={t.archiveThisTab}
                busy={archiving}
                busyLabel={t.archiveTab}
                onClick={handleArchive}
              >
                <Archive className="h-3.5 w-3.5" />
                {t.archiveTab}
              </AsyncButton>
            ) : null}
            {tab.archived ? (
              <AsyncButton
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                title={t.unarchiveThisTab}
                aria-label={t.unarchiveThisTab}
                busy={archiving}
                busyLabel={t.unarchiveTab}
                onClick={handleUnarchive}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.unarchiveTab}
              </AsyncButton>
            ) : null}
          </div>
        </div>
      </div>
      <div className="min-w-0 pl-[52px] text-xs leading-5 text-muted-foreground xl:pl-0">
        <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 xl:flex-nowrap xl:truncate">
          <span>{t.lastActive}: <span className="font-medium text-foreground">{formatAbsoluteDateTime(tab.lastActivatedAt)}</span></span>
          <span className="text-border">|</span>
          <span>{t.opened}: <span className="font-medium text-foreground">{formatAbsoluteDateTime(tab.openedAt)}</span></span>
          <span className="text-border">|</span>
          <span title={source.description}>{t.source}: <span className="font-medium text-foreground">{source.label}</span></span>
          <span className="text-border">|</span>
          <span title={readingStatus.description}>{t.readingStatus}: <span className="font-medium text-foreground">{readingStatus.label}</span></span>
        </div>
        <ReasonStrip tab={tab} reason={reason} reasonVariant={reasonVariant} />
      </div>
    </div>
  );
}

function ReasonStrip({ tab, reason, reasonVariant }: { tab: TabMemory | RecallResult; reason?: string; reasonVariant: ReasonVariant }) {
  const { language, t } = useI18n();
  if (reasonVariant !== "recall") {
    return <div className={reasonClassName(reasonVariant)} title={reason ?? buildWhyTip(tab, language)}>{reason ?? buildWhyTip(tab, language)}</div>;
  }
  const recall = "matchedCues" in tab ? tab : undefined;
  const matched = recall?.matchedCues.filter(Boolean).slice(0, 4) ?? [];
  const aiReason = recall?.aiRankReason || recall?.aiIntent;
  const behavior = buildBehaviorSignal(tab, language);
  return (
    <div className="mt-1 grid gap-1 rounded-md border bg-muted/30 p-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{t.matchedBecause}</Badge>
        <span className="min-w-0 truncate font-medium text-foreground">{matched.length ? matched.join(", ") : enumMeta("contentType", tab.card.contentType, language).label}</span>
      </div>
      {aiReason ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline"><Sparkles className="h-3 w-3" /> {t.aiIntent}</Badge>
          <span className="min-w-0 truncate">{aiReason}</span>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant="outline">{t.behaviorSignals}</Badge>
        <span className="min-w-0 truncate">{behavior}</span>
      </div>
    </div>
  );
}

function Favicon({ tab }: { tab: TabMemory | RecallResult }) {
  const [failed, setFailed] = useState(false);
  const [lowContrast, setLowContrast] = useState(false);
  if (tab.favIconUrl && !failed) {
    return (
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border p-1.5 transition-colors",
        lowContrast ? "border-slate-800 bg-slate-950" : "bg-background"
      )}>
        <img
          src={tab.favIconUrl}
          alt=""
          className="favicon-image h-6 w-6 rounded-sm object-contain"
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={(event) => setLowContrast(isLowContrastFavicon(event.currentTarget))}
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
  const base = "truncate rounded-md border px-2 py-1 font-medium";
  if (variant === "ghost") return `${base} border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200`;
  if (variant === "recall") return `${base} border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200`;
  return "truncate text-muted-foreground/85";
}

function buildBehaviorSignal(tab: TabMemory | RecallResult, language: UiLanguage) {
  const minutes = Math.round(tab.signals.activeMs / 60000);
  const parts = language === "zh"
    ? [`停留 ${minutes} 分钟`, `返回 ${tab.signals.activationCount} 次`, `滚动 ${tab.signals.maxScrollPercent}%`]
    : [`${minutes} min active`, `${tab.signals.activationCount} returns`, `${tab.signals.maxScrollPercent}% scroll`];
  if (tab.signals.copiedTextCount > 0) parts.push(language === "zh" ? "复制过内容" : "copied from page");
  return parts.join(" · ");
}

function isLowContrastFavicon(image: HTMLImageElement) {
  try {
    const canvas = document.createElement("canvas");
    const size = 24;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;

    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);
    let visiblePixels = 0;
    let brightPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 32) continue;

      visiblePixels++;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      if (luminance > 224) {
        brightPixels++;
      }
    }

    if (visiblePixels < 20) return true;
    return brightPixels / visiblePixels > 0.72;
  } catch {
    return true;
  }
}

function EditCardButton({ tab, refresh, compact = false }: { tab: TabMemory | RecallResult; refresh: () => Promise<void>; compact?: boolean }) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<"card" | "rule" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
          {error ? <StatusCallout variant="error" title={t.actionFailed} description={error} action={<Button variant="outline" size="sm" onClick={() => setError(null)}>{t.close}</Button>} /> : null}
          <div className="flex flex-wrap gap-2">
            <AsyncButton
              busy={saving === "card"}
              busyLabel={t.saving}
              onClick={async () => {
                setSaving("card");
                setError(null);
                try {
                  await updateTabCard(tab.id, toCardPatch());
                  setOpen(false);
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : t.actionFailed);
                } finally {
                  setSaving(null);
                }
              }}
            >
              {t.save}
            </AsyncButton>
            <AsyncButton
              variant="outline"
              busy={saving === "rule"}
              busyLabel={t.saving}
              onClick={async () => {
                setSaving("rule");
                setError(null);
                try {
                  await updateTabCard(tab.id, toCardPatch(), true);
                  setOpen(false);
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : t.actionFailed);
                } finally {
                  setSaving(null);
                }
              }}
            >
              {t.saveAsRule}
            </AsyncButton>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-9">{t.edit}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t.sessions}</DialogTitle></DialogHeader>
        <TextRow label="Name" value={name} onChange={setName} />
        {error ? <StatusCallout variant="error" title={t.actionFailed} description={error} action={<Button variant="outline" size="sm" onClick={() => setError(null)}>{t.close}</Button>} /> : null}
        <AsyncButton
          busy={saving}
          busyLabel={t.saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              await renameSession(sessionId, name);
              setOpen(false);
              await refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : t.actionFailed);
            } finally {
              setSaving(false);
            }
          }}
        >
          {t.save}
        </AsyncButton>
      </DialogContent>
    </Dialog>
  );
}

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function PopupSingleSection({ tabs, refresh }: { tabs: TabMemory[]; refresh: () => Promise<void> }) {
  return (
    <div className="grid min-w-0 gap-2 overflow-hidden">
      <h2 className="px-1 text-sm font-semibold text-foreground">Top 10</h2>
      <PopupTopList tabs={tabs} refresh={refresh} />
    </div>
  );
}

function PopupTopList({ tabs, refresh }: { tabs: TabMemory[]; refresh: () => Promise<void> }) {
  const { t } = useI18n();
  return (
    <section className="min-w-0 overflow-hidden rounded-md border bg-card">
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
  const [lowContrast, setLowContrast] = useState(false);
  const [restoring, setRestoring] = useState(false);
  return (
    <button
      className="flex w-full min-w-0 items-start gap-2 overflow-hidden px-3 py-2 text-left hover:bg-accent disabled:cursor-wait disabled:opacity-70"
      disabled={restoring}
      onClick={async () => {
        setRestoring(true);
        try {
          await restoreTab(tab.id);
          await refresh();
        } finally {
          setRestoring(false);
        }
      }}
    >
      <span className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded border text-[10px] font-semibold transition-colors",
        tab.favIconUrl && !failed && lowContrast ? "border-slate-800 bg-slate-950 text-white" : "bg-background"
      )}>
        {tab.favIconUrl && !failed ? (
          <img
            src={tab.favIconUrl}
            alt=""
            className="favicon-image h-4 w-4 rounded-sm object-contain"
            crossOrigin="anonymous"
            onLoad={(event) => setLowContrast(isLowContrastFavicon(event.currentTarget))}
            onError={() => setFailed(true)}
          />
        ) : (
          tab.domain.slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="flex min-w-0 items-start gap-1 text-sm font-medium leading-5">
          {restoring ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
          {tab.card.aiEnhanced ? (
            <span className="mt-0.5 shrink-0 text-sky-500 dark:text-sky-300" title={t.aiEnhanced}>
              <Sparkles className="h-3.5 w-3.5" aria-label={t.aiEnhanced} />
            </span>
          ) : null}
          <span className="line-clamp-2 min-w-0 break-words [overflow-wrap:anywhere]">{tab.card.summary}</span>
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
    <label className={`flex items-center justify-between gap-4 rounded-md border bg-background p-3 ${disabled ? "opacity-60" : ""}`}>
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
    <label className="grid gap-2 text-sm">
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
    <label className={`grid min-w-0 gap-2 text-sm ${disabled ? "opacity-60" : ""}`}>
      <SettingLabel label={label} description={description} />
      <Select value={value} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        {normalizedOptions.map((item) => {
          return <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>;
        })}
        </SelectContent>
      </Select>
      {showOptionDescription && selectedOption?.description ? <span className="text-xs text-muted-foreground">{selectedOption.description}</span> : null}
    </label>
  );
}

function SettingLabel({ label, description }: { label: string; description?: string }) {
  return (
    <span className="grid min-w-0 gap-1">
      <span className="text-sm font-medium leading-none">{label}</span>
      {description ? <span className="text-xs leading-5 text-muted-foreground">{description}</span> : null}
    </span>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-5 rounded-md border bg-muted/15 p-4">{children}</div>
    </section>
  );
}

function ImportButton({ refresh }: { refresh: () => Promise<void> }) {
  const { t } = useI18n();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        {importing ? <PendingBlock title={t.importing} description={t.importDescription} /> : null}
        {error ? <StatusCallout variant="error" title={t.actionFailed} description={error} action={<Button variant="outline" size="sm" onClick={() => setError(null)}>{t.close}</Button>} /> : null}
        <AsyncButton
          busy={importing}
          busyLabel={t.importing}
          onClick={async () => {
            setImporting(true);
            setError(null);
            try {
              await importData(JSON.parse(text));
              setOpen(false);
              await refresh();
              notify(t.dataImported);
            } catch (error) {
              const message = error instanceof Error ? error.message : t.actionFailed;
              setError(message);
              notify(message);
            } finally {
              setImporting(false);
            }
          }}
        >
          {t.import}
        </AsyncButton>
      </DialogContent>
    </Dialog>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
