import { fetchAPI, showToast } from './api.js';

/**
 * Perform a JWT decode to read the payload without verifying signature
 */
export function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

/**
 * Checks if the user is logged in natively
 * @param {boolean} requireAdmin - Whether the checked route requires admin
 */
export function checkAuth(requireAdmin = false) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login_page.html';
        return null;
    }

    const payload = parseJwt(token);
    if (!payload || payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        showToast('error', 'Session expired. Please login again.');
        setTimeout(() => window.location.href = 'login_page.html', 1500);
        return null;
    }

    if (requireAdmin && payload.role !== 'admin') {
        showToast('error', 'Unauthorized. Admin access required.');
        setTimeout(() => window.location.href = 'dashboard.html', 1500); // Or books_catalog
        return null;
    }

    return payload;
}

export async function login(email, password) {
    try {
        const data = await fetchAPI('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        localStorage.setItem('token', data.token);
        
        const decoded = parseJwt(data.token);
        if (decoded?.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'books_catalog.html';
        }
    } catch (error) {
        // Error already handled and toasted by fetchAPI
    }
}

export function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login_page.html';
}

export async function signup(email, password, role = 'user') {
    try {
        await fetchAPI('/auth/signup', {
            method: 'POST',
            body: { email, password, role }
        });
        // On success, try to login automatically
        await login(email, password);
    } catch (error) {
        // Handled by fetchAPI
    }
}
