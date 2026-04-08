import apiClient from '../../../shared/api/api-client';

export interface TimeTravelStatus {
    currentTime: string;    // ISO Date Time
    realTime: string;       // ISO Date Time
    offsetDays: number;
    isTimeTraveling: boolean;
}

export interface TimeTravelRequest {
    targetDate: string; // YYYY-MM-DD
}

export const timeTravelApi = {
    getStatus: async (): Promise<TimeTravelStatus> => {
        const res = await apiClient.get('/time-travel/current');
        return res.data;
    },

    jumpToDate: async (data: TimeTravelRequest): Promise<TimeTravelStatus> => {
        const res = await apiClient.post('/time-travel/jump', data);
        return res.data;
    },

    resetTime: async (): Promise<TimeTravelStatus> => {
        const res = await apiClient.post('/time-travel/reset');
        return res.data;
    }
};