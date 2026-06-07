export const CLOUD_AUTH_STORAGE_KEY = "tabGraveyardCloudAuth";
export const CLOUD_AUTH_SERVER_URL = "https://tab-graveyard-server.yooooo.workers.dev";

export type CloudAuthState = {
  provider: "github";
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  authenticatedAt: number;
  user?: {
    login?: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    followers?: number;
    following?: number;
  };
};

export async function getCloudAuthState(): Promise<CloudAuthState | null> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    const raw = window.localStorage.getItem(CLOUD_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) as CloudAuthState : null;
  }
  const data = await chrome.storage.local.get(CLOUD_AUTH_STORAGE_KEY);
  return (data[CLOUD_AUTH_STORAGE_KEY] as CloudAuthState | undefined) ?? null;
}

export async function setCloudAuthState(state: CloudAuthState) {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    window.localStorage.setItem(CLOUD_AUTH_STORAGE_KEY, JSON.stringify(state));
    return;
  }
  await chrome.storage.local.set({ [CLOUD_AUTH_STORAGE_KEY]: state });
}

export async function clearCloudAuthState() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    window.localStorage.removeItem(CLOUD_AUTH_STORAGE_KEY);
    return;
  }
  await chrome.storage.local.remove(CLOUD_AUTH_STORAGE_KEY);
}

export async function revokeCloudAuthState() {
  const state = await getCloudAuthState();
  if (state?.refreshToken) {
    await fetch(new URL("/v1/auth/logout", CLOUD_AUTH_SERVER_URL).toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: state.refreshToken })
    }).catch(() => undefined);
  }
  await clearCloudAuthState();
}
