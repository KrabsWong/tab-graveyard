type ResurfaceMessage = {
  type: "TAB_GRAVEYARD_RESURFACE";
  tabs: Array<{ id: string; title: string; domain: string; url: string }>;
};

const tabGraveyardWindow = window as Window & { __tabGraveyardContentLoaded?: boolean };

if (!tabGraveyardWindow.__tabGraveyardContentLoaded) {
  tabGraveyardWindow.__tabGraveyardContentLoaded = true;
  console.info("[Tab Graveyard][content]", "loaded", { url: location.href });

  chrome.runtime.onMessage.addListener((message: ResurfaceMessage) => {
    console.info("[Tab Graveyard][content]", "message", { type: message.type, count: message.tabs?.length ?? 0, url: location.href });
    if (message.type !== "TAB_GRAVEYARD_RESURFACE" || !message.tabs.length) return;
    showResurface(message.tabs);
  });

  let lastTick = Date.now();
  let lastScrollSignal = 0;

  window.setInterval(() => {
    if (document.visibilityState !== "visible") {
      lastTick = Date.now();
      return;
    }
    const now = Date.now();
    const activeMs = Math.min(now - lastTick, 20_000);
    lastTick = now;
    sendContentSignal({ activeMs, maxScrollPercent: getScrollPercent(), referrerUrl: document.referrer || undefined });
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
      chrome.runtime.sendMessage({ type: "copyUrlTrigger", url: text });
    }
  });
}

function showResurface(tabs: ResurfaceMessage["tabs"]) {
  document.getElementById("tab-graveyard-resurface")?.remove();
  console.info("[Tab Graveyard][content]", "show-resurface", { count: tabs.length, url: location.href });

  const root = document.createElement("div");
  root.id = "tab-graveyard-resurface";
  root.style.cssText = [
    "position:fixed",
    "right:20px",
    "bottom:20px",
    "z-index:2147483647",
    "width:340px",
    "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "color:#12201f",
    "background:#ffffff",
    "border:1px solid #d5dedc",
    "border-radius:8px",
    "box-shadow:0 18px 45px rgba(15,23,42,.18)",
    "overflow:hidden"
  ].join(";");

  const relatedText = tabs.length === 1 ? "1 related page" : `${tabs.length} related pages`;
  root.innerHTML = `
    <div style="padding:14px 14px 10px;border-bottom:1px solid #edf1f0;">
      <div style="font-size:13px;font-weight:700;">Tab Graveyard</div>
      <div style="font-size:12px;line-height:1.45;color:#60706d;margin-top:3px;">You looked at ${relatedText} before. Open Graveyard to recall them?</div>
    </div>
    <div style="padding:10px 14px;display:grid;gap:7px;">
      ${tabs
        .slice(0, 3)
        .map(
          (tab, index) => `
          <button data-url-index="${index}" style="min-width:0;text-align:left;border:0;background:transparent;padding:0;cursor:pointer;color:inherit;">
            <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(tab.title)}</div>
            <div style="font-size:11px;color:#60706d;">${escapeHtml(tab.domain)}</div>
          </button>`
        )
        .join("")}
    </div>
    <div style="display:flex;gap:8px;padding:0 14px 14px;">
      <button data-action="open" style="height:32px;padding:0 12px;border-radius:6px;border:0;background:#1a6660;color:white;font-size:12px;font-weight:700;cursor:pointer;">Open</button>
      <button data-action="dismiss" style="height:32px;padding:0 12px;border-radius:6px;border:1px solid #d5dedc;background:white;color:#12201f;font-size:12px;font-weight:700;cursor:pointer;">Dismiss</button>
    </div>
  `;

  const ids = tabs.map((tab) => tab.id);
  const openTab = (tab: ResurfaceMessage["tabs"][number]) => {
    chrome.runtime.sendMessage({ type: "resurfaceAction", tabIds: [tab.id], action: "opened" });
    chrome.runtime.sendMessage({ type: "openUrl", url: tab.url });
    root.remove();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-url-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = tabs[Number(button.dataset.urlIndex)];
      if (tab) openTab(tab);
    });
  });
  root.querySelector<HTMLButtonElement>('[data-action="dismiss"]')?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "resurfaceAction", tabIds: ids, action: "dismissed" });
    root.remove();
  });
  root.querySelector<HTMLButtonElement>('[data-action="open"]')?.addEventListener("click", () => {
    openTab(tabs[0]);
  });

  document.documentElement.append(root);
  window.setTimeout(() => root.remove(), 12_000);
}

function sendContentSignal(signal: { activeMs?: number; maxScrollPercent?: number; copiedTextCount?: number; referrerUrl?: string }) {
  chrome.runtime.sendMessage({ type: "contentSignal", url: location.href, signal });
}

function getScrollPercent() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
