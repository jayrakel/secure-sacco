import apiClient from '../../../shared/api/api-client';

export interface Member {
    id: string;
    memberNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    nationalId?: string;
    phoneNumber?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DECEASED';
    createdAt: string;
    updatedAt: string;
}

export interface CreateMemberRequest {
    firstName: string;
    middleName?: string;
    lastName: string;
    nationalId?: string;
    phoneNumber?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
}

export interface MemberPage {
    content: Member[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const memberApi = {
    getMembers: async (q?: string, status?: string, page: number = 0, size: number = 10) => {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (status) params.append('status', status);
        params.append('page', page.toString());
        params.append('size', size.toString());

        const response = await apiClient.get<MemberPage>(`/members?${params.toString()}`);
        return response.data;
    },

    createMember: async (data: CreateMemberRequest) => {
        const response = await apiClient.post<Member>('/members', data);
        return response.data;
    }
};