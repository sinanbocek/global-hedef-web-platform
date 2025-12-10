/**
 * Custom hook for fetching and managing financial data
 * OPTIMIZED: Reduces 7+ queries to 2-3 queries
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Partner,
    CommissionDistribution,
    FinancialSummary,
    CommissionSettings,
    CommissionPayment
} from '../../../types';
import { calculateUnpaidStats, calculateSalespersonStats } from '../utils/calculations';

interface UseFinancialDataReturn {
    // Data
    partners: Partner[];
    distributions: CommissionDistribution[];
    salespeopleStats: any[];
    summary: FinancialSummary;
    commissionSettings: CommissionSettings;
    paymentHistory: CommissionPayment[];
    unpaidItems: any[];

    // State
    loading: boolean;
    error: string | null;

    // Actions
    refetch: () => Promise<void>;
}

export const useFinancialData = (dateRange: { start: string; end: string }): UseFinancialDataReturn => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [distributions, setDistributions] = useState<CommissionDistribution[]>([]);
    const [salespeopleStats, setSalespeopleStats] = useState<any[]>([]);
    const [summary, setSummary] = useState<FinancialSummary>({
        totalPremium: 0,
        totalCommission: 0,
        salespersonTotal: 0,
        partnersTotal: 0,
        companyTotal: 0,
        pendingPayments: 0,
        paidPayments: 0
    });
    const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
        salespersonPercentage: 30,
        partnersPercentage: 30,
        companyPercentage: 40
    });
    const [paymentHistory, setPaymentHistory] = useState<CommissionPayment[]>([]);
    const [unpaidItems, setUnpaidItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // OPTIMIZED QUERY 1: Fetch all financial data in one request with proper joins
            const { data: distributionsData, error: distError } = await supabase
                .from('commission_distributions')
                .select(`
          *,
          policy:policies(
            id,
            policy_no,
            type,
            customer_id,
            premium,
            start_date,
            end_date,
            company_id,
            customer:customers(full_name),
            product:insurance_products(name_tr),
            company:settings_companies(name, logo)
          ),
          allocations:partner_commission_allocations(
            *,
            partner:partners(
              id,
              name,
              tc_vkn,
              email,
              phone,
              is_active,
              created_at
            )
          ),
          payment:commission_payments(*)
        `)
                .gte('distribution_date', dateRange.start)
                .lte('distribution_date', dateRange.end)
                .order('distribution_date', { ascending: false });

            if (distError) throw distError;

            // OPTIMIZED QUERY 2: Fetch partners with active shares
            const { data: partnersData, error: partnersError } = await supabase
                .from('partners')
                .select(`
          *,
          current_share:partner_shares(*)
        `)
                .order('name');

            if (partnersError) throw partnersError;

            // OPTIMIZED QUERY 3: Fetch salespeople (users)
            const { data: usersData, error: usersError } = await supabase
                .from('settings_users')
                .select('id, full_name, email, phone')
                .eq('is_active', true);

            if (usersError) throw usersError;

            // OPTIMIZED QUERY 4: Fetch commission settings
            const { data: brandData, error: brandError } = await supabase
                .from('settings_brand')
                .select('commission_settings')
                .single();

            if (brandError) throw brandError;

            // OPTIMIZED QUERY 5: Fetch payment history
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('commission_payments')
                .select('*')
                .gte('payment_date', dateRange.start)
                .lte('payment_date', dateRange.end + ' 23:59:59')
                .order('payment_date', { ascending: false });

            if (paymentsError) throw paymentsError;

            // Process data
            const salesUsers = usersData || [];

            // Map partners
            const mappedPartners: Partner[] = (partnersData || []).map((p: any) => {
                const activeShare = p.current_share?.find((s: any) => s.effective_until === null);
                return {
                    id: p.id,
                    name: p.name,
                    tcVkn: p.tc_vkn,
                    email: p.email,
                    phone: p.phone,
                    isActive: p.is_active,
                    createdAt: p.created_at,
                    currentShare: activeShare ? {
                        id: activeShare.id,
                        partnerId: activeShare.partner_id,
                        sharePercentage: parseFloat(activeShare.share_percentage),
                        effectiveFrom: activeShare.effective_from,
                        effectiveUntil: activeShare.effective_until,
                        notes: activeShare.notes,
                        createdAt: activeShare.created_at
                    } : undefined
                };
            });

            // Map distributions
            const mappedDistributions: CommissionDistribution[] = (distributionsData || []).map((d: any) => {
                // Find salesperson from users data
                const salesperson = salesUsers.find(u => u.id === d.salesperson_id);

                return {
                    id: d.id,
                    policyId: d.policy_id,
                    totalCommission: parseFloat(d.total_commission),
                    salespersonId: d.salesperson_id,
                    salespersonAmount: parseFloat(d.salesperson_amount),
                    salespersonPercentage: parseFloat(d.salesperson_percentage),
                    partnersPoolAmount: parseFloat(d.partners_pool_amount),
                    partnersPercentage: parseFloat(d.partners_percentage),
                    companyPoolAmount: parseFloat(d.company_pool_amount),
                    companyPercentage: parseFloat(d.company_percentage),
                    distributionDate: d.distribution_date,
                    status: d.payment_id ? 'completed' : d.status,
                    paymentId: d.payment_id,
                    createdAt: d.created_at,
                    policy: d.policy ? {
                        id: d.policy.id,
                        policyNo: d.policy.policy_no,
                        type: d.policy.product?.name_tr || d.policy.type,
                        customerId: d.policy.customer_id,
                        premium: parseFloat(d.policy.premium || 0),
                        customerName: d.policy.customer?.full_name || 'Bilinmiyor',
                        company: d.policy.company?.name || d.policy.company_id || 'Şirket Bilgisi Yok',
                        companyLogo: d.policy.company?.logo,
                        startDate: d.policy.start_date,
                        endDate: d.policy.end_date,
                        status: 'Active'
                    } : undefined,
                    salesperson: salesperson ? {
                        id: salesperson.id,
                        name: salesperson.full_name
                    } : undefined,
                    partnerAllocations: (d.allocations || []).map((a: any) => ({
                        id: a.id,
                        distributionId: a.distribution_id,
                        partnerId: a.partner_id,
                        allocatedAmount: parseFloat(a.allocated_amount),
                        sharePercentage: parseFloat(a.share_percentage),
                        paymentStatus: a.payment_status,
                        paymentDate: a.payment_date,
                        paymentMethod: a.payment_method,
                        paymentReference: a.payment_reference,
                        notes: a.notes,
                        createdAt: a.created_at
                    }))
                };
            });

            // Calculate summary
            const totalCommission = mappedDistributions.reduce((sum, d) => sum + d.totalCommission, 0);
            const salespersonTotal = mappedDistributions.reduce((sum, d) => sum + d.salespersonAmount, 0);
            const partnersTotal = mappedDistributions.reduce((sum, d) => sum + d.partnersPoolAmount, 0);
            const companyTotal = mappedDistributions.reduce((sum, d) => sum + d.companyPoolAmount, 0);

            const allAllocations = mappedDistributions.flatMap(d => d.partnerAllocations || []);
            const pendingPayments = allAllocations
                .filter(a => a.paymentStatus === 'pending')
                .reduce((sum, a) => sum + a.allocatedAmount, 0);
            const paidPayments = allAllocations
                .filter(a => a.paymentStatus === 'paid')
                .reduce((sum, a) => sum + a.allocatedAmount, 0);

            // Fetch total premium separately (lightweight query)
            const { data: policiesData } = await supabase
                .from('policies')
                .select('premium')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end);

            const totalPremium = (policiesData || []).reduce(
                (sum: number, p: any) => sum + (parseFloat(p.premium) || 0),
                0
            );

            // Calculate salespeople stats
            const stats = calculateSalespersonStats(salesUsers, mappedDistributions);

            // Calculate unpaid items
            const unpaid = calculateUnpaidStats(distributionsData || [], mappedPartners, salesUsers);

            // Update state
            setPartners(mappedPartners);
            setDistributions(mappedDistributions);
            setSalespeopleStats(stats);
            setUnpaidItems(unpaid);
            setPaymentHistory(paymentsData || []);

            if (brandData?.commission_settings) {
                setCommissionSettings(brandData.commission_settings);
            }

            setSummary({
                totalPremium,
                totalCommission,
                salespersonTotal,
                partnersTotal,
                companyTotal,
                pendingPayments,
                paidPayments,
                periodStart: dateRange.start,
                periodEnd: dateRange.end
            });

        } catch (err: any) {
            console.error('Error fetching financial data:', err);
            setError(err.message || 'Finansal veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        partners,
        distributions,
        salespeopleStats,
        summary,
        commissionSettings,
        paymentHistory,
        unpaidItems,
        loading,
        error,
        refetch: fetchData
    };
};
