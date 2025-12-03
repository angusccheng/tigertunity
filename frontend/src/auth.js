export function saveTokens({ username, access, refresh }) {
  sessionStorage.setItem("tt_user", username);
  sessionStorage.setItem("tt_access", access);
  sessionStorage.setItem("tt_refresh", refresh);
}
export function clearTokens() {
  console.log("this is clearing tokens");
  ["tt_user", "tt_access", "tt_refresh"].forEach(k => sessionStorage.removeItem(k));
}
export function getUser() { return sessionStorage.getItem("tt_user"); }
export function getAccess() { return sessionStorage.getItem("tt_access"); }
export function getRefresh() { return sessionStorage.getItem("tt_refresh"); }

export async function exchangeNonceIfPresent() {
  const url = new URL(window.location.href);
  const nonce = url.searchParams.get("nonce");
  if (!nonce) {
    console.log('No nonce in URL');
    return false;
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const tokenUrl = `${backendUrl}/api/gettokens?nonce=${encodeURIComponent(nonce)}`;
  console.log('Exchanging nonce at:', tokenUrl);

  try {
    const r = await fetch(tokenUrl);
    console.log('Response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      console.error("Nonce exchange failed:", r.status, text);
      alert(`Login failed: ${r.status} ${r.statusText}. Check console for details.`);
      return false;
    }

    const tokens = await r.json();
    console.log('Received tokens:', tokens);

    // Support both legacy array format [username, access, refresh]
    // and new object format { username, access, refresh }
    let parsed = null;
    if (Array.isArray(tokens) && tokens.length === 3) {
      parsed = { username: tokens[0], access: tokens[1], refresh: tokens[2] };
    } else if (tokens && typeof tokens === 'object' && tokens.username && tokens.access && tokens.refresh) {
      parsed = { username: tokens.username, access: tokens.access, refresh: tokens.refresh };
    }

    if (parsed) {
      saveTokens(parsed);
      console.log('Tokens saved, user:', parsed.username);
      url.searchParams.delete("nonce");
      window.history.replaceState({}, "", url.toString());
      return true;
    }

    console.error("Unexpected token format:", tokens);
    return false;
  } catch (error) {
    console.error("Error fetching tokens:", error);
    alert(`Network error during login: ${error.message}`);
    return false;
  }
}

export async function refreshAccessIfNeeded() {
  // simple timed refresh every 25 minutes
  const refresh = getRefresh();
  if (!refresh) return;

  try {
    const r = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/refreshaccesstoken`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refresh}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });

    if (r.status !== 200) {
      return;
    }

    const accesstoken = await r.json();
    // Backend returns the access token directly as a string
    if (accesstoken) {
      sessionStorage.setItem("tt_access", accesstoken);
    }
  } catch (err) {
    // Silently fail on refresh errors
    return;
  }
}

// ---------------- Authenticated fetch wrapper ----------------

export async function authFetch(url, options = {}) {
  const access = getAccess();

  // Start with any caller-provided headers
  const headers = {
    ...(options.headers || {}),
  };

  // Ensure we have a Content-Type unless caller already set one
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Only add Authorization header if we actually have a token
  if (access) {
    headers["Authorization"] = `Bearer ${access}`;
  }

  return fetch(url, { ...options, headers });
}
