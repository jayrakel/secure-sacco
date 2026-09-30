import apiClient from '../../../shared/api/api-client';

export interface NotificationPreferenceDto {
  emailEnabled: boolean;
  smsEnabled: boolean;
  notifyOnGuarantorRequests: boolean;
  notifyOnLoanUpdates: boolean;
  notifyOnTransactions: boolean;
}

export const settingsApi = {
  getNotificationPreferences: async (): Promise<NotificationPreferenceDto> => {
    const response = await apiClient.get<NotificationPreferenceDto>('/users/me/notification-settings');
    return response.data;
  },
  
  updateNotificationPreferences: async (data: NotificationPreferenceDto): Promise<NotificationPreferenceDto> => {
    const response = await apiClient.patch<NotificationPreferenceDto>('/users/me/notification-settings', data);
    return response.data;
  }
};
