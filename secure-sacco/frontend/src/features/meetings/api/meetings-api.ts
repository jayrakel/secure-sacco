import apiClient from '../../../shared/api/api-client';

const API = '/meetings';

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
export type MeetingType = 'GENERAL' | 'AGM' | 'SPECIAL' | 'EMERGENCY';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    meetingType: MeetingType;
    startAt: string;
    endAt?: string;
    lateAfterMinutes: number;
    status: MeetingStatus;
    createdAt: string;
}

export interface AttendanceRecord {
    id: string;
    meetingId: string;
    memberId: string;
    memberName: string;
    memberNumber: string;
    status: AttendanceStatus;
    recordedAt: string;
}

export interface MyMeetingSummary {
    meetingId: string;
    meetingTitle: string;
    startAt: string;
    myStatus: AttendanceStatus | null;
    meetingStatus: MeetingStatus;
}

export const meetingsApi = {
    list: (): Promise<Meeting[]> =>
        apiClient.get(API).then(r => r.data),

    get: (id: string): Promise<Meeting> =>
        apiClient.get(`${API}/${id}`).then(r => r.data),

    create: (data: Partial<Meeting>): Promise<Meeting> =>
        apiClient.post(API, data).then(r => r.data),

    update: (id: string, data: Partial<Meeting>): Promise<Meeting> =>
        apiClient.put(`${API}/${id}`, data).then(r => r.data),

    cancel: (id: string): Promise<Meeting> =>
        apiClient.post(`${API}/${id}/cancel`).then(r => r.data),

    complete: (id: string): Promise<Meeting> =>
        apiClient.post(`${API}/${id}/complete`).then(r => r.data),

    getAttendance: (id: string): Promise<AttendanceRecord[]> =>
        apiClient.get(`${API}/${id}/attendance`).then(r => r.data),

    recordAttendance: (
        id: string,
        records: { memberId: string; status: AttendanceStatus }[]
    ): Promise<AttendanceRecord[]> =>
        apiClient.put(`${API}/${id}/attendance`, { records }).then(r => r.data),

    getMyMeetings: (): Promise<MyMeetingSummary[]> =>
        apiClient.get(`${API}/my`).then(r => r.data),

    checkIn: (id: string): Promise<AttendanceRecord> =>
        apiClient.post(`${API}/${id}/checkin`).then(r => r.data),
};