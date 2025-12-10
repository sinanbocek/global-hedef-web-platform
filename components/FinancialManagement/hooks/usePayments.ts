/**
 * Custom hook for payment operations
 */

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { validatePaymentAmount, validatePaymentRecipient } from '../utils/validation';
import { CommissionDistribution } from '../../../types';

interface PaymentRecipient {
    type: 'salesperson' | 'partner';
    id: string;
    name: string;
    maxAmount?: number;
}

interface UsePaymentsReturn {
    processingPayment: boolean;
    createPayment: (
        recipient: PaymentRecipient,
        amount: number,
        description: string,
        distributions: CommissionDistribution[]
    ) => Promise<{ success: boolean; error?: string }>;
}

export const usePayments = (
    onSuccess: () => void,
    onError: (message: string) => void
): UsePaymentsReturn => {
    const [processingPayment, setProcessingPayment] = useState(false);

    const createPayment = async (
        recipient: PaymentRecipient,
        amount: number,
        description: string,
        distributions: CommissionDistribution[]
    ): Promise<{ success: boolean; error?: string }> => {
        // Validation
        const recipientValidation = validatePaymentRecipient(recipient);
        if (!recipientValidation.valid) {
            onError(recipientValidation.error!);
            return { success: false, error: recipientValidation.error };
        }

        const maxAmount = recipient.maxAmount || Number.MAX_SAFE_INTEGER;
        const amountValidation = validatePaymentAmount(amount, maxAmount);
        if (!amountValidation.valid) {
            onError(amountValidation.error!);
            return { success: false, error: amountValidation.error };
        }

        setProcessingPayment(true);

        try {
            // Find related distribution/allocation IDs
            const distIds = recipient.type === 'salesperson'
                ? distributions
                    .filter(d => d.salespersonId === recipient.id && !d.paymentId && d.salespersonAmount > 0)
                    .map(d => d.id)
                : [];

            const allocIds = recipient.type === 'partner'
                ? distributions
                    .flatMap(d => d.partnerAllocations || [])
                    .filter(a => a.partnerId === recipient.id && !a.paymentId)
                    .map(a => a.id)
                : [];

            const { error } = await supabase.rpc('create_commission_payment', {
                p_recipient_type: recipient.type,
                p_recipient_id: recipient.id,
                p_recipient_name: recipient.name,
                p_amount: amount,
                p_description: description || 'Komisyon Ödemesi',
                p_distribution_ids: distIds,
                p_allocation_ids: allocIds
            });

            if (error) throw error;

            onSuccess();
            return { success: true };

        } catch (err: any) {
            console.error('Payment creation error:', err);
            const errorMessage = err.message || 'Ödeme oluşturulurken hata oluştu';
            onError(errorMessage);
            return { success: false, error: errorMessage };

        } finally {
            setProcessingPayment(false);
        }
    };

    return {
        processingPayment,
        createPayment
    };
};
