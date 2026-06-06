type ResurfaceMessage = {
  type: "TAB_GRAVEYARD_RESURFACE";
  language?: "en" | "zh";
  theme?: "system" | "light" | "dark";
  tabs: Array<{ id: string; title: string; domain: string; url: string; favIconUrl?: string; archived?: boolean }>;
};

type AiActivityMessage = {
  type: "TAB_GRAVEYARD_AI_ACTIVITY";
  status: "running" | "success" | "failed";
  language?: "en" | "zh";
  theme?: "system" | "light" | "dark";
  reason?: string;
};

type CommandPaletteMessage = {
  type: "TAB_GRAVEYARD_TOGGLE_COMMAND_PALETTE";
  language?: "en" | "zh";
  theme?: "system" | "light" | "dark";
  aiAvailable?: boolean;
};

type QuickRecallItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  favIconUrl?: string;
  category: "active" | "ghost" | "archived" | "session";
  reason: string;
  aiEnhanced?: boolean;
};

const tabGraveyardWindow = window as Window & { __tabGraveyardContentLoaded?: boolean };
let activityTabs: ResurfaceMessage["tabs"] = [];
let activityLanguage: "en" | "zh" = "en";
let activityTheme: "system" | "light" | "dark" = "system";
let activityAi: { status: AiActivityMessage["status"]; reason?: string } | undefined;
let activityAutoClose: number | undefined;

if (!tabGraveyardWindow.__tabGraveyardContentLoaded) {
  tabGraveyardWindow.__tabGraveyardContentLoaded = true;
  console.info("[Tab Graveyard][content]", "loaded", { url: location.href });

  try {
    chrome.runtime.onMessage.addListener((message: ResurfaceMessage | AiActivityMessage | CommandPaletteMessage) => {
      console.info("[Tab Graveyard][content]", "message", { type: message.type, count: "tabs" in message ? message.tabs.length : 0, url: location.href });
      if (message.type === "TAB_GRAVEYARD_RESURFACE" && message.tabs.length) {
        showResurface(message.tabs, message.language ?? "en", message.theme ?? "system");
        return;
      }
      if (message.type === "TAB_GRAVEYARD_AI_ACTIVITY") {
        showAiActivity(message.status, message.language ?? "en", message.theme ?? "system", message.reason);
        return;
      }
      if (message.type === "TAB_GRAVEYARD_TOGGLE_COMMAND_PALETTE") {
        toggleCommandPalette(message.language ?? "en", message.theme ?? "system", Boolean(message.aiAvailable));
      }
    });
  } catch {
    tabGraveyardWindow.__tabGraveyardContentLoaded = false;
  }

  let lastTick = Date.now();
  let lastScrollSignal = 0;

  const heartbeat = window.setInterval(() => {
    if (document.visibilityState !== "visible") {
      lastTick = Date.now();
      return;
    }
    const now = Date.now();
    const activeMs = Math.min(now - lastTick, 20_000);
    lastTick = now;
    if (!sendContentSignal({ activeMs, maxScrollPercent: getScrollPercent(), referrerUrl: document.referrer || undefined })) {
      window.clearInterval(heartbeat);
    }
  }, 15_000);

  window.addEventListener("scroll", () => {
    const percent = getScrollPercent();
    if (percent - lastScrollSignal < 10) return;
    lastScrollSignal = percent;
    sendContentSignal({ maxScrollPercent: percent, referrerUrl: document.referrer || undefined });
  }, { passive: true });

  document.addEventListener("copy", () => {
    sendContentSignal({ copiedTextCount: 1, maxScrollPercent: getScrollPercent(), referrerUrl: document.referrer || undefined });
    const text = window.getSelection()?.toString().trim();
    if (text && /^https?:\/\//i.test(text)) {
      sendRuntimeMessage({ type: "copyUrlTrigger", url: text });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isCommandPaletteShortcut(event) || isEditableTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    sendRuntimeRequest<{ language: "en" | "zh"; theme: "system" | "light" | "dark"; aiAvailable?: boolean }>({ type: "commandPaletteContext" })
      .then((context) => toggleCommandPalette(context.language, context.theme, Boolean(context.aiAvailable)))
      .catch(() => toggleCommandPalette("en", "system", false));
  }, true);

  sendPageMetadata();
  window.setTimeout(sendPageMetadata, 1500);
}

function isCommandPaletteShortcut(event: KeyboardEvent) {
  return event.key.toLowerCase() === "k" && event.shiftKey && (event.metaKey || event.ctrlKey);
}

function isEditableTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || element.closest("[contenteditable='true']");
}

function showResurface(tabs: ResurfaceMessage["tabs"], language: "en" | "zh", theme: "system" | "light" | "dark") {
  console.info("[Tab Graveyard][content]", "show-resurface", { count: tabs.length, url: location.href });
  activityTabs = tabs;
  activityLanguage = language;
  activityTheme = theme;
  renderActivityOverlay();
  scheduleActivityClose(12_000);
}

function showAiActivity(status: AiActivityMessage["status"], language: "en" | "zh", theme: "system" | "light" | "dark", reason?: string) {
  activityAi = { status, reason };
  activityLanguage = language;
  activityTheme = theme;
  renderActivityOverlay();
  if (status === "running") {
    window.clearTimeout(activityAutoClose);
    activityAutoClose = undefined;
  } else {
    scheduleActivityClose(activityTabs.length ? 12_000 : 4_000);
  }
}

function scheduleActivityClose(delayMs: number) {
  window.clearTimeout(activityAutoClose);
  activityAutoClose = window.setTimeout(() => {
    if (activityAi?.status === "running") return;
    activityTabs = [];
    activityAi = undefined;
    document.getElementById("tab-graveyard-activity")?.remove();
  }, delayMs);
}

function renderActivityOverlay() {
  document.getElementById("tab-graveyard-resurface")?.remove();
  document.getElementById("tab-graveyard-activity")?.remove();
  if (!activityTabs.length && !activityAi) return;

  const language = activityLanguage;
  const theme = activityTheme;
  const tabs = activityTabs;
  const copy = getResurfaceCopy(language, tabs.length);
  const activityCopy = getActivityCopy(language, activityAi);
  const colors = getThemeColors(theme);
  const isCompact = !tabs.length;

  const root = document.createElement("div");
  root.id = "tab-graveyard-activity";
  root.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483647",
    `width:${isCompact ? "auto" : "340px"}`,
    `max-width:calc(100vw - 32px)`,
    "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    `color:${colors.foreground}`,
    `background:${colors.background}`,
    `border:1px solid ${colors.border}`,
    "border-radius:8px",
    `box-shadow:${colors.shadow}`,
    "overflow:hidden",
    "transition:opacity .16s ease,transform .16s ease"
  ].join(";");

  if (isCompact) {
    root.innerHTML = `
      <button data-action="open-graveyard" title="${escapeHtml(activityCopy.title)}" aria-label="${escapeHtml(activityCopy.title)}" style="display:flex;align-items:center;gap:8px;height:38px;max-width:min(310px,calc(100vw - 32px));border:0;background:transparent;color:inherit;padding:0 12px;cursor:pointer;">
        ${activityIcon(activityAi?.status, colors)}
        <span style="min-width:0;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:650;">${escapeHtml(activityCopy.title)}</span>
      </button>
    `;
    root.querySelector<HTMLButtonElement>('[data-action="open-graveyard"]')?.addEventListener("click", () => {
      sendRuntimeMessage({ type: "openDashboard" });
      root.remove();
    });
    document.documentElement.append(root);
    return;
  }

  root.innerHTML = `
    <div style="padding:14px;border-bottom:1px solid ${colors.border};background:${colors.header};">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="display:inline-flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:6px;background:${colors.iconBackground};color:${colors.foreground};">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z"></path>
          </svg>
        </div>
        <div style="font-size:14px;font-weight:700;line-height:1;">Tab Graveyard</div>
      </div>
      <div style="font-size:12px;line-height:1.45;color:${colors.muted};margin-top:7px;">${copy.subtitle}</div>
      ${activityAi ? `
        <div style="display:flex;align-items:center;gap:7px;margin-top:9px;border-top:1px solid ${colors.border};padding-top:9px;color:${activityAi.status === "failed" ? colors.warning : colors.muted};font-size:11px;line-height:1.35;">
          ${activityIcon(activityAi.status, colors)}
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(activityCopy.title)}</span>
        </div>
      ` : ""}
    </div>
    <div style="padding:10px 14px;display:grid;gap:10px;max-height:150px;overflow-y:${tabs.length > 3 ? "auto" : "visible"};">
      ${tabs
        .map(
          (tab, index) => `
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            ${tab.favIconUrl ? `
              <img src="${escapeHtml(tab.favIconUrl)}" alt="" style="flex:0 0 auto;width:28px;height:28px;border-radius:6px;border:1px solid ${colors.border};background:${colors.background};object-fit:contain;padding:3px;">
            ` : `
              <div aria-hidden="true" style="flex:0 0 auto;display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:6px;border:1px solid ${colors.border};background:${colors.iconBackground};color:${colors.foreground};font-size:11px;font-weight:700;">${escapeHtml(getFaviconFallback(tab.domain))}</div>
            `}
            <button data-url-index="${index}" style="min-width:0;flex:1;text-align:left;border:0;background:transparent;padding:0;cursor:pointer;color:inherit;">
              <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tab.title)}</div>
              <div style="font-size:11px;color:${colors.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tab.domain)} · ${tab.archived ? copy.archived : copy.ghost}</div>
            </button>
            <button data-url-index="${index}" title="${copy.open}" aria-label="${copy.open} ${escapeHtml(tab.title)}" style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid ${colors.border};background:${colors.background};color:${colors.foreground};cursor:pointer;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M7 17 17 7"></path>
                <path d="M7 7h10v10"></path>
              </svg>
            </button>
          </div>`
        )
        .join("")}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid ${colors.border};padding:10px 14px 14px;">
      <button data-action="open-graveyard" style="height:30px;padding:0 10px;border-radius:6px;border:1px solid ${colors.border};background:${colors.background};color:${colors.foreground};font-size:12px;font-weight:600;cursor:pointer;">${copy.openGraveyard}</button>
      <button data-action="dismiss" style="height:30px;padding:0 10px;border-radius:6px;border:1px solid ${colors.border};background:${colors.background};color:${colors.foreground};font-size:12px;font-weight:600;cursor:pointer;">${copy.dismiss}</button>
    </div>
  `;

  const ids = tabs.map((tab) => tab.id);
  const openTabs = (selectedTabs: ResurfaceMessage["tabs"]) => {
    sendRuntimeMessage({ type: "resurfaceAction", tabIds: selectedTabs.map((tab) => tab.id), action: "opened" });
    selectedTabs.forEach((tab) => sendRuntimeMessage({ type: "openMemoryTab", tabId: tab.id }));
    activityTabs = [];
    renderActivityOverlay();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-url-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = tabs[Number(button.dataset.urlIndex)];
      if (tab) openTabs([tab]);
    });
  });
  root.querySelector<HTMLButtonElement>('[data-action="dismiss"]')?.addEventListener("click", () => {
    sendRuntimeMessage({ type: "resurfaceAction", tabIds: ids, action: "dismissed" });
    activityTabs = [];
    renderActivityOverlay();
  });
  root.querySelector<HTMLButtonElement>('[data-action="open-graveyard"]')?.addEventListener("click", () => {
    sendRuntimeMessage({ type: "openDashboard" });
    activityTabs = [];
    renderActivityOverlay();
  });
  document.documentElement.append(root);
}

function toggleCommandPalette(language: "en" | "zh", theme: "system" | "light" | "dark", aiAvailable: boolean) {
  const existing = document.getElementById("tab-graveyard-command-palette");
  if (existing) {
    existing.remove();
    return;
  }
  showCommandPalette(language, theme, aiAvailable);
}

function showCommandPalette(language: "en" | "zh", theme: "system" | "light" | "dark", aiAvailable: boolean) {
  const copy = getCommandPaletteCopy(language);
  const colors = getThemeColors(theme);
  const root = document.createElement("div");
  root.id = "tab-graveyard-command-palette";
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "display:flex",
    "align-items:flex-start",
    "justify-content:center",
    "padding-top:18vh",
    "background:rgba(9,9,11,.18)"
  ].join(";");

  const shadow = root.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      *{box-sizing:border-box}
      .panel{width:min(720px,calc(100vw - 32px));border:1px solid ${colors.border};border-radius:10px;background:${colors.background};color:${colors.foreground};box-shadow:${colors.shadow};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
      .search{display:flex;align-items:center;gap:10px;border-bottom:1px solid ${colors.border};padding:14px 16px;background:${colors.header}}
      .icon{width:18px;height:18px;color:${colors.muted};flex:0 0 auto}
      input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:${colors.foreground};font:500 16px/1.4 inherit}
      input::placeholder{color:${colors.muted}}
      .hint{font-size:11px;color:${colors.muted};white-space:nowrap}
      .mode{padding:9px 16px 0;color:${colors.muted};font-size:12px;line-height:1.45}
      .status{padding:6px 16px 10px;color:${colors.muted};font-size:12px;border-bottom:1px solid ${colors.border}}
      .list{display:grid;gap:4px;max-height:380px;overflow:auto;padding:8px}
      .item{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;align-items:center;width:100%;min-width:0;border:0;border-left:2px solid transparent;border-radius:0;background:transparent;color:inherit;text-align:left;padding:8px;cursor:pointer;overflow:hidden}
      .item[aria-selected="true"]{background:${colors.iconBackground}}
      .item.ai{border-left-color:#0099FF;background:rgba(0,153,255,.055)}
      .item.ai[aria-selected="true"]{background:rgba(0,153,255,.12)}
      .avatar{width:32px;height:32px;border-radius:7px;border:1px solid ${colors.border};background:${colors.background};display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:11px;font-weight:700}
      .avatar img{width:100%;height:100%;object-fit:contain;padding:4px}
      .content{display:block;min-width:0;overflow:hidden}
      .title{display:block;max-width:100%;font-size:13px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .item.ai .title{color:${colors.aiTitle}}
      .meta{display:flex;align-items:center;gap:5px;min-width:0;margin-top:3px;font-size:11px;color:${colors.muted};white-space:nowrap;overflow:hidden}
      .domain{min-width:0;overflow:hidden;text-overflow:ellipsis}
      .tag{flex:0 0 auto;border:1px solid ${colors.border};border-radius:999px;background:${colors.background};color:${colors.muted};padding:1px 6px;font-size:10px;font-weight:650;line-height:1.5}
      .reason-tag{max-width:130px;overflow:hidden;text-overflow:ellipsis}
      .item.ai .meta{color:${colors.aiMeta}}
      .item.ai .tag{border-color:rgba(0,153,255,.35);background:rgba(0,153,255,.10);color:${colors.aiMeta}}
      .empty{padding:24px 16px;text-align:center;color:${colors.muted};font-size:13px}
      .footer{display:flex;justify-content:flex-end;border-top:1px solid ${colors.border};padding:10px 12px;background:${colors.header}}
      .open{border:1px solid ${colors.border};border-radius:8px;background:${colors.background};color:${colors.foreground};font:650 12px/1.2 inherit;padding:7px 10px;cursor:pointer}
      .open:hover{background:${colors.iconBackground}}
    </style>
    <div class="panel" role="dialog" aria-label="${copy.title}">
      <div class="search">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
        <input autocomplete="off" spellcheck="false" placeholder="${copy.placeholder}" />
        <span class="hint">${copy.hint}</span>
      </div>
      <div class="mode">${aiAvailable ? copy.aiAvailable : copy.aiUnavailable}</div>
      <div class="status">${copy.ready}</div>
      <div class="list"></div>
      <div class="footer"><button class="open" data-action="open-graveyard" type="button">${copy.openGraveyard}</button></div>
    </div>
  `;

  let results: QuickRecallItem[] = [];
  let selectedIndex = 0;
  let requestSeq = 0;
  const input = shadow.querySelector<HTMLInputElement>("input")!;
  const list = shadow.querySelector<HTMLDivElement>(".list")!;
  const status = shadow.querySelector<HTMLDivElement>(".status")!;
  const openGraveyard = shadow.querySelector<HTMLButtonElement>("[data-action='open-graveyard']")!;
  const close = () => root.remove();
  const render = () => {
    if (!results.length) {
      list.innerHTML = `<div class="empty">${input.value.trim() ? copy.noResults : copy.empty}</div>`;
      return;
    }
    list.innerHTML = results.map((item, index) => `
      <button class="item${item.aiEnhanced ? " ai" : ""}" data-index="${index}" aria-selected="${index === selectedIndex}">
        <span class="avatar">${item.favIconUrl ? `<img src="${escapeHtml(item.favIconUrl)}" alt="">` : escapeHtml(getFaviconFallback(item.domain))}</span>
        <span class="content">
          <span class="title">${escapeHtml(item.title)}</span>
          <span class="meta">
            <span class="domain" title="${escapeHtml(item.domain)}">${escapeHtml(item.domain)}</span>
            <span class="tag">${escapeHtml(copy.categories[item.category])}</span>
            ${formatQuickReasonTag(item, copy)}
          </span>
        </span>
      </button>
    `).join("");
    list.querySelectorAll<HTMLButtonElement>(".item").forEach((button) => {
      button.addEventListener("click", () => openResult(Number(button.dataset.index ?? "0")));
    });
  };
  const search = async () => {
    const seq = ++requestSeq;
    status.textContent = copy.searching;
    try {
      const response = await sendRuntimeRequest<QuickRecallItem[]>({ type: "quickRecall", query: input.value });
      if (seq !== requestSeq) return;
      results = response;
      selectedIndex = 0;
      status.textContent = input.value.trim() ? copy.resultCount(results.length) : copy.ready;
      render();
    } catch (error) {
      if (seq !== requestSeq) return;
      status.textContent = error instanceof Error ? error.message : copy.failed;
    }
  };
  const openResult = (index: number) => {
    const item = results[index];
    if (!item) return;
    sendRuntimeMessage({ type: "openMemoryTab", tabId: item.id });
    close();
  };
  openGraveyard.addEventListener("click", () => {
    sendRuntimeMessage({ type: "openDashboard" });
    close();
  });

  let debounce: number | undefined;
  input.addEventListener("input", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(search, 120);
  });
  shadow.addEventListener("keydown", (event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === "Escape") {
      keyEvent.preventDefault();
      close();
    } else if (keyEvent.key === "ArrowDown") {
      keyEvent.preventDefault();
      selectedIndex = Math.min(results.length - 1, selectedIndex + 1);
      render();
    } else if (keyEvent.key === "ArrowUp") {
      keyEvent.preventDefault();
      selectedIndex = Math.max(0, selectedIndex - 1);
      render();
    } else if (keyEvent.key === "Enter") {
      keyEvent.preventDefault();
      openResult(selectedIndex);
    }
  });
  root.addEventListener("click", (event) => {
    if (event.target === root) close();
  });
  document.documentElement.append(root);
  input.focus();
  void search();
}

function getResurfaceCopy(language: "en" | "zh", count: number) {
  if (language === "zh") {
    return {
      subtitle: `你以前看过 ${count} 个相关页面。`,
      open: "打开",
      archived: "已归档",
      ghost: "幽灵标签",
      openGraveyard: "打开 Graveyard",
      dismiss: "忽略"
    };
  }
  return {
    subtitle: `You looked at ${count === 1 ? "1 related page" : `${count} related pages`} before.`,
    open: "Open",
    archived: "Archived",
    ghost: "Ghost Tab",
    openGraveyard: "Open Graveyard",
    dismiss: "Dismiss"
  };
}

function getActivityCopy(language: "en" | "zh", ai?: { status: AiActivityMessage["status"]; reason?: string }) {
  if (!ai) return { title: language === "zh" ? "Tab Graveyard 活动" : "Tab Graveyard activity" };
  if (language === "zh") {
    if (ai.status === "running") return { title: "AI 正在增强这张记忆卡" };
    if (ai.status === "success") return { title: "AI 已更新这张记忆卡" };
    return { title: "AI 增强暂未完成" };
  }
  if (ai.status === "running") return { title: "AI is enhancing this memory card" };
  if (ai.status === "success") return { title: "AI updated this memory card" };
  return { title: "AI enhancement did not complete" };
}

function formatQuickReasonTag(item: QuickRecallItem, copy: ReturnType<typeof getCommandPaletteCopy>) {
  const defaults = new Set(["Active tab", "Ghost tab", "Archived memory", copy.categories[item.category]]);
  const reason = item.reason.trim();
  if (!reason || defaults.has(reason)) return "";
  return `<span class="tag reason-tag" title="${escapeHtml(reason)}">${escapeHtml(reason)}</span>`;
}

function activityIcon(status: AiActivityMessage["status"] | undefined, colors: ReturnType<typeof getThemeColors>) {
  if (status === "success") {
    return `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${colors.success}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:0 0 auto;">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `;
  }
  if (status === "failed") {
    return `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${colors.warning}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:0 0 auto;">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v6"></path>
        <path d="M12 17h.01"></path>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${colors.foreground}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:0 0 auto;">
      <g>
        <path d="M12 3v3"></path>
        <path d="M12 18v3"></path>
        <path d="m4.22 4.22 2.12 2.12"></path>
        <path d="m17.66 17.66 2.12 2.12"></path>
        <path d="M3 12h3"></path>
        <path d="M18 12h3"></path>
        <path d="m4.22 19.78 2.12-2.12"></path>
        <path d="m17.66 6.34 2.12-2.12"></path>
        ${status === "running" ? `<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1.1s" repeatCount="indefinite"></animateTransform>` : ""}
      </g>
    </svg>
  `;
}

function getCommandPaletteCopy(language: "en" | "zh") {
  if (language === "zh") {
    return {
      title: "Tab Graveyard 快速找回",
      placeholder: "搜索标签、归档、会话...",
      hint: "Enter 打开 · Esc 关闭",
      aiAvailable: "当前面板仅使用本地快速搜索，不会触发 AI 请求。AI 增强找回请打开 Tab Graveyard 页面。",
      aiUnavailable: "未开启 AI：当前仅使用本地快速搜索，不会触发 AI 请求。",
      ready: "输入关键词，或直接选择最近记忆。",
      searching: "搜索中...",
      failed: "搜索失败",
      empty: "最近记忆会显示在这里。",
      noResults: "没有找到匹配的记忆。",
      openGraveyard: "打开 Tab Graveyard",
      resultCount: (count: number) => `${count} 条结果`,
      categories: {
        active: "找回",
        ghost: "幽灵",
        archived: "归档",
        session: "会话"
      } satisfies Record<QuickRecallItem["category"], string>
    };
  }
  return {
    title: "Tab Graveyard quick recall",
    placeholder: "Search tabs, archives, sessions...",
    hint: "Enter open · Esc close",
    aiAvailable: "This panel uses local quick search only and will not send AI requests. Open Tab Graveyard for AI-enhanced recall.",
    aiUnavailable: "AI is off: this panel uses local quick search only and will not send AI requests.",
    ready: "Type to search, or pick a recent memory.",
    searching: "Searching...",
    failed: "Search failed",
    empty: "Recent memory appears here.",
    noResults: "No matching memory found.",
    openGraveyard: "Open Tab Graveyard",
    resultCount: (count: number) => `${count} ${count === 1 ? "result" : "results"}`,
    categories: {
      active: "Recall",
      ghost: "Ghost",
      archived: "Archive",
      session: "Session"
    } satisfies Record<QuickRecallItem["category"], string>
  };
}

function getThemeColors(theme: "system" | "light" | "dark") {
  const resolvedTheme = theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : theme;
  if (resolvedTheme === "dark") {
    return {
      foreground: "#fafafa",
      background: "#09090b",
      header: "#18181b",
      iconBackground: "#27272a",
      muted: "#a1a1aa",
      border: "#27272a",
      success: "#34d399",
      warning: "#fbbf24",
      aiTitle: "#D8F1FF",
      aiMeta: "#8FD5FF",
      shadow: "0 10px 30px rgba(0,0,0,.35)"
    };
  }
  return {
    foreground: "#09090b",
    background: "#ffffff",
    header: "#f4f4f5",
    iconBackground: "#e4e4e7",
    muted: "#71717a",
    border: "#e4e4e7",
    success: "#059669",
    warning: "#b45309",
    aiTitle: "#005F99",
    aiMeta: "#006BB3",
    shadow: "0 10px 30px rgba(0,0,0,.12)"
  };
}

function getFaviconFallback(domain: string) {
  return domain.replace(/^www\./, "").slice(0, 1).toUpperCase() || "?";
}

function sendContentSignal(signal: { activeMs?: number; maxScrollPercent?: number; copiedTextCount?: number; referrerUrl?: string }) {
  return sendRuntimeMessage({ type: "contentSignal", url: location.href, signal });
}

function sendPageMetadata() {
  const previewImageUrl = getPagePreviewImageUrl();
  if (!previewImageUrl) return false;
  return sendRuntimeMessage({ type: "pageMetadata", url: location.href, metadata: { previewImageUrl } });
}

function getPagePreviewImageUrl() {
  if (isDirectImageUrl(location.href)) return location.href;
  const candidates = [
    getMetaContent("meta[property='og:image']"),
    getMetaContent("meta[property='og:image:url']"),
    getMetaContent("meta[name='twitter:image']"),
    getMetaContent("meta[name='twitter:image:src']"),
    document.querySelector<HTMLLinkElement>("link[rel='image_src']")?.href,
    document.querySelector<HTMLImageElement>("main img[src], article img[src], img[src]")?.src
  ];
  for (const candidate of candidates) {
    const url = toHttpUrl(candidate);
    if (url) return url;
  }
  return undefined;
}

function getMetaContent(selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content;
}

function toHttpUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
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

function sendRuntimeMessage(message: Record<string, unknown>) {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) return false;
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
    return true;
  } catch {
    return false;
  }
}

function sendRuntimeRequest<T>(message: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.id) {
        reject(new Error("Tab Graveyard is unavailable on this page."));
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error ?? "Extension request failed"));
          return;
        }
        resolve(response.data as T);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getScrollPercent() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
