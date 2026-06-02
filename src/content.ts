type ResurfaceMessage = {
  type: "TAB_GRAVEYARD_RESURFACE";
  language?: "en" | "zh";
  theme?: "system" | "light" | "dark";
  tabs: Array<{ id: string; title: string; domain: string; url: string; favIconUrl?: string }>;
};

const tabGraveyardWindow = window as Window & { __tabGraveyardContentLoaded?: boolean };

if (!tabGraveyardWindow.__tabGraveyardContentLoaded) {
  tabGraveyardWindow.__tabGraveyardContentLoaded = true;
  console.info("[Tab Graveyard][content]", "loaded", { url: location.href });

  try {
    chrome.runtime.onMessage.addListener((message: ResurfaceMessage) => {
      console.info("[Tab Graveyard][content]", "message", { type: message.type, count: message.tabs?.length ?? 0, url: location.href });
      if (message.type !== "TAB_GRAVEYARD_RESURFACE" || !message.tabs.length) return;
      showResurface(message.tabs, message.language ?? "en", message.theme ?? "system");
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
}

function showResurface(tabs: ResurfaceMessage["tabs"], language: "en" | "zh", theme: "system" | "light" | "dark") {
  document.getElementById("tab-graveyard-resurface")?.remove();
  console.info("[Tab Graveyard][content]", "show-resurface", { count: tabs.length, url: location.href });
  const copy = getResurfaceCopy(language, tabs.length);
  const colors = getThemeColors(theme);

  const root = document.createElement("div");
  root.id = "tab-graveyard-resurface";
  root.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483647",
    "width:340px",
    "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    `color:${colors.foreground}`,
    `background:${colors.background}`,
    `border:1px solid ${colors.border}`,
    "border-radius:8px",
    `box-shadow:${colors.shadow}`,
    "overflow:hidden"
  ].join(";");

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
              <div style="font-size:11px;color:${colors.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tab.domain)}</div>
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
    selectedTabs.forEach((tab) => sendRuntimeMessage({ type: "openUrl", url: tab.url }));
    root.remove();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-url-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = tabs[Number(button.dataset.urlIndex)];
      if (tab) openTabs([tab]);
    });
  });
  root.querySelector<HTMLButtonElement>('[data-action="dismiss"]')?.addEventListener("click", () => {
    sendRuntimeMessage({ type: "resurfaceAction", tabIds: ids, action: "dismissed" });
    root.remove();
  });
  root.querySelector<HTMLButtonElement>('[data-action="open-graveyard"]')?.addEventListener("click", () => {
    sendRuntimeMessage({ type: "openDashboard" });
    root.remove();
  });
  document.documentElement.append(root);
  window.setTimeout(() => root.remove(), 12_000);
}

function getResurfaceCopy(language: "en" | "zh", count: number) {
  if (language === "zh") {
    return {
      subtitle: `你以前看过 ${count} 个相关页面。`,
      open: "打开",
      openGraveyard: "打开 Graveyard",
      dismiss: "忽略"
    };
  }
  return {
    subtitle: `You looked at ${count === 1 ? "1 related page" : `${count} related pages`} before.`,
    open: "Open",
    openGraveyard: "Open Graveyard",
    dismiss: "Dismiss"
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
    shadow: "0 10px 30px rgba(0,0,0,.12)"
  };
}

function getFaviconFallback(domain: string) {
  return domain.replace(/^www\./, "").slice(0, 1).toUpperCase() || "?";
}

function sendContentSignal(signal: { activeMs?: number; maxScrollPercent?: number; copiedTextCount?: number; referrerUrl?: string }) {
  return sendRuntimeMessage({ type: "contentSignal", url: location.href, signal });
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

function getScrollPercent() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
