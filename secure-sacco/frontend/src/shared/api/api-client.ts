import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // FIX: On 401, redirect to login so expired sessions don't silently hang
        if (error.response?.status === 401) {
            // Avoid redirect loop if already on login page
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        const detailedError = error.response?.data?.message || error.message;
        const errorType = error.response?.data?.error || 'Unknown Error';
        console.error(`[Backend Error] ${errorType}: ${detailedError}`);
        return Promise.reject(error);
    }
);

export default apiClient;