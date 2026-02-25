import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',
    withCredentials: true, // Required to send SACCO_SESSION cookie

    // --- NEW CSRF CONFIGURATION ---
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    // ------------------------------

    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor to catch and log detailed backend errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Silently handle 401 Unauthorized errors (expected when checking session state or logged out)
        if (error.response && error.response.status === 401) {
            return Promise.reject(error);
        }

        const detailedError = error.response?.data?.message || error.message;
        const errorType = error.response?.data?.error || 'Unknown Error';

        console.error(`[Backend Error] ${errorType}: ${detailedError}`);
        return Promise.reject(error);
    }
);

export default apiClient;