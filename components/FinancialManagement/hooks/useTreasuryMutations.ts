/**
 * Custom hook for treasury transaction mutations (create, update, delete)
 */

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    CreateTreasuryTransactionInput,
    UpdateTreasuryTransactionInput
} from '../types/treasury';

interface UseTreasuryMutationsReturn {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    createTransaction: (data: CreateTreasuryTransactionInput) => Promise<boolean>;
    updateTransaction: (data: UpdateTreasuryTransactionInput) => Promise<boolean>;
    deleteTransaction: (id: string) => Promise<boolean>;
}

export const useTreasuryMutations = (): UseTreasuryMutationsReturn => {
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const createTransaction = async (data: CreateTreasuryTransactionInput): Promise<boolean> => {
        setCreating(true);
        try {
            const { error } = await supabase
                .from('treasury_transactions')
                .insert({
                    transaction_date: data.transactionDate,
                    transaction_type: data.transactionType,
                    category: data.category,
                    amount: data.amount,
                    description: data.description,
                    payment_method: data.paymentMethod,
                    bank_account_id: data.bankAccountId,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                });

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error creating transaction:', err);
            throw new Error(err.message || 'İşlem eklenemedi');
        } finally {
            setCreating(false);
        }
    };

    const updateTransaction = async (data: UpdateTreasuryTransactionInput): Promise<boolean> => {
        setUpdating(true);
        try {
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (data.transactionDate) updateData.transaction_date = data.transactionDate;
            if (data.transactionType) updateData.transaction_type = data.transactionType;
            if (data.category) updateData.category = data.category;
            if (data.amount !== undefined) updateData.amount = data.amount;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.paymentMethod) updateData.payment_method = data.paymentMethod;
            if (data.bankAccountId !== undefined) updateData.bank_account_id = data.bankAccountId;

            const { error } = await supabase
                .from('treasury_transactions')
                .update(updateData)
                .eq('id', data.id);

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error updating transaction:', err);
            throw new Error(err.message || 'İşlem güncellenemedi');
        } finally {
            setUpdating(false);
        }
    };

    const deleteTransaction = async (id: string): Promise<boolean> => {
        setDeleting(true);
        try {
            // Soft delete
            const { error } = await supabase
                .from('treasury_transactions')
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('Error deleting transaction:', err);
            throw new Error(err.message || 'İşlem silinemedi');
        } finally {
            setDeleting(false);
        }
    };

    return {
        creating,
        updating,
        deleting,
        createTransaction,
        updateTransaction,
        deleteTransaction
    };
};
