import apiClient from '../../../shared/api/api-client';

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface IncomeStatementResponse {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenues: AccountBalance[];
  expenses: AccountBalance[];
}

export const getIncomeStatement = (): Promise<IncomeStatementResponse> =>
  apiClient.get('/accounting/income-statement').then((r) => r.data);
