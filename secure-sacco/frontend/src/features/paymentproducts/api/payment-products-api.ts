import apiClient from '../../../shared/api/api-client';

export type ModuleType = 'SAVINGS' | 'PENALTY' | 'LOAN' | 'CUSTOM';

export interface PaymentProduct {
    id: string;
    name: string;
    code: string;
    description: string | null;
    moduleType: ModuleType;
    glAccountId: string;
    glAccountCode: string;
    glAccountName: string;
    isActive: boolean;
    isSystem: boolean;
    displayOrder: number;
    requiredAmount: number | null; // per-member target, e.g. "KES 2,000 each". Null = uncapped.
    createdAt: string;
}

export interface ProductAllocationContext {
    productId: string;
    productCode: string;
    productName: string;
    moduleType: ModuleType;
    isCapped: boolean;
    outstandingAmount: number | null; // remaining amount the member may still allocate
    requiredAmount: number | null;    // the product's fixed per-member target, if any
    paidAmount: number | null;        // how much this member has already paid toward it
}

export interface AllocationLine {
    productId: string;
    percentage: number;
}

export interface ValidateAllocationResponse {
    valid: boolean;
    errorMessage: string | null;
    fieldErrors: string[];
}

export interface InitiateStkResponse {
    message: string;
    checkoutRequestID: string;
    customerMessage: string;
}

export const paymentProductsApi = {
    // ── Admin CRUD ──────────────────────────────────────────────────────────
    getAll: async (): Promise<PaymentProduct[]> => {
        const res = await apiClient.get('/payment-products');
        return res.data;
    },

    getActive: async (): Promise<PaymentProduct[]> => {
        const res = await apiClient.get('/payment-products/active');
        return res.data;
    },

    create: async (data: {
        name: string;
        code: string;
        description?: string;
        moduleType: ModuleType;
        glAccountId: string;
        displayOrder?: number;
        requiredAmount?: number;
    }): Promise<PaymentProduct> => {
        const res = await apiClient.post('/payment-products', data);
        return res.data;
    },

    update: async (id: string, data: {
        name?: string;
        description?: string;
        glAccountId?: string;
        isActive?: boolean;
        displayOrder?: number;
        requiredAmount?: number;
        clearRequiredAmount?: boolean;
    }): Promise<PaymentProduct> => {
        const res = await apiClient.put(`/payment-products/${id}`, data);
        return res.data;
    },

    remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/payment-products/${id}`);
    },
};

export const splitDepositApi = {
    getContext: async (): Promise<ProductAllocationContext[]> => {
        const res = await apiClient.get('/deposits/split/context');
        return res.data;
    },

    validate: async (totalAmount: number, allocations: AllocationLine[]): Promise<ValidateAllocationResponse> => {
        const res = await apiClient.post('/deposits/split/validate', { totalAmount, allocations });
        return res.data;
    },

    initiate: async (
        totalAmount: number,
        phoneNumber: string,
        allocations: AllocationLine[]
    ): Promise<InitiateStkResponse> => {
        const res = await apiClient.post('/deposits/split/initiate', { totalAmount, phoneNumber, allocations });
        return res.data;
    },
};