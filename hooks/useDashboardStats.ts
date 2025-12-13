import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
    totalPremium: number;
    totalCommission: number;
    activePolicyCount: number;
    netIncome: number;
    monthlyProduction: { name: string; premium: number; commission: number }[];
    policyDistribution: { name: string; value: number }[];
    recentPolicies: any[];
    expiringPolicies: any[];
    loading: boolean;
    error: string | null;
}

export const useDashboardStats = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalPremium: 0,
        totalCommission: 0,
        activePolicyCount: 0,
        netIncome: 0,
        monthlyProduction: [],
        policyDistribution: [],
        recentPolicies: [],
        expiringPolicies: [],
        loading: true,
        error: null,
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setStats(prev => ({ ...prev, loading: true, error: null }));

            const { data, error } = await supabase.rpc('get_dashboard_stats');

            if (error) throw error;

            setStats({
                totalPremium: data.totalPremium,
                totalCommission: data.totalCommission,
                activePolicyCount: data.activePolicyCount,
                netIncome: data.totalCommission, // Currently assuming Net Income = Total Commission
                monthlyProduction: data.monthlyProduction,
                policyDistribution: data.policyDistribution,
                recentPolicies: data.recentPolicies,
                expiringPolicies: data.expiringPolicies,
                loading: false,
                error: null
            });

        } catch (err: any) {
            console.error('Dashboard data fetch error:', err);
            setStats(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    return { ...stats, refetch: fetchDashboardData };
};
