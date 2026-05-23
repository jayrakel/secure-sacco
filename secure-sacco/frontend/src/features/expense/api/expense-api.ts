import apiClient from '../../../shared/api/api-client';

export type ExpenseClaimResponse = {
  id: string;
  memberId: string;
  memberNumber: string;
  memberName: string;
  amount: number;
  description: string;
  receiptReference: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  journalReference: string | null;
  createdAt: string;
}

export type SubmitExpenseClaimRequest = {
  memberId: string;
  amount: number;
  description: string;
  receiptReference?: string;
}

export type ReviewExpenseClaimRequest = {
  approved: boolean;
  rejectionReason?: string;
}

/** Staff: submit a new expense claim on behalf of a member. */
export const submitExpenseClaim = (
  data: SubmitExpenseClaimRequest
): Promise<ExpenseClaimResponse> =>
  apiClient.post('/expense-claims', data).then((r) => r.data);

/** Member: get my own expense claims. */
export const getMyExpenseClaims = (): Promise<ExpenseClaimResponse[]> =>
  apiClient.get('/expense-claims/my').then((r) => r.data);

/** Staff: get all expense claims (all members, all statuses). */
export const getAllExpenseClaims = (): Promise<ExpenseClaimResponse[]> =>
  apiClient.get('/expense-claims/staff').then((r) => r.data);

/** Staff: approve or reject a PENDING expense claim. */
export const reviewExpenseClaim = (
  id: string,
  data: ReviewExpenseClaimRequest
): Promise<ExpenseClaimResponse> =>
  apiClient.post(`/expense-claims/${id}/review`, data).then((r) => r.data);

