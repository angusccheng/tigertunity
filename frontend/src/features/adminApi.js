import { getAccess } from "../auth";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

async function handleResponse(r) {
    if (!r.ok) {
        const text = await r.text();
        throw new Error(`HTTP ${r.status}: ${text}`);
    }
    return await r.json();
}

export async function fetchAdminClubRequests() {
    const r = await fetch(`${API_BASE}/api/admin/club-requests`, {
        headers: {
            Authorization: `Bearer ${getAccess()}`,
        },
    });
    // If not admin, backend returns 403; surface as empty list to caller
    if (r.status === 403) return { _forbidden: true, data: [] };
    const data = await handleResponse(r);
    return { _forbidden: false, data };
}

export async function approveClubRequest(requestId) {
    const r = await fetch(`${API_BASE}/api/admin/club-requests/${requestId}/approve`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${getAccess()}`,
        },
    });
    return await handleResponse(r);
}

export async function rejectClubRequest(requestId) {
    const r = await fetch(`${API_BASE}/api/admin/club-requests/${requestId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${getAccess()}`,
        },
    });
    return await handleResponse(r);
}

export async function deleteConversation(conversationId) {
    const r = await fetch(`${API_BASE}/api/admin/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${getAccess()}`,
        },
    });
    return await handleResponse(r);
}
