const API_BASE_URL = 'http://localhost:4000/api'; // Or 5000, verify backend port

/**
 * Creates and shows a UI Loading Spinner
 */
export function showLoader(message = 'Processing...') {
    if (document.getElementById('global-loader')) return;
    
    const loaderHTML = `
        <div id="global-loader" style="position: fixed; top: 0; left: 0; w-full; h-full; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3d89ff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: white; margin-top: 10px; font-family: sans-serif; font-weight: 500;">${message}</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
}

/**
 * Hides the Loading Spinner
 */
export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
}

/**
 * Displays a Toast Notification
 * @param {string} type - 'success' or 'error'
 * @param {string} message 
 */
export function showToast(type, message) {
    const toastId = 'toast-container';
    let container = document.getElementById(toastId);
    if (!container) {
        container = document.createElement('div');
        container.id = toastId;
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#3d89ff' : '#fa746f';
    const icon = type === 'success' ? 'check_circle' : 'error';
    
    toast.style.cssText = `
        background: ${bgColor}; 
        color: white; 
        padding: 12px 20px; 
        border-radius: 8px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
        font-family: 'Inter', sans-serif; 
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;
    
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">${icon}</span> ${message}`;
    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Auto remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Core wrapped fetch logic handling token injection and standardized error passing
 */
export async function fetchAPI(endpoint, options = {}, silent = false) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    if (!silent) showLoader();

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const errorMsg = data.message || data.error || (typeof data === 'string' ? data : 'API Error');
            if (!silent) showToast('error', errorMsg);
            throw new Error(errorMsg);
        }

        // Auto success toast for mutations
        if (!silent && ['POST', 'PUT', 'DELETE'].includes(config.method)) {
            showToast('success', data.message || 'Operation successful');
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        if(!silent && error.message === 'Failed to fetch') {
            showToast('error', 'Cannot connect to server. Please try again.');
        }
        throw error;
    } finally {
        if (!silent) hideLoader();
    }
}
