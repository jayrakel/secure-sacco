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

export interface AllocationStatusItem {
    productName: string;
    amount: number;
    status: 'PENDING' | 'ROUTED' | 'FAILED';
}

export interface SplitDepositHistoryItem {
    paymentId: string;
    accountReference: string;
    totalAmount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    failureReason: string | null;
    createdAt: string;
    allocations: AllocationStatusItem[];
}

export interface ProductTransactionItem {
    allocationId: string;
    memberNumber: string | null;
    memberName: string;
    amount: number;
    status: 'PENDING' | 'ROUTED' | 'FAILED';
    reference: string; // live mpesa ref where available, else internal/system ref
    createdAt: string;
    routedAt: string | null;
}

export interface ProductTransactionPage {
    items: ProductTransactionItem[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
    totalAmount: number; // sum of ROUTED amounts only
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

    // SAC-263: the "smart tab" data source — works for any product automatically.
    getTransactions: async (productId: string, page = 0, size = 20): Promise<ProductTransactionPage> => {
        const res = await apiClient.get(`/payment-products/${productId}/transactions`, {
            params: { page, size },
        });
        return res.data;
    },

    downloadStatement: async (productId: string, productName: string): Promise<void> => {
        const res = await apiClient.get(`/payment-products/${productId}/statement`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${productName.replace(/[^a-zA-Z0-9]+/g, '_')}_statement.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
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

    getMyRecent: async (): Promise<SplitDepositHistoryItem[]> => {
        const res = await apiClient.get('/deposits/split/my-recent');
        return res.data;
    },
};