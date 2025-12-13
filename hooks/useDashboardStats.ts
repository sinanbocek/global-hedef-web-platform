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

            // 1. Fetch KPI Data (Active Policies)
            const { data: policies, error: policiesError } = await supabase
                .from('policies')
                .select('*');

            if (policiesError) throw policiesError;

            const activePolicies = policies?.filter(p => p.status === 'Active') || [];
            const totalPremium = activePolicies.reduce((sum, p) => sum + (Number(p.premium) || 0), 0);
            const totalCommission = activePolicies.reduce((sum, p) => sum + (Number(p.commission_amount) || 0), 0);

            // Calculate Net Income (For now, just Commission, later subtract expenses if/when expense table exists)
            const netIncome = totalCommission;

            // 2. Calculate Monthly Production (Last 6 months)
            const monthlyData = new Map<string, { premium: number; commission: number }>();
            const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

            // Initialize last 6 months
            const today = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = `${months[d.getMonth()]}`;
                monthlyData.set(key, { premium: 0, commission: 0 });
            }

            policies?.forEach(p => {
                if (!p.start_date) return;
                const d = new Date(p.start_date);
                const key = `${months[d.getMonth()]}`;

                // Only count if it falls in our last 6 months window logic (simplified for now)
                if (monthlyData.has(key)) {
                    const current = monthlyData.get(key)!;
                    monthlyData.set(key, {
                        premium: current.premium + (Number(p.premium) || 0),
                        commission: current.commission + (Number(p.commission_amount) || 0)
                    });
                }
            });

            const monthlyProduction = Array.from(monthlyData.entries()).map(([name, val]) => ({
                name,
                premium: val.premium,
                commission: val.commission
            }));

            // 3. Policy Distribution
            const distributionMap = new Map<string, number>();
            policies?.forEach(p => {
                const type = p.type || 'Diğer';
                distributionMap.set(type, (distributionMap.get(type) || 0) + 1);
            });

            const policyDistribution = Array.from(distributionMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5 types

            // 4. Recent Policies
            const recentPolicies = [...(policies || [])]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5);

            // 5. Expiring Soon (Next 30 days)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const expiringPolicies = policies?.filter(p => {
                if (!p.end_date || p.status !== 'Active') return false;
                const endDate = new Date(p.end_date);
                return endDate >= new Date() && endDate <= thirtyDaysFromNow;
            })
                .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
                .slice(0, 5) || [];

            setStats({
                totalPremium,
                totalCommission,
                activePolicyCount: activePolicies.length,
                netIncome,
                monthlyProduction,
                policyDistribution,
                recentPolicies,
                expiringPolicies,
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
