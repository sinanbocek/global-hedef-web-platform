/**
 * Calculation utilities for Financial Management
 */

import { CommissionDistribution, Partner, PartnerCommissionAllocation } from '../../../types';

/**
 * Calculate unpaid commission stats by recipient
 */
export const calculateUnpaidStats = (
    distributions: any[],
    partners: Partner[],
    salesUsers: any[]
): Array<{
    type: 'salesperson' | 'partner';
    id: string;
    name: string;
    amount: number;
    count: number;
}> => {
    const stats: any[] = [];

    // Salespeople Unpaid
    const salespersonMap = new Map();
    distributions
        .filter(d => d.payment_id === null && d.salesperson_amount > 0)
        .forEach(d => {
            const key = d.salesperson_id;
            const user = salesUsers.find(u => u.id === key);
            const salesName = user?.full_name || d.policy?.salesperson_name || 'Bilinmiyor';

            if (!salespersonMap.has(key)) {
                salespersonMap.set(key, {
                    type: 'salesperson',
                    id: key,
                    name: salesName,
                    amount: 0,
                    count: 0
                });
            }
            const item = salespersonMap.get(key);
            item.amount += Number(d.salesperson_amount);
            item.count++;
        });

    // Partners Unpaid
    const partnerMap = new Map();
    distributions
        .flatMap(d => d.allocations || [])
        .filter((a: any) => a.payment_id === null)
        .forEach((a: any) => {
            const key = a.partner_id;
            const partnerName = partners.find(p => p.id === key)?.name || 'Ortak';

            if (!partnerMap.has(key)) {
                partnerMap.set(key, {
                    type: 'partner',
                    id: key,
                    name: partnerName,
                    amount: 0,
                    count: 0
                });
            }
            const item = partnerMap.get(key);
            item.amount += Number(a.allocated_amount);
            item.count++;
        });

    return [...salespersonMap.values(), ...partnerMap.values()];
};

/**
 * Calculate partner-specific metrics
 */
export const calculatePartnerMetrics = (
    partnerId: string,
    distributions: CommissionDistribution[]
) => {
    const partnerAllocations = distributions
        .flatMap(d => d.partnerAllocations || [])
        .filter(a => a.partnerId === partnerId);

    const total = partnerAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const pending = partnerAllocations
        .filter(a => a.paymentStatus === 'pending')
        .reduce((sum, a) => sum + a.allocatedAmount, 0);
    const paid = partnerAllocations
        .filter(a => a.paymentStatus === 'paid')
        .reduce((sum, a) => sum + a.allocatedAmount, 0);

    return { total, pending, paid, count: partnerAllocations.length };
};

/**
 * Calculate salesperson stats
 */
export const calculateSalespersonStats = (
    salesUsers: any[],
    distributions: CommissionDistribution[]
) => {
    return salesUsers
        .map(user => {
            const userDistributions = distributions.filter(d => d.salespersonId === user.id);
            const totalCommission = userDistributions.reduce((sum, d) => sum + d.salespersonAmount, 0);
            const policyCount = userDistributions.length;

            return {
                id: user.id,
                name: user.full_name,
                email: user.email,
                policyCount,
                totalCommission,
                avgCommission: policyCount > 0 ? totalCommission / policyCount : 0,
                distributions: userDistributions
            };
        })
        .filter(s => s.policyCount > 0 || s.totalCommission > 0)
        .sort((a, b) => b.totalCommission - a.totalCommission);
};
