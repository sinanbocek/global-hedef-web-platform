/**
 * Custom hook for fetching and managing treasury data
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    TreasuryTransaction,
    TreasuryCategory,
    TreasurySummary,
    TreasuryCategoryStats
} from '../types/treasury';

interface UseTreasuryDataReturn {
    // Data
    transactions: TreasuryTransaction[];
    categories: TreasuryCategory[];
    summary: TreasurySummary;
    categoryStats: TreasuryCategoryStats[];

    // State
    loading: boolean;
    error: string | null;

    // Actions
    refetch: () => Promise<void>;
}

export const useTreasuryData = (dateRange: { start: string; end: string }): UseTreasuryDataReturn => {
    const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
    const [categories, setCategories] = useState<TreasuryCategory[]>([]);
    const [summary, setSummary] = useState<TreasurySummary>({
        totalBalance: 0,
        cashBalance: 0,
        bankBalance: 0,
        periodIncome: 0,
        periodExpense: 0,
        periodNet: 0,
        incomeCount: 0,
        expenseCount: 0
    });
    const [categoryStats, setCategoryStats] = useState<TreasuryCategoryStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch categories
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('treasury_categories')
                .select('*')
                .eq('is_active', true)
                .order('type', { ascending: true })
                .order('display_order', { ascending: true });

            if (categoriesError) throw categoriesError;

            // Fetch transactions with joins
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('treasury_transactions')
                .select(`
          *,
          bank_account:settings_bank_accounts(
            id,
            branch_name,
            account_no,
            iban,
            currency
          ),
          policy:policies(
            id,
            policy_no,
            type
          )
        `)
                .eq('is_deleted', false)
                .gte('transaction_date', dateRange.start)
                .lte('transaction_date', dateRange.end)
                .order('transaction_date', { ascending: false });

            if (transactionsError) throw transactionsError;

            // Map transactions
            const mappedTransactions: TreasuryTransaction[] = (transactionsData || []).map((t: any) => ({
                id: t.id,
                transactionDate: t.transaction_date,
                transactionType: t.transaction_type,
                category: t.category,
                amount: parseFloat(t.amount),
                description: t.description || '',
                paymentMethod: t.payment_method,
                bankAccountId: t.bank_account_id,
                relatedCommissionDistributionId: t.related_commission_distribution_id,
                relatedPolicyId: t.related_policy_id,
                createdBy: t.created_by,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                isDeleted: t.is_deleted,
                bankAccount: t.bank_account ? {
                    id: t.bank_account.id,
                    branchName: t.bank_account.branch_name,
                    accountNo: t.bank_account.account_no,
                    iban: t.bank_account.iban,
                    currency: t.bank_account.currency
                } : undefined,
                policy: t.policy ? {
                    id: t.policy.id,
                    policyNo: t.policy.policy_no,
                    type: t.policy.type
                } : undefined
            }));

            // Map categories
            const mappedCategories: TreasuryCategory[] = (categoriesData || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                icon: c.icon,
                color: c.color,
                isActive: c.is_active,
                displayOrder: c.display_order,
                createdAt: c.created_at
            }));

            // Calculate summary for period
            const periodIncome = mappedTransactions
                .filter(t => t.transactionType === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const periodExpense = mappedTransactions
                .filter(t => t.transactionType === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const incomeCount = mappedTransactions.filter(t => t.transactionType === 'income').length;
            const expenseCount = mappedTransactions.filter(t => t.transactionType === 'expense').length;

            // Calculate total balance (all time)
            const { data: allTransactionsData } = await supabase
                .from('treasury_transactions')
                .select('transaction_type, amount, payment_method')
                .eq('is_deleted', false);

            let totalCash = 0;
            let totalBank = 0;

            (allTransactionsData || []).forEach((t: any) => {
                const amount = parseFloat(t.amount);
                const multiplier = t.transaction_type === 'income' ? 1 : -1;

                if (t.payment_method === 'cash') {
                    totalCash += amount * multiplier;
                } else {
                    totalBank += amount * multiplier;
                }
            });

            // Calculate category stats
            const categoryMap = new Map<string, { amount: number; count: number; type: string }>();

            mappedTransactions.forEach(t => {
                const current = categoryMap.get(t.category) || { amount: 0, count: 0, type: t.transactionType };
                categoryMap.set(t.category, {
                    amount: current.amount + t.amount,
                    count: current.count + 1,
                    type: t.transactionType
                });
            });

            const stats: TreasuryCategoryStats[] = Array.from(categoryMap.entries()).map(([category, data]) => {
                const categoryInfo = mappedCategories.find(c => c.name === category);
                const totalForType = data.type === 'income' ? periodIncome : periodExpense;

                return {
                    category,
                    categoryName: category,
                    type: data.type as 'income' | 'expense',
                    amount: data.amount,
                    count: data.count,
                    percentage: totalForType > 0 ? (data.amount / totalForType) * 100 : 0,
                    color: categoryInfo?.color,
                    icon: categoryInfo?.icon
                };
            }).sort((a, b) => b.amount - a.amount);

            // Update state
            setTransactions(mappedTransactions);
            setCategories(mappedCategories);
            setCategoryStats(stats);
            setSummary({
                totalBalance: totalCash + totalBank,
                cashBalance: totalCash,
                bankBalance: totalBank,
                periodIncome,
                periodExpense,
                periodNet: periodIncome - periodExpense,
                incomeCount,
                expenseCount
            });

        } catch (err: any) {
            console.error('Error fetching treasury data:', err);
            setError(err.message || 'Hazine verileri yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        transactions,
        categories,
        summary,
        categoryStats,
        loading,
        error,
        refetch: fetchData
    };
};
