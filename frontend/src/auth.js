export function saveTokens({ username, access, refresh }) {
  sessionStorage.setItem("tt_user", username);
  sessionStorage.setItem("tt_access", access);
  sessionStorage.setItem("tt_refresh", refresh);
}
export function clearTokens() {
  ["tt_user","tt_access","tt_refresh"].forEach(k => sessionStorage.removeItem(k));
}
export function getUser() { return sessionStorage.getItem("tt_user"); }
export function getAccess() { return sessionStorage.getItem("tt_access"); }
export function getRefresh() { return sessionStorage.getItem("tt_refresh"); }

export async function exchangeNonceIfPresent() {
  const url = new URL(window.location.href);
  const nonce = url.searchParams.get("nonce");
  if (!nonce) return false;
  const r = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gettokens?nonce=${encodeURIComponent(nonce)}`);
  const data = await r.json();
  if (r.ok) {
    saveTokens(data);
    url.searchParams.delete("nonce");
    window.history.replaceState({}, "", url.toString());
    return true;
  }
  console.error("Nonce exchange failed:", data);
  return false;
}

export async function refreshAccessIfNeeded() {
  // simple timed refresh every 25 minutes
  const refresh = getRefresh();
  if (!refresh) return;
  await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/refreshaccesstoken`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refresh}` }
  }).then(r => r.json()).then(d => {
    if (d.access) sessionStorage.setItem("tt_access", d.access);
  });
}
