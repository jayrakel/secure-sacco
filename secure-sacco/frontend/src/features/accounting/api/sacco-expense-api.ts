import apiClient from '../../../shared/api/api-client';

export interface SaccoExpenseResponse {
  id: string;
  expenseDate: string;
  amount: number;
  glAccountCode: string;
  narration: string;
  reference: string | null;
  journalReference: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordSaccoExpenseRequest {
  expenseDate: string;
  amount: number;
  glAccountCode: string;
  narration: string;
  reference?: string;
}

export const getSaccoExpenses = (): Promise<SaccoExpenseResponse[]> =>
  apiClient.get('/accounting/sacco-expenses').then((r) => r.data);

export const recordSaccoExpense = (data: RecordSaccoExpenseRequest): Promise<SaccoExpenseResponse> =>
  apiClient.post('/accounting/sacco-expenses', data).then((r) => r.data);
