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
        // FIX: On 401, redirect to login so expired sessions don't silently hang.
        // BUT skip the redirect on public pages that are intentionally unauthenticated,
        // otherwise AuthProvider's /auth/me 401 would boot the user away from those pages.
        const PUBLIC_PATHS = ['/login', '/activate', '/reset-password'];
        if (error.response?.status === 401) {
            const isPublicPage = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
            if (!isPublicPage) {
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