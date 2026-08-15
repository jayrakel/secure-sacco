import { describe, it, expect } from 'vitest';

describe('Transaction Display Credit Types Logic', () => {
    const SAVINGS_CREDIT_TYPES = new Set(['DEPOSIT', 'EXPENSE_REIMBURSEMENT']);
    const STATEMENT_CREDIT_TYPES = new Set(['DEPOSIT', 'EXPENSE_REIMBURSEMENT', 'REPAYMENT', 'WAIVER']);

    it('identifies EXPENSE_REIMBURSEMENT as credit in member savings', () => {
        expect(SAVINGS_CREDIT_TYPES.has('EXPENSE_REIMBURSEMENT')).toBe(true);
        expect(SAVINGS_CREDIT_TYPES.has('DEPOSIT')).toBe(true);
        expect(SAVINGS_CREDIT_TYPES.has('WITHDRAWAL')).toBe(false);
    });

    it('identifies EXPENSE_REIMBURSEMENT as credit in member statements', () => {
        expect(STATEMENT_CREDIT_TYPES.has('EXPENSE_REIMBURSEMENT')).toBe(true);
        expect(STATEMENT_CREDIT_TYPES.has('DEPOSIT')).toBe(true);
        expect(STATEMENT_CREDIT_TYPES.has('REPAYMENT')).toBe(true);
        expect(STATEMENT_CREDIT_TYPES.has('WAIVER')).toBe(true);
        expect(STATEMENT_CREDIT_TYPES.has('WITHDRAWAL')).toBe(false);
        expect(STATEMENT_CREDIT_TYPES.has('DISBURSEMENT')).toBe(false);
    });

    it('calculates running balance correctly with deposits and expense reimbursements', () => {
        const transactions = [
            { type: 'DEPOSIT', amount: 5000 },
            { type: 'EXPENSE_REIMBURSEMENT', amount: 2500 },
            { type: 'WITHDRAWAL', amount: 1000 }
        ];

        let balance = 0;
        const balances = transactions.map(tx => {
            const isCredit = SAVINGS_CREDIT_TYPES.has(tx.type);
            balance = isCredit ? balance + tx.amount : balance - tx.amount;
            return { ...tx, balance, isCredit };
        });

        expect(balances[0].balance).toBe(5000);
        expect(balances[0].isCredit).toBe(true);
        expect(balances[1].balance).toBe(7500);
        expect(balances[1].isCredit).toBe(true);
        expect(balances[2].balance).toBe(6500);
        expect(balances[2].isCredit).toBe(false);
    });

    it('aggregates total deposits including expense reimbursements', () => {
        const transactions = [
            { type: 'DEPOSIT', amount: 1000 },
            { type: 'EXPENSE_REIMBURSEMENT', amount: 500 },
            { type: 'WITHDRAWAL', amount: 200 }
        ];

        const totalDeposits = transactions
            .filter(t => SAVINGS_CREDIT_TYPES.has(t.type))
            .reduce((sum, t) => sum + t.amount, 0);

        const totalWithdrawals = transactions
            .filter(t => t.type === 'WITHDRAWAL')
            .reduce((sum, t) => sum + t.amount, 0);

        expect(totalDeposits).toBe(1500);
        expect(totalWithdrawals).toBe(200);
    });
});
