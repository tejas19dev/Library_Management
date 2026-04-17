/**
 * utils/api.js — Canonical API layer for DevLibrary
 * Loaded via <script src="../utils/api.js"> in HTML pages that don't use ES modules.
 * Also available globally as window.API
 */

const API_BASE_URL = 'http://localhost:4000/api';

// ── Token helpers ─────────────────────────────────────────────
function getToken()          { return localStorage.getItem('token'); }
function setToken(t)         { localStorage.setItem('token', t); }
function clearToken()        { localStorage.removeItem('token'); }

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
}

function isTokenExpired() {
    const t = getToken();
    if (!t) return true;
    const p = parseJwt(t);
    return !p || p.exp * 1000 < Date.now();
}

// ── Toast notification ────────────────────────────────────────
function toast(type, msg) {
    const id = 'api-toast-container';
    let container = document.getElementById(id);
    if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    const bg = type === 'success' ? '#16a34a' : type === 'warning' ? '#d97706' : '#dc2626';
    el.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:10px;font-size:14px;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0;transform:translateY(10px);transition:all .25s ease;max-width:320px;`;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ── Core fetch wrapper ────────────────────────────────────────
async function request(endpoint, options = {}) {
    // Auto-redirect on expired token for protected routes
    if (isTokenExpired() && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
        clearToken();
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('login')) {
            toast('warning', 'Session expired. Please log in again.');
            setTimeout(() => { window.location.href = 'login_page.html'; }, 1500);
        }
        throw new Error('Session expired');
    }

    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const config = { ...options, headers };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
        let data;
        try { data = await res.json(); } catch { data = {}; }

        if (res.status === 401) {
            clearToken();
            toast('error', 'Unauthorized. Please log in.');
            setTimeout(() => { window.location.href = 'login_page.html'; }, 1200);
            throw new Error('Unauthorized');
        }

        if (!res.ok) {
            const msg = data?.error || data?.message || `Error ${res.status}`;
            toast('error', msg);
            throw new Error(msg);
        }

        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            toast('error', 'Cannot reach server. Is the backend running on port 4000?');
        }
        throw err;
    }
}

// ── Public API object ─────────────────────────────────────────
window.API = {
    get:    (endpoint)         => request(endpoint, { method: 'GET' }),
    post:   (endpoint, body)   => request(endpoint, { method: 'POST', body }),
    put:    (endpoint, body)   => request(endpoint, { method: 'PUT', body }),
    delete: (endpoint)         => request(endpoint, { method: 'DELETE' }),

    // Auth helpers
    login:  (email, password)  => request('/auth/login',  { method: 'POST', body: { email, password } }),
    signup: (email, password, full_name, role) =>
                                   request('/auth/signup', { method: 'POST', body: { email, password, full_name, role } }),
    me:     ()                 => request('/auth/me', { method: 'GET' }),
    logout: () => { clearToken(); window.location.href = 'login_page.html'; },

    // Token helpers exposed
    getToken, setToken, clearToken, parseJwt, isTokenExpired,
};

console.log('✅ API layer ready → ' + API_BASE_URL);
