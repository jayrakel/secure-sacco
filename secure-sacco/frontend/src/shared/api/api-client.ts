import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',
    withCredentials: true, // Required to send SACCOSESSION and XSRF-TOKEN cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor to catch and log detailed backend errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const detailedError = error.response?.data?.message || error.message;
        const errorType = error.response?.data?.type || 'Unknown Error';

        console.error(`[Backend Error] ${errorType}: ${detailedError}`);

        // This allows components to still catch the error
        return Promise.reject(error);
    }
);

// Interceptor to handle CSRF tokens from cookies automatically for non-GET requests
apiClient.interceptors.request.use((config) => {
    const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
    }
    return config;
});

export default apiClient;