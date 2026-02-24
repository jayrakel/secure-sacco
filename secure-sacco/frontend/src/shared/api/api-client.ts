import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',
    withCredentials: true, // Required to send SACCO_SESSION cookie
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
        return Promise.reject(error);
    }
);

export default apiClient;