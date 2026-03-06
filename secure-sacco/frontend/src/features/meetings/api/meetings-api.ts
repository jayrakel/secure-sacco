import axios from 'axios';

const API = '/api/v1/meetings';

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
        axios.get(API).then(r => r.data),

    get: (id: string): Promise<Meeting> =>
        axios.get(`${API}/${id}`).then(r => r.data),

    create: (data: Partial<Meeting>): Promise<Meeting> =>
        axios.post(API, data).then(r => r.data),

    update: (id: string, data: Partial<Meeting>): Promise<Meeting> =>
        axios.put(`${API}/${id}`, data).then(r => r.data),

    cancel: (id: string): Promise<Meeting> =>
        axios.post(`${API}/${id}/cancel`).then(r => r.data),

    complete: (id: string): Promise<Meeting> =>
        axios.post(`${API}/${id}/complete`).then(r => r.data),

    getAttendance: (id: string): Promise<AttendanceRecord[]> =>
        axios.get(`${API}/${id}/attendance`).then(r => r.data),

    recordAttendance: (
        id: string,
        records: { memberId: string; status: AttendanceStatus }[]
    ): Promise<AttendanceRecord[]> =>
        axios.put(`${API}/${id}/attendance`, { records }).then(r => r.data),

    getMyMeetings: (): Promise<MyMeetingSummary[]> =>
        axios.get(`${API}/my`).then(r => r.data),
};