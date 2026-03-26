import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
    baseURL,
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
        const status = error.response?.status;
        const errorCode = error.response?.data?.error;

        // ── Must-change-password guard ────────────────────────────────────────
        // The backend returns 403 PASSWORD_CHANGE_REQUIRED when the user has an
        // active session but must change their password before doing anything else.
        if (status === 403 && errorCode === 'PASSWORD_CHANGE_REQUIRED') {
            if (!window.location.pathname.startsWith('/change-password')) {
                window.location.href = '/change-password';
            }
            return Promise.reject(error);
        }

        // ── Contact verification guard ────────────────────────────────────────
        // The backend returns 403 CONTACT_VERIFICATION_REQUIRED when any
        // authenticated user's email or phone has not yet been verified.
        // Applies to both SYSTEM_ADMIN and staff officers.
        // Redirect to the dedicated standalone verification page.
        if (status === 403 && errorCode === 'CONTACT_VERIFICATION_REQUIRED') {
            if (!window.location.pathname.startsWith('/verify-contact') &&
                !window.location.pathname.startsWith('/setup')) {
                window.location.href = '/verify-contact';
            }
            return Promise.reject(error);
        }

        // ── Expired / unauthenticated session ─────────────────────────────────
        if (status === 401) {
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        const detailedError = error.response?.data?.message || error.message;
        const errorType = errorCode || 'Unknown Error';
        console.error(`[Backend Error] ${errorType}: ${detailedError}`);
        return Promise.reject(error);
    }
);

export default apiClient;