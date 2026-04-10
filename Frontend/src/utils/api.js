const API_BASE_URL = 'http://localhost:4000'; // Make sure this matches your backend PORT

/**
 * Helper to make API requests with JSON parsing and error handling.
 */
async function fetchAPI(endpoint, options = {}) {
    // Default headers
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

    // If there is a JSON body, stringify it
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Parse JSON response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// Global API object to be used across pages
window.API = {
    get: (endpoint, headers) => fetchAPI(endpoint, { method: 'GET', headers }),
    post: (endpoint, body, headers) => fetchAPI(endpoint, { method: 'POST', body, headers }),
    put: (endpoint, body, headers) => fetchAPI(endpoint, { method: 'PUT', body, headers }),
    delete: (endpoint, headers) => fetchAPI(endpoint, { method: 'DELETE', headers }),
};
