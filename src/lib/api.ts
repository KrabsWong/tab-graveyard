import type { AppSnapshot, DeepSeekEnhanceResult, ExtensionRequest, ExtensionResponse, GraveyardState, RecallResult, RecallSynthesisResult, Settings, TabInfoCard } from "@/lib/types";
import { createDemoState, createSnapshot, isExtensionRuntime, recallTabs } from "@/lib/memory";

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

export function previewArchive() {
  return sendMessage<AppSnapshot>({ type: "previewArchive" });
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

export function seedDemo() {
  return sendMessage<AppSnapshot>({ type: "seedDemo" });
}

export function importHistory() {
  return sendMessage<AppSnapshot>({ type: "importHistory" });
}

export function testDeepSeek() {
  return sendMessage<{ model: string; content: string }>({ type: "testDeepSeek" });
}

export function enhanceWithDeepSeek() {
  return sendMessage<DeepSeekEnhanceResult>({ type: "enhanceWithDeepSeek" });
}

export function openDashboard() {
  return sendMessage<void>({ type: "openDashboard" });
}

async function mockResponse<T>(request: ExtensionRequest): Promise<T> {
  const state = createDemoState();
  if (request.type === "recall") return recallTabs(state.tabs, request.query, request.filters) as T;
  return createSnapshot(state) as T;
}
