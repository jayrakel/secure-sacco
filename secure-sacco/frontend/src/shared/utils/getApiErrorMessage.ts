import axios from 'axios';

type ApiErrorData = {
    message?: string;
    error?: string;
};

export function getApiErrorMessage(
    error: unknown,
    fallback = 'Something went wrong'
): string {
    if (axios.isAxiosError<ApiErrorData>(error)) {
        return (
            error.response?.data?.message ??
            error.response?.data?.error ??
            error.message ??
            fallback
        );
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}