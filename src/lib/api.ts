import type { AppSnapshot, CloudAuthStatus, DailyDigestResponse, DeepSeekEnhanceResult, ExtensionRequest, ExtensionResponse, GitHubDeviceAuthPoll, GitHubDeviceAuthStart, GraveyardState, RecallResult, RecallSynthesisResult, Settings, TabInfoCard } from "@/lib/types";
import { createSnapshot, emptyState, isExtensionRuntime, recallTabs } from "@/lib/memory";

export async function sendMessage<T>(request: ExtensionRequest): Promise<T> {
  if (!isExtensionRuntime()) return mockResponse<T>(request);
  const response = (await chrome.runtime.sendMessage(request)) as ExtensionResponse<T>;
  if (!response?.ok) throw new Error(response?.error ?? "Extension request failed");
  return response.data as T;
}

export function getSnapshot() {
  return sendMessage<AppSnapshot>({ type: "getSnapshot" });
}

export function archiveGhosts() {
  return sendMessage<AppSnapshot>({ type: "archiveGhosts" });
}

export function archiveTab(tabId: string) {
  return sendMessage<AppSnapshot>({ type: "archiveTab", tabId });
}

export function unarchiveTab(tabId: string) {
  return sendMessage<AppSnapshot>({ type: "unarchiveTab", tabId });
}

export function previewArchive() {
  return sendMessage<AppSnapshot>({ type: "previewArchive" });
}

export function cancelArchivePreview() {
  return sendMessage<AppSnapshot>({ type: "cancelArchivePreview" });
}

export function confirmArchivePreview(previewId: string) {
  return sendMessage<AppSnapshot>({ type: "confirmArchivePreview", previewId });
}

export function undoArchive() {
  return sendMessage<AppSnapshot>({ type: "undoArchive" });
}

export function restoreTab(tabId: string, inWindow?: boolean) {
  return sendMessage<AppSnapshot>({ type: "restoreTab", tabId, inWindow });
}

export function restoreSession(sessionId: string) {
  return sendMessage<AppSnapshot>({ type: "restoreSession", sessionId });
}

export function deleteTab(tabId: string) {
  return sendMessage<AppSnapshot>({ type: "deleteTab", tabId });
}

export function updateTabCard(tabId: string, card: Partial<TabInfoCard>, saveRule?: boolean) {
  return sendMessage<AppSnapshot>({ type: "updateTabCard", tabId, card, saveRule });
}

export function renameSession(sessionId: string, name: string) {
  return sendMessage<AppSnapshot>({ type: "renameSession", sessionId, name });
}

export function splitSession(sessionId: string, tabIds: string[]) {
  return sendMessage<AppSnapshot>({ type: "splitSession", sessionId, tabIds });
}

export function mergeSessions(sessionIds: string[], name?: string) {
  return sendMessage<AppSnapshot>({ type: "mergeSessions", sessionIds, name });
}

export function recall(query: string, filters = {}) {
  return sendMessage<RecallResult[]>({ type: "recall", query, filters });
}

export function summarizeRecall(query: string, tabIds?: string[], sessionId?: string) {
  return sendMessage<RecallSynthesisResult>({ type: "summarizeRecall", query, tabIds, sessionId });
}

export function getDailyDigest(mode: "auto" | "manual" = "auto", dateKey?: string) {
  return sendMessage<DailyDigestResponse>({ type: "getDailyDigest", mode, dateKey });
}

export function ackDailyDigestTip(digestId: string) {
  return sendMessage<DailyDigestResponse>({ type: "ackDailyDigestTip", digestId });
}

export function markDailyDigestViewed(digestId: string) {
  return sendMessage<DailyDigestResponse>({ type: "markDailyDigestViewed", digestId });
}

export function dismissDailyDigestTip(digestId: string) {
  return sendMessage<DailyDigestResponse>({ type: "dismissDailyDigestTip", digestId });
}

export function saveSettings(settings: Partial<Settings>) {
  return sendMessage<AppSnapshot>({ type: "saveSettings", settings });
}

export function exportData() {
  return sendMessage<GraveyardState>({ type: "exportData" });
}

export function importData(state: GraveyardState) {
  return sendMessage<AppSnapshot>({ type: "importData", state });
}

export function clearData() {
  return sendMessage<AppSnapshot>({ type: "clearData" });
}

export function importHistory() {
  return sendMessage<AppSnapshot>({ type: "importHistory" });
}

export function testDeepSeek() {
  return sendMessage<{ model: string; content: string; requestUrl: string }>({ type: "testDeepSeek" });
}

export function enhanceWithDeepSeek() {
  return sendMessage<DeepSeekEnhanceResult>({ type: "enhanceWithDeepSeek" });
}

export function getCloudAuthStatus() {
  return sendMessage<CloudAuthStatus>({ type: "getCloudAuthStatus" });
}

export function startGitHubAuth() {
  return sendMessage<GitHubDeviceAuthStart>({ type: "startGitHubAuth" });
}

export function pollGitHubAuth(deviceCode: string) {
  return sendMessage<GitHubDeviceAuthPoll>({ type: "pollGitHubAuth", deviceCode });
}

export function clearCloudAuth() {
  return sendMessage<void>({ type: "clearCloudAuth" });
}

export function openDashboard() {
  return sendMessage<void>({ type: "openDashboard" });
}

async function mockResponse<T>(request: ExtensionRequest): Promise<T> {
  const state = emptyState();
  if (request.type === "recall") return recallTabs(state.tabs, request.query, request.filters) as T;
  if (request.type === "getDailyDigest") return {
    status: "idle",
    targetDateKey: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    tabCount: 0,
    history: [],
    shouldNotify: false
  } as T;
  if (request.type === "ackDailyDigestTip" || request.type === "markDailyDigestViewed" || request.type === "dismissDailyDigestTip") return {
    status: "idle",
    targetDateKey: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    tabCount: 0,
    history: [],
    shouldNotify: false
  } as T;
  if (request.type === "getCloudAuthStatus") return null as T;
  if (request.type === "startGitHubAuth") throw new Error("GitHub auth must be started from the installed Chrome extension, not the Vite preview page.");
  if (request.type === "pollGitHubAuth") return { status: "pending" } as T;
  if (request.type === "clearCloudAuth") return undefined as T;
  return createSnapshot(state) as T;
}
