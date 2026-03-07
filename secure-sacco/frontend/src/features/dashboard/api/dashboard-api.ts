import apiClient from '../../../shared/api/api-client';

export interface StaffDashboardDTO {
    totalMembers: number;
    activeMembers: number;
    pendingActivations: number;

    totalSavings: number; // Matches new Java DTO

    activeLoans: number;
    loanPortfolio: number; // Matches new Java DTO
    loansInArrears: number;
    totalArrearsAmount: number;
    pendingLoanApplications: number;

    openPenalties: number;
    outstandingPenalties: number; // Matches new Java DTO

    todaysCollections: number; // Matches new Java DTO

    upcomingMeetings: number;
    meetingsThisMonth: number;
}

export interface MemberDashboardDTO {
    memberName: string;
    memberNumber: string;
    memberStatus: string;
    registrationStatus: string;

    savingsBalance: number;
    totalDeposited: number;
    totalWithdrawn: number;

    activeLoans: number;
    loanOutstanding: number; // Matches new Java DTO

    nextInstallmentAmount: number | null;
    nextInstallmentDueDate: string | null;

    openPenaltiesCount: number; // Matches new Java DTO
    openPenaltiesAmount: number; // Matches new Java DTO

    upcomingMeetings: number;
    upcomingMeetingId?: string; // Matches new Java DTO
    upcomingMeetingTitle?: string; // Matches new Java DTO
    upcomingMeetingStartAt?: string; // Matches new Java DTO
    upcomingMeetingStatus?: string; // Matches new Java DTO

    attendanceRate: number;
}

export const dashboardApi = {
    getStaffDashboard: async (): Promise<StaffDashboardDTO> => {
        const response = await apiClient.get('/dashboard/staff');
        return response.data;
    },

    getMemberDashboard: async (): Promise<MemberDashboardDTO> => {
        const res = await apiClient.get<MemberDashboardDTO>('/dashboard/member');
        return res.data;
    },
};