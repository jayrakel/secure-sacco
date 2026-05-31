import apiClient from '../../../shared/api/api-client';
import axios from 'axios';

const publicAxios = axios.create({ baseURL: '/api/v1' });

export interface SaccoProfile {
    saccoName: string;
    tagline: string;
    history: string;
    mission: string;
    vision: string;
    foundedYear: number | null;
    logoUrl: string;
    contactPhone: string;
    contactEmail: string;
    contactAddress: string;
}

export interface PublicAnnouncement {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    createdAt: string;
}

export interface PublicDocument {
    id: string;
    title: string;
    description: string;
    category: 'MEETING_MINUTES' | 'NOTICE' | 'FINANCIAL_REPORT' | 'POLICY' | 'OTHER';
    fileUrl: string;
    fileName: string;
    meetingDate: string | null;
    createdAt: string;
}

export interface UpcomingMeeting {
    id: string;
    title: string;
    meetingType: string;
    startAt: string;
    endAt: string | null;
    description: string;
}

export interface LandingPageData {
    profile: SaccoProfile | null;
    announcements: PublicAnnouncement[];
    documents: PublicDocument[];
    upcomingMeetings: UpcomingMeeting[];
    memberCount: number;
    meetingsHeld: number;
    totalDocuments: number;
}

const CATEGORY_LABELS: Record<string, string> = {
    MEETING_MINUTES: 'Meeting Minutes',
    NOTICE: 'Notice',
    FINANCIAL_REPORT: 'Financial Report',
    POLICY: 'Policy Document',
    OTHER: 'General',
};

export const formatCategory = (cat: string) => CATEGORY_LABELS[cat] ?? cat;

export const publicApi = {
    // ── Public (no auth) ──────────────────────────────────────────────────
    getLanding: (): Promise<LandingPageData> =>
        publicAxios.get('/public/landing').then(r => r.data),

    // ── Secretary (authenticated) ─────────────────────────────────────────
    updateProfile: (data: Partial<SaccoProfile & { tagline: string; history: string; mission: string; vision: string; foundedYear: number | null; contactPhone: string; contactEmail: string; contactAddress: string }>) =>
        apiClient.put('/public/admin/profile', data),

    // Announcements
    listAnnouncements: () =>
        apiClient.get<PublicAnnouncement[]>('/public/admin/announcements').then(r => r.data),
    createAnnouncement: (data: { title: string; body: string; isPinned: boolean }) =>
        apiClient.post<PublicAnnouncement>('/public/admin/announcements', data).then(r => r.data),
    updateAnnouncement: (id: string, data: { title: string; body: string; isPinned: boolean }) =>
        apiClient.put<PublicAnnouncement>(`/public/admin/announcements/${id}`, data).then(r => r.data),
    toggleAnnouncement: (id: string) =>
        apiClient.patch(`/public/admin/announcements/${id}/toggle`),
    deleteAnnouncement: (id: string) =>
        apiClient.delete(`/public/admin/announcements/${id}`),

    // Documents
    listDocuments: () =>
        apiClient.get<PublicDocument[]>('/public/admin/documents').then(r => r.data),
    createDocument: (data: Omit<PublicDocument, 'id' | 'createdAt'>) =>
        apiClient.post<PublicDocument>('/public/admin/documents', data).then(r => r.data),
    updateDocument: (id: string, data: Omit<PublicDocument, 'id' | 'createdAt'>) =>
        apiClient.put<PublicDocument>(`/public/admin/documents/${id}`, data).then(r => r.data),
    toggleDocument: (id: string) =>
        apiClient.patch(`/public/admin/documents/${id}/toggle`),
    deleteDocument: (id: string) =>
        apiClient.delete(`/public/admin/documents/${id}`),
};