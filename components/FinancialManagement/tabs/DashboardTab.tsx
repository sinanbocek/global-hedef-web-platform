/**
 * Dashboard Tab - Overview and KPIs
 */

import React from 'react';
import { Users, Briefcase, Wallet, Target, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Partner, CommissionDistribution, FinancialSummary, CommissionSettings } from '../../../types';
import { KPICard } from '../components/KPICard';
import { formatCurrency } from '../utils/formatting';
import { calculatePartnerMetrics } from '../utils/calculations';

interface DashboardTabProps {
    summary: FinancialSummary;
    distributions: CommissionDistribution[];
    partners: Partner[];
    commissionSettings: CommissionSettings;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
    summary,
    distributions,
    partners,
    commissionSettings
}) => {
    const activePartners = partners.filter(p => p.isActive);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Toplam Prim"
                    value={formatCurrency(summary.totalPremium)}
                    subtitle={`${distributions.length} poliçe`}
                    icon={Target}
                    iconColor="text-white"
                    iconBgColor="bg-blue-500"
                    bgGradient="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
                    borderColor="border-blue-200 dark:border-blue-800"
                    textColor="text-blue-700 dark:text-blue-300"
                    subtitleColor="text-blue-600 dark:text-blue-400"
                />

                <KPICard
                    title="Toplam Komisyon"
                    value={formatCurrency(summary.totalCommission)}
                    subtitle={`%${summary.totalPremium > 0 ? ((summary.totalCommission / summary.totalPremium) * 100).toFixed(1) : '0'} prim oranı`}
                    icon={DollarSign}
                    iconColor="text-white"
                    iconBgColor="bg-green-500"
                    bgGradient="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
                    borderColor="border-green-200 dark:border-green-800"
                    textColor="text-green-700 dark:text-green-300"
                    subtitleColor="text-green-600 dark:text-green-400"
                />

                <KPICard
                    title="Bekleyen Ödemeler"
                    value={formatCurrency(summary.pendingPayments)}
                    subtitle="Ortak hakları"
                    icon={Clock}
                    iconColor="text-white"
                    iconBgColor="bg-amber-500"
                    bgGradient="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
                    borderColor="border-amber-200 dark:border-amber-800"
                    textColor="text-amber-700 dark:text-amber-300"
                    subtitleColor="text-amber-600 dark:text-amber-400"
                />

                <KPICard
                    title="Ödenen Haklar"
                    value={formatCurrency(summary.paidPayments)}
                    subtitle={`%${summary.totalCommission > 0 ? ((summary.paidPayments / summary.partnersTotal) * 100).toFixed(0) : '0'} ödendi`}
                    icon={CheckCircle}
                    iconColor="text-white"
                    iconBgColor="bg-purple-500"
                    bgGradient="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
                    borderColor="border-purple-200 dark:border-purple-800"
                    textColor="text-purple-700 dark:text-purple-300"
                    subtitleColor="text-purple-600 dark:text-purple-400"
                />
            </div>

            {/* Commission Distribution Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Salesperson Total */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Satış Temsilcileri</h4>
                        <Briefcase className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{formatCurrency(summary.salespersonTotal)}</div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Oran:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">%{commissionSettings.salespersonPercentage}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {summary.totalCommission > 0 ? ((summary.salespersonTotal / summary.totalCommission) * 100).toFixed(1) : '0'}% toplam komisyondan
                        </div>
                    </div>
                </div>

                {/* Partners Total */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ortaklar Havuzu</h4>
                        <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{formatCurrency(summary.partnersTotal)}</div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Oran:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">%{commissionSettings.partnersPercentage}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                            <span>{activePartners.length} ortak</span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(summary.pendingPayments)} bekliyor</span>
                        </div>
                    </div>
                </div>

                {/* Company Total */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Şirket Kasası</h4>
                        <Wallet className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{formatCurrency(summary.companyTotal)}</div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Oran:</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">%{commissionSettings.companyPercentage}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Net şirket geliri
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner Breakdown */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-primary" />
                    Ortak Bazında Dağılım
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activePartners.map(partner => {
                        const { total, pending, paid } = calculatePartnerMetrics(partner.id, distributions);

                        return (
                            <div key={partner.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="font-semibold text-slate-800 dark:text-white">{partner.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            %{partner.currentShare?.sharePercentage.toFixed(2) || 0} hisse
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-300">Toplam:</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-amber-600 dark:text-amber-400">Bekleyen:</span>
                                        <span className="font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(pending)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-600 dark:text-green-400">Ödenen:</span>
                                        <span className="font-semibold text-green-700 dark:text-green-300">{formatCurrency(paid)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
