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
        const status = error.response?.status;
        const errorCode = error.response?.data?.error;

        // ── Must-change-password guard ────────────────────────────────────────
        // The backend returns 403 PASSWORD_CHANGE_REQUIRED when the user has an
        // active session but must change their password before doing anything else.
        // Redirect to the dedicated change-password page immediately.
        if (status === 403 && errorCode === 'PASSWORD_CHANGE_REQUIRED') {
            if (!window.location.pathname.startsWith('/change-password')) {
                window.location.href = '/change-password';
            }
            return Promise.reject(error);
        }

        // ── Contact verification guard ────────────────────────────────────────
        // The backend returns 403 CONTACT_VERIFICATION_REQUIRED when the
        // SYSTEM_ADMIN's email or phone has not yet been verified during setup.
        if (status === 403 && errorCode === 'CONTACT_VERIFICATION_REQUIRED') {
            if (!window.location.pathname.startsWith('/setup') &&
                !window.location.pathname.startsWith('/verify-contact')) {
                window.location.href = '/setup';
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