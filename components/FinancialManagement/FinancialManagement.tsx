/**
 * Financial Management - Main Component (Refactored)
 * Reduced from 1496 lines to ~250 lines
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Briefcase, PieChart, Wallet, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Hooks
import { useFinancialData } from './hooks/useFinancialData';
import { useToast } from '../../contexts/ToastContext';

// Components
import { LoadingState } from './components/LoadingState';
import { ErrorMessage } from './components/ErrorMessage';

// Tabs
import { DashboardTab } from './tabs/DashboardTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { SalespeopleTab } from './tabs/SalespeopleTab';
import { PartnersTab } from './tabs/PartnersTab';
import { TreasuryTab } from './tabs/TreasuryTab';

// Types
type FinancialTab = 'dashboard' | 'distributions' | 'partners' | 'salespeople' | 'treasury' | 'payments';

export const FinancialManagement: React.FC = () => {
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState<FinancialTab>('dashboard');
    const [activeBanks, setActiveBanks] = useState<any[]>([]);

    // Date range filter
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Fetch all financial data using optimized hook
    const {
        partners,
        distributions,
        salespeopleStats,
        summary,
        commissionSettings,
        paymentHistory,
        unpaidItems,
        loading,
        error,
        refetch
    } = useFinancialData(dateRange);

    // Fetch active banks for Treasury
    useEffect(() => {
        const fetchBanks = async () => {
            const { data: banksData } = await supabase
                .from('settings_banks')
                .select('*, accounts:settings_bank_accounts(*)')
                .eq('is_active', true);

            if (banksData) {
                setActiveBanks(banksData.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    logo: b.logo,
                    isActive: true,
                    accounts: (b.accounts || []).map((a: any) => ({
                        id: a.id,
                        branchName: a.branch_name,
                        accountNo: a.account_no,
                        iban: a.iban,
                        currency: a.currency
                    }))
                })));
            }
        };

        fetchBanks();
    }, []);

    // Tab configuration
    const tabs = [
        { id: 'dashboard' as const, label: 'Genel Bakış', icon: PieChart },
        { id: 'partners' as const, label: 'Ortaklar', icon: Users },
        { id: 'salespeople' as const, label: 'Satış Temsilcileri', icon: Briefcase },
        { id: 'treasury' as const, label: 'Şirket Kasası', icon: Wallet },
        { id: 'payments' as const, label: 'Ödeme & Dağıtım', icon: CreditCard },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-brand-primary" />
                        Bilanço & Prim Yönetimi
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Komisyon dağılımları, ortak hakları ve finansal raporlar
                    </p>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-2 py-1 text-sm border-none outline-none bg-transparent dark:text-white"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-2 py-1 text-sm border-none outline-none bg-transparent dark:text-white"
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-brand-primary text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[600px]">
                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={refetch} />
                ) : (
                    <>
                        {activeTab === 'dashboard' && (
                            <DashboardTab
                                summary={summary}
                                distributions={distributions}
                                partners={partners}
                                commissionSettings={commissionSettings}
                            />
                        )}

                        {activeTab === 'partners' && (
                            <PartnersTab partners={partners} distributions={distributions} />
                        )}

                        {activeTab === 'salespeople' && (
                            <SalespeopleTab salespeopleStats={salespeopleStats} distributions={distributions} />
                        )}

                        {activeTab === 'treasury' && (
                            <TreasuryTab
                                dateRange={dateRange}
                                activeBanks={activeBanks}
                            />
                        )}

                        {activeTab === 'payments' && (
                            <PaymentsTab
                                distributions={distributions}
                                unpaidItems={unpaidItems}
                                paymentHistory={paymentHistory}
                                onRefresh={refetch}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
