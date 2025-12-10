/**
 * Treasury Module TypeScript Types
 */

export interface TreasuryTransaction {
    id: string;
    transactionDate: string;
    transactionType: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;

    // Relations
    relatedCommissionDistributionId?: string;
    relatedPolicyId?: string;

    // Metadata
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;

    // Joined data (from queries)
    bankAccount?: {
        id: string;
        branchName: string;
        accountNo: string;
        iban: string;
        currency: string;
    };
    policy?: {
        id: string;
        policyNo: string;
        type: string;
    };
}

export interface TreasuryCategory {
    id: string;
    name: string;
    type: 'income' | 'expense';
    icon?: string;
    color?: string;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
}

export interface TreasuryBalanceCache {
    id: string;
    balanceDate: string;
    openingCash: number;
    openingBank: number;
    dailyIncome: number;
    dailyExpense: number;
    closingCash: number;
    closingBank: number;
    closingTotal: number;
    updatedAt: string;
}

export interface TreasurySummary {
    totalBalance: number;
    cashBalance: number;
    bankBalance: number;

    // Period stats
    periodIncome: number;
    periodExpense: number;
    periodNet: number;

    // Transactions count
    incomeCount: number;
    expenseCount: number;
}

export interface TreasuryCategoryStats {
    category: string;
    categoryName: string;
    type: 'income' | 'expense';
    amount: number;
    count: number;
    percentage: number;
    color?: string;
    icon?: string;
}

export interface CreateTreasuryTransactionInput {
    transactionDate: string;
    transactionType: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;
}

export interface UpdateTreasuryTransactionInput extends Partial<CreateTreasuryTransactionInput> {
    id: string;
}
