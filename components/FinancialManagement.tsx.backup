import React, { useState, useEffect } from 'react';
import {
    TrendingUp, DollarSign, Users, Briefcase, PieChart,
    Calendar, Filter, Download, ChevronRight, TrendingDown,
    Wallet, Target, Clock, CheckCircle, AlertCircle, X, CreditCard
} from 'lucide-react';
import {
    Partner, CommissionDistribution, PartnerCommissionAllocation,
    FinancialSummary, CommissionSettings, Policy, CommissionPayment
} from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

type FinancialTab = 'dashboard' | 'distributions' | 'partners' | 'salespeople' | 'treasury' | 'payments';

export const FinancialManagement: React.FC = () => {
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState<FinancialTab>('dashboard');
    const [loading, setLoading] = useState(false);

    // Data States
    const [summary, setSummary] = useState<FinancialSummary>({
        totalPremium: 0,
        totalCommission: 0,
        salespersonTotal: 0,
        partnersTotal: 0,
        companyTotal: 0,
        pendingPayments: 0,
        paidPayments: 0
    });

    const [partners, setPartners] = useState<Partner[]>([]);
    const [salespeopleStats, setSalespeopleStats] = useState<any[]>([]);
    const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
    const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
    const [distributions, setDistributions] = useState<CommissionDistribution[]>([]);
    const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
        salespersonPercentage: 30,
        partnersPercentage: 30,
        companyPercentage: 40
    });
    // Payment States
    const [unpaidItems, setUnpaidItems] = useState<any[]>([]);
    const [paymentRecipient, setPaymentRecipient] = useState<{ type: 'salesperson' | 'partner', id: string, name: string } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDescription, setPaymentDescription] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<CommissionPayment[]>([]);
    const [salespersonDetailPage, setSalespersonDetailPage] = useState(1);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Filters

    // Filters
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Partners
            const { data: partnersData } = await supabase
                .from('partners')
                .select(`
          *,
          current_share:partner_shares(*)
        `)
                .order('name');

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
            setPartners(mappedPartners);

            // 2. Fetch Commission Settings
            const { data: brandData } = await supabase
                .from('settings_brand')
                .select('commission_settings')
                .single();

            if (brandData?.commission_settings) {
                setCommissionSettings(brandData.commission_settings);
            }



            // 3. Fetch Salespeople (Users)
            const { data: usersData } = await supabase
                .from('settings_users')
                .select('id, full_name, email, phone')
                .eq('is_active', true);

            const salesUsers = usersData || [];

            // 4. Fetch Distributions with relations
            const { data: distributionsData } = await supabase
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
          allocations:partner_commission_allocations(*)
        `)
                .gte('distribution_date', dateRange.start)
                .lte('distribution_date', dateRange.end)
                .lte('distribution_date', dateRange.end)
                .order('distribution_date', { ascending: false });

            // 5. Fetch Payment History
            const { data: paymentsData } = await supabase
                .from('commission_payments')
                .select('*')
                .gte('payment_date', dateRange.start)
                .lte('payment_date', dateRange.end + ' 23:59:59')
                .order('payment_date', { ascending: false });

            setPaymentHistory(paymentsData || []);

            // 6. Calculate Unpaid Items for Payment Module
            // Now we have salesUsers available for name mapping
            const unpaidStats = calculateUnpaidStats(distributionsData || [], mappedPartners, salesUsers);
            setUnpaidItems(unpaidStats);

            const mappedDistributions: CommissionDistribution[] = (distributionsData || []).map((d: any) => ({
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
                status: d.payment_id ? 'completed' : d.status, // Check payment_id for status
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
            }));
            setDistributions(mappedDistributions);

            // 4. Calculate Summary
            const totalCommission = mappedDistributions.reduce((sum, d) => sum + d.totalCommission, 0);
            const salespersonTotal = mappedDistributions.reduce((sum, d) => sum + d.salespersonAmount, 0);
            const partnersTotal = mappedDistributions.reduce((sum, d) => sum + d.partnersPoolAmount, 0);
            const companyTotal = mappedDistributions.reduce((sum, d) => sum + d.companyPoolAmount, 0);

            // 5. Calculate Salespeople Stats (Group distributions by salesperson)

            // Group distributions by salesperson
            const stats = salesUsers.map(user => {
                const userDistributions = mappedDistributions.filter(d => d.salespersonId === user.id);
                const totalComm = userDistributions.reduce((sum, d) => sum + d.salespersonAmount, 0);
                const policyCount = userDistributions.length;

                return {
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    policyCount,
                    totalCommission: totalComm,
                    avgCommission: policyCount > 0 ? totalComm / policyCount : 0,
                    distributions: userDistributions
                };
            }).filter(s => s.policyCount > 0 || s.totalCommission > 0).sort((a, b) => b.totalCommission - a.totalCommission);

            setSalespeopleStats(stats);

            // Calculate pending vs paid from allocations
            const allAllocations = mappedDistributions.flatMap(d => d.partnerAllocations || []);
            const pendingPayments = allAllocations
                .filter(a => a.paymentStatus === 'pending')
                .reduce((sum, a) => sum + a.allocatedAmount, 0);
            const paidPayments = allAllocations
                .filter(a => a.paymentStatus === 'paid')
                .reduce((sum, a) => sum + a.allocatedAmount, 0);

            // Get total premium from policies
            const { data: policiesData } = await supabase
                .from('policies')
                .select('premium')
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end);

            const totalPremium = (policiesData || []).reduce((sum: number, p: any) => sum + (parseFloat(p.premium) || 0), 0);

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

        } catch (error) {
            console.error('Error fetching financial data:', error);
            showError('Hata', 'Finansal veriler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };


    const handleExportCSV = (salespersonId?: string, salespersonName?: string) => {
        // Filter data
        let dataToExport;

        if (salespersonId) {
            dataToExport = distributions
                .filter(d => d.salespersonId === salespersonId)
                .map(d => ({
                    Tarih: new Date(d.distributionDate).toLocaleDateString('tr-TR'),
                    'Poliçe No': d.policy?.policyNo || '-',
                    'Müşteri': d.policy?.customerName || '-',
                    'Branş/Ürün': d.policy?.type || '-',
                    'Prim': d.policy?.premium || 0,
                    'Toplam Komisyon': d.totalCommission,
                    'Satışçı Payı': d.salespersonAmount,
                    'Oran': `%${d.salespersonPercentage}`
                }));
        } else {
            // Export all distributions
            dataToExport = distributions.map(d => ({
                Tarih: new Date(d.distributionDate).toLocaleDateString('tr-TR'),
                'Poliçe No': d.policy?.policyNo || '-',
                'Müşteri': d.policy?.customerName || '-',
                'Sigorta Şirketi': d.policy?.company || '-',
                'Branş/Ürün': d.policy?.type || '-',
                'Prim': d.policy?.premium || 0,
                'Toplam Komisyon': d.totalCommission,
                'Satışçı Payı': d.salespersonAmount,
                'Ortak Payı': d.partnersPoolAmount,
                'Şirket Payı': d.companyPoolAmount,
                'Durum': d.status === 'completed' || d.paymentId ? 'Ödendi' : 'Bekliyor'
            }));
        }

        if (dataToExport.length === 0) {
            showError('Hata', 'İndirilecek veri bulunamadı.');
            return;
        }

        // Convert to CSV
        const headers = Object.keys(dataToExport[0]).join(',');
        const rows = dataToExport.map(row => Object.values(row).map(val => `"${val}"`).join(',')); // Quote values to handle commas
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');

        // Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const filename = salespersonName
            ? `Komisyon_Raporu_${salespersonName.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
            : `Genel_Komisyon_Raporu_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchFinancialData();
    }, [dateRange]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const calculateUnpaidStats = (dists: any[], partnersList: Partner[], salesUsers: any[]) => {
        const stats: any[] = [];

        // Salespeople Unpaid
        const salespersonMap = new Map();
        dists.filter(d => d.payment_id === null && d.salesperson_amount > 0).forEach(d => {
            const key = d.salesperson_id;
            // Find name from salesUsers list
            const user = salesUsers.find(u => u.id === key);
            const salesName = user?.full_name || d.policy?.salesperson_name || 'Bilinmiyor';

            if (!salespersonMap.has(key)) salespersonMap.set(key, {
                type: 'salesperson', id: key, name: salesName, amount: 0, count: 0
            });
            const item = salespersonMap.get(key);
            item.amount += Number(d.salesperson_amount);
            item.count++;
        });

        // Partners Unpaid
        const partnerMap = new Map();
        dists.flatMap(d => d.allocations || []).filter((a: any) => a.payment_id === null).forEach((a: any) => {
            const key = a.partner_id;
            const partnerName = partnersList.find(p => p.id === key)?.name || 'Ortak';
            if (!partnerMap.has(key)) partnerMap.set(key, {
                type: 'partner', id: key, name: partnerName, amount: 0, count: 0
            });
            const item = partnerMap.get(key);
            item.amount += Number(a.allocated_amount);
            item.count++;
        });

        return [...salespersonMap.values(), ...partnerMap.values()];
    };

    const handleCreatePayment = async () => {
        if (!paymentRecipient || paymentAmount <= 0) return;
        setProcessingPayment(true);
        try {
            // Find related distribution/allocation IDs
            const distIds = paymentRecipient.type === 'salesperson'
                ? distributions.filter(d => d.salespersonId === paymentRecipient.id && !d.paymentId && d.salespersonAmount > 0).map(d => d.id)
                : [];

            const allocIds = paymentRecipient.type === 'partner'
                ? distributions.flatMap(d => d.partnerAllocations || []).filter(a => a.partnerId === paymentRecipient.id && !a.paymentId).map(a => a.id)
                : [];

            const { error } = await supabase.rpc('create_commission_payment', {
                p_recipient_type: paymentRecipient.type,
                p_recipient_id: paymentRecipient.id,
                p_recipient_name: paymentRecipient.name,
                p_amount: paymentAmount,
                p_description: paymentDescription || 'Komisyon Ödemesi',
                p_distribution_ids: distIds,
                p_allocation_ids: allocIds
            });

            if (error) throw error;
            showSuccess('Ödeme başarıyla kaydedildi.');
            setPaymentRecipient(null);
            setPaymentAmount(0);
            setPaymentDescription('');
            fetchFinancialData(); // Refresh
        } catch (err) {
            console.error(err);
            showError('Ödeme oluşturulurken hata oluştu.');
        } finally {
            setProcessingPayment(false);
        }
    };

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
                {[
                    { id: 'dashboard' as const, label: 'Genel Bakış', icon: PieChart },
                    { id: 'distributions' as const, label: 'Komisyon Dağılımları', icon: DollarSign },
                    { id: 'partners' as const, label: 'Ortaklar', icon: Users },
                    { id: 'salespeople' as const, label: 'Satış Temsilcileri', icon: Briefcase },
                    { id: 'treasury' as const, label: 'Şirket Kasası', icon: Wallet },
                    { id: 'payments' as const, label: 'Ödeme & Dağıtım', icon: CreditCard },
                ].map(tab => (
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
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                            <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Total Premium Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <Target className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Toplam Prim</div>
                                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(summary.totalPremium)}</div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">{distributions.length} poliçe</div>
                                    </div>

                                    {/* Total Commission Card */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <DollarSign className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Toplam Komisyon</div>
                                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(summary.totalCommission)}</div>
                                        <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                                            %{summary.totalPremium > 0 ? ((summary.totalCommission / summary.totalPremium) * 100).toFixed(1) : '0'} prim oranı
                                        </div>
                                    </div>

                                    {/* Pending Payments Card */}
                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <Clock className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">Bekleyen Ödemeler</div>
                                        <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(summary.pendingPayments)}</div>
                                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">Ortak hakları</div>
                                    </div>

                                    {/* Paid Payments Card */}
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <CheckCircle className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">Ödenen Haklar</div>
                                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(summary.paidPayments)}</div>
                                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                                            %{summary.totalCommission > 0 ? ((summary.paidPayments / summary.partnersTotal) * 100).toFixed(0) : '0'} ödendi
                                        </div>
                                    </div>
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
                                                <span>{partners.filter(p => p.isActive).length} ortak</span>
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
                                        {partners.filter(p => p.isActive).map(partner => {
                                            const partnerAllocations = distributions.flatMap(d => d.partnerAllocations || [])
                                                .filter(a => a.partnerId === partner.id);
                                            const partnerTotal = partnerAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
                                            const partnerPending = partnerAllocations.filter(a => a.paymentStatus === 'pending')
                                                .reduce((sum, a) => sum + a.allocatedAmount, 0);
                                            const partnerPaid = partnerAllocations.filter(a => a.paymentStatus === 'paid')
                                                .reduce((sum, a) => sum + a.allocatedAmount, 0);

                                            return (
                                                <div key={partner.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <div className="font-semibold text-slate-800 dark:text-white">{partner.name}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">%{partner.currentShare?.sharePercentage.toFixed(2)} hisse</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 dark:text-slate-300">Toplam:</span>
                                                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(partnerTotal)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-amber-600 dark:text-amber-400">Bekleyen:</span>
                                                            <span className="font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(partnerPending)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-green-600 dark:text-green-400">Ödenen:</span>
                                                            <span className="font-semibold text-green-700 dark:text-green-300">{formatCurrency(partnerPaid)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'distributions' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Komisyon Dağılımları</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {distributions.length} adet dağılım kaydı
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleExportCSV()}
                                        className="btn-secondary px-4 py-2 text-sm flex items-center"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Excel İndir
                                    </button>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                                            <tr className="text-left text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                                <th className="px-6 py-4">Tarih</th>
                                                <th className="px-6 py-4">Poliçe Adı / Ürün</th>
                                                <th className="px-6 py-4">Toplam Komisyon</th>
                                                <th className="px-6 py-4">Satışçı</th>
                                                <th className="px-6 py-4">Ortaklar</th>
                                                <th className="px-6 py-4">Şirket</th>
                                                <th className="px-6 py-4">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {distributions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                                        <p>Henüz komisyon dağılımı bulunmuyor.</p>
                                                        <p className="text-sm mt-1">Poliçeler oluşturulduğunda otomatik olarak dağılımlar hesaplanacak.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                distributions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(dist => (
                                                    <tr key={dist.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                                                {new Date(dist.distributionDate).toLocaleDateString('tr-TR')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-slate-800 dark:text-white">
                                                                {dist.policy?.type || 'Poliçe'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                {dist.policy?.policyNo || dist.policyId.substring(0, 8)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-bold text-slate-800 dark:text-white">
                                                                {formatCurrency(dist.totalCommission)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                                                                {formatCurrency(dist.salespersonAmount)}
                                                            </div>
                                                            <div className="text-xs text-slate-500">%{dist.salespersonPercentage}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                                                                {formatCurrency(dist.partnersPoolAmount)}
                                                            </div>
                                                            <div className="text-xs text-slate-500">%{dist.partnersPercentage}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                                                                {formatCurrency(dist.companyPoolAmount)}
                                                            </div>
                                                            <div className="text-xs text-slate-500">%{dist.companyPercentage}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${dist.status === 'completed' || dist.paymentId
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {dist.status === 'completed' || dist.paymentId ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                                                                {dist.status === 'completed' || dist.paymentId ? 'Ödendi' : 'Bekliyor'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {distributions.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-between mt-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="text-sm text-slate-500">
                                            Toplam <span className="font-bold">{distributions.length}</span> kayıttan <span className="font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, distributions.length)}</span> arası gösteriliyor.
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                                            >
                                                Önceki
                                            </button>
                                            {Array.from({ length: Math.min(5, Math.ceil(distributions.length / ITEMS_PER_PAGE)) }, (_, i) => {
                                                const pageNum = i + 1;
                                                // Simple pagination logic for first 5 pages, can be improved for large numbers
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 flex items-center justify-center text-sm rounded ${currentPage === pageNum
                                                            ? 'bg-brand-primary text-white'
                                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                disabled={currentPage * ITEMS_PER_PAGE >= distributions.length}
                                                className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                                            >
                                                Sonraki
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Partners Tab */}
                        {activeTab === 'partners' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-brand-primary" />
                                    İş Ortakları
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {partners.map(partner => {
                                        const partnerAllocations = distributions.flatMap(d => d.partnerAllocations || []).filter(a => a.partnerId === partner.id);
                                        const total = partnerAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
                                        const pending = partnerAllocations.filter(a => a.paymentStatus === 'pending').reduce((sum, a) => sum + a.allocatedAmount, 0);
                                        const paid = partnerAllocations.filter(a => a.paymentStatus === 'paid').reduce((sum, a) => sum + a.allocatedAmount, 0);

                                        return (
                                            <div key={partner.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                                        {partner.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white">{partner.name}</h4>
                                                        <div className="text-xs text-slate-500">Hisse Oranı: %{partner.currentShare?.sharePercentage || 0}</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-500">Toplam Hakediş:</span>
                                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-amber-600">Bekleyen:</span>
                                                        <span className="font-bold text-amber-700">{formatCurrency(pending)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-green-600">Ödenen:</span>
                                                        <span className="font-bold text-green-700">{formatCurrency(paid)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Salespeople Tab */}
                        {activeTab === 'salespeople' && (
                            <div className="space-y-8">
                                {/* Summary KPIs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Top Performer Card */}
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-1 shadow-lg text-white">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 h-full flex flex-col justify-between">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider">En Başarılı Satışçı</p>
                                                    <h3 className="font-bold text-lg mt-1">{salespeopleStats[0]?.name || '-'}</h3>
                                                </div>
                                                <div className="bg-white/20 p-2 rounded-lg">
                                                    <TrendingUp className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="text-2xl font-bold">{formatCurrency(salespeopleStats[0]?.totalCommission || 0)}</div>
                                                <div className="text-xs text-white/70 mt-1">
                                                    {salespeopleStats[0]?.policyCount || 0} poliçe satışı
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Team Count Card */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Toplam Satış Ekibi</p>
                                                <h3 className="font-bold text-2xl text-slate-800 dark:text-white mt-2">{salespeopleStats.length}</h3>
                                            </div>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
                                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            Aktif çalışan personel
                                        </div>
                                    </div>

                                    {/* Total Distributed Card */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Dağıtılan Toplam Komisyon</p>
                                                <h3 className="font-bold text-2xl text-slate-800 dark:text-white mt-2">{formatCurrency(salespeopleStats.reduce((sum, s) => sum + s.totalCommission, 0))}</h3>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg">
                                                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-2">
                                            Satış ekibine ödenen/hak edilen
                                        </div>
                                    </div>

                                    {/* Avg Performance Card */}
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Ortalama Performans</p>
                                                <h3 className="font-bold text-2xl text-slate-800 dark:text-white mt-2">
                                                    {formatCurrency(
                                                        salespeopleStats.length > 0
                                                            ? salespeopleStats.reduce((sum, s) => sum + s.totalCommission, 0) / salespeopleStats.length
                                                            : 0
                                                    )}
                                                </h3>
                                            </div>
                                            <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg">
                                                <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-2">
                                            Kişi başı ortalama kazanç
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-brand-primary" />
                                        Satış Temsilcisi Performansı
                                    </h3>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                                            <tr className="text-left text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                                <th className="px-6 py-4">Satış Temsilcisi</th>
                                                <th className="px-6 py-4">Poliçe Adedi</th>
                                                <th className="px-6 py-4">Toplam Komisyon</th>
                                                <th className="px-6 py-4">Ortalama Komisyon</th>
                                                <th className="px-6 py-4 text-right">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {salespeopleStats.map(stat => {
                                                const startIdx = (salespersonDetailPage - 1) * 50;
                                                const paginatedDistributions = stat.distributions.slice(startIdx, startIdx + 50);
                                                const topProduct = Object.entries(stat.distributions.reduce((acc: any, curr: any) => {
                                                    const type = curr.policy?.type || 'Diğer';
                                                    acc[type] = (acc[type] || 0) + 1;
                                                    return acc;
                                                }, {})).sort((a: any, b: any) => b[1] - a[1])[0];

                                                return (
                                                    <React.Fragment key={stat.id}>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => {
                                                            if (selectedSalesperson?.id !== stat.id) setSalespersonDetailPage(1);
                                                            setSelectedSalesperson(selectedSalesperson?.id === stat.id ? null : stat);
                                                        }}>
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-slate-800 dark:text-white">{stat.name}</div>
                                                                <div className="text-xs text-slate-500">{stat.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                                <div className="flex items-center gap-2">
                                                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                                                    {stat.policyCount}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-bold text-brand-primary">
                                                                {formatCurrency(stat.totalCommission)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                                {formatCurrency(stat.avgCommission)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
                                                                    <ChevronRight className={`w - 5 h - 5 text - slate - 400 transform transition - transform ${selectedSalesperson?.id === stat.id ? 'rotate-90' : ''}`} />
                                                                </button>

                                                            </td>
                                                        </tr>

                                                        {/* Expanded Details */}
                                                        {selectedSalesperson?.id === stat.id && (
                                                            <tr>
                                                                <td colSpan={5} className="p-0 border-b border-l border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                                                                    <div className="p-4 relative">
                                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>

                                                                        {/* Summary Pills */}
                                                                        <div className="flex flex-wrap gap-4 mb-4">
                                                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                <Target className="w-4 h-4 text-indigo-500" />
                                                                                <span className="text-xs text-slate-500">En Çok Satılan:</span>
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{topProduct?.[0] || '-'}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                                                <span className="text-xs text-slate-500">Toplam Hacim:</span>
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(paginatedDistributions.reduce((acc, curr) => acc + curr.totalCommission, 0))}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                <Briefcase className="w-4 h-4 text-blue-500" />
                                                                                <span className="text-xs text-slate-500">Aktif Poliçe:</span>
                                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{paginatedDistributions.length}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-slate-50 dark:bg-slate-700/30">
                                                                                    <tr className="text-left text-xs font-semibold text-slate-500">
                                                                                        <th className="px-4 py-2">Tarih</th>
                                                                                        <th className="px-4 py-2">Poliçe No</th>
                                                                                        <th className="px-4 py-2">Müşteri</th>
                                                                                        <th className="px-4 py-2">Toplam Komisyon</th>
                                                                                        <th className="px-4 py-2">Satışçı Primi</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                                    {paginatedDistributions.map(d => (
                                                                                        <tr
                                                                                            key={d.id}
                                                                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                                                                                            onClick={() => setSelectedPolicy({
                                                                                                ...d.policy,
                                                                                                totalCommission: d.totalCommission,
                                                                                                salespersonAmount: d.salespersonAmount,
                                                                                                salespersonPercentage: d.salespersonPercentage,
                                                                                                partnersPoolAmount: d.partnersPoolAmount,
                                                                                                partnersPercentage: d.partnersPercentage,
                                                                                                companyPoolAmount: d.companyPoolAmount,
                                                                                                companyPercentage: d.companyPercentage,
                                                                                            })}
                                                                                        >
                                                                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                                                                {new Date(d.distributionDate).toLocaleDateString('tr-TR')}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 font-mono text-xs text-slate-500">
                                                                                                {d.policy?.policyNo || '-'}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 text-slate-700 dark:text-slate-200 font-medium">
                                                                                                {d.policy?.customerName || '-'}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                                                                {formatCurrency(d.totalCommission)}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 font-bold text-brand-primary">
                                                                                                {formatCurrency(d.salespersonAmount)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>

                                                                        {/* Sub-pagination */}
                                                                        {stat.distributions.length > 50 && (
                                                                            <div className="flex items-center justify-between mt-3 px-1">
                                                                                <div className="text-xs text-slate-500">
                                                                                    {startIdx + 1} - {Math.min(startIdx + 50, stat.distributions.length)} / {stat.distributions.length}
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setSalespersonDetailPage(p => Math.max(1, p - 1)); }}
                                                                                        disabled={salespersonDetailPage === 1}
                                                                                        className="p-1 px-2 text-xs border rounded hover:bg-slate-100 disabled:opacity-50"
                                                                                    >
                                                                                        Önceki
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setSalespersonDetailPage(p => p + 1); }}
                                                                                        disabled={startIdx + 50 >= stat.distributions.length}
                                                                                        className="p-1 px-2 text-xs border rounded hover:bg-slate-100 disabled:opacity-50"
                                                                                    >
                                                                                        Sonraki
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div >
                            </div >
                        )}

                        {/* Treasury Tab */}
                        {
                            activeTab === 'treasury' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-brand-primary" />
                                        Şirket Kasası & Hazine
                                    </h3>

                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                                                <Wallet className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-purple-900 dark:text-purple-100">Şirket Net Geliri</h4>
                                                <p className="text-sm text-purple-700 dark:text-purple-300">Seçili dönem komisyon geliri</p>
                                            </div>
                                        </div>
                                        <div className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                                            {formatCurrency(summary.companyTotal)}
                                        </div>
                                        <div className="mt-4 text-sm text-purple-700 dark:text-purple-300">
                                            %{commissionSettings.companyPercentage} komisyon oranı ile {distributions.length} poliçeden
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Prim</div>
                                            <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                                                {formatCurrency(summary.totalPremium)}
                                            </div>
                                            <div className="text-xs text-slate-500">100% prim tutarı</div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Toplam Komisyon</div>
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                                                {formatCurrency(summary.totalCommission)}
                                            </div>
                                            <div className="text-xs text-green-600">
                                                %{summary.totalPremium > 0 ? ((summary.totalCommission / summary.totalPremium) * 100).toFixed(1) : '0'} prim oranı
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Şirket Payı</div>
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                                                {formatCurrency(summary.companyTotal)}
                                            </div>
                                            <div className="text-xs text-purple-600">
                                                %{summary.totalCommission > 0 ? ((summary.companyTotal / summary.totalCommission) * 100).toFixed(1) : '0'} komisyondan
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                                        <h4 className="text-md font-semibold text-slate-800 dark:text-white mb-4">Komisyon Dağılım Özeti</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                                        <Briefcase className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Satışçılar</div>
                                                        <div className="text-xs text-slate-500">%{commissionSettings.salespersonPercentage}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(summary.salespersonTotal)}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Ortaklar</div>
                                                        <div className="text-xs text-slate-500">%{commissionSettings.partnersPercentage}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(summary.partnersTotal)}</div>
                                                    <div className="text-xs text-amber-600">{formatCurrency(summary.pendingPayments)} bekliyor</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                                        <Wallet className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Şirket Kasası</div>
                                                        <div className="text-xs text-slate-500">%{commissionSettings.companyPercentage}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(summary.companyTotal)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Payments Tab */}
                        {
                            activeTab === 'payments' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                <CreditCard className="w-5 h-5 text-brand-primary" />
                                                Komisyon Ödemeleri ve Hak Edişler
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Biriken komisyonları görüntüleyin ve ödeme emri oluşturun.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Unpaid List */}
                                        <div className="lg:col-span-2 space-y-4">
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme Bekleyenler</h4>
                                            {unpaidItems.length === 0 ? (
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                                                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                                                    Tüm ödemeler yapılmış. Bekleyen bakiye bulunmuyor.
                                                </div>
                                            ) : (
                                                unpaidItems.map(item => (
                                                    <div key={`${item.type}-${item.id}`} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 shadow-sm flex justify-between items-center ${paymentRecipient?.id === item.id ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'salesperson' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                    {item.type === 'salesperson' ? 'Satış Temsilcisi' : 'Firma Ortağı'}
                                                                </span>
                                                                <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                                                            </div>
                                                            <div className="text-sm text-slate-500 mt-1">
                                                                {item.count} adet işlemden biriken
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(item.amount)}</div>
                                                                <div className="text-xs text-amber-600 font-medium">Ödeme Bekliyor</div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setPaymentRecipient(item);
                                                                    setPaymentAmount(item.amount);
                                                                }}
                                                                className="btn-secondary px-3 py-2 text-sm"
                                                                disabled={paymentRecipient?.id === item.id}
                                                            >
                                                                Seç
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Payment Action Panel */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme İşlemi</h4>
                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-6">
                                                {!paymentRecipient ? (
                                                    <div className="text-center py-8 text-slate-400">
                                                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                        <p>Ödeme yapmak için soldaki listeden bir kişi seçin.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                                                            <p className="text-xs text-slate-500 uppercase">Ödeme Yapılacak Kişi</p>
                                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{paymentRecipient.name}</p>
                                                        </div>

                                                        <div>
                                                            <label className="text-sm text-slate-600 dark:text-slate-400">Ödenecek Tutar</label>
                                                            <div className="text-2xl font-bold text-brand-primary mt-1">
                                                                {formatCurrency(paymentAmount)}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">Açıklama (Opsiyonel)</label>
                                                            <textarea
                                                                className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                                                                rows={2}
                                                                placeholder="Örn: Haziran ayı komisyon ödemesi..."
                                                                value={paymentDescription}
                                                                onChange={e => setPaymentDescription(e.target.value)}
                                                            />
                                                        </div>

                                                        <div className="pt-2">
                                                            <button
                                                                onClick={handleCreatePayment}
                                                                disabled={processingPayment}
                                                                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                                                            >
                                                                {processingPayment ? (
                                                                    <>
                                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                        İşleniyor...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-5 h-5" />
                                                                        Ödemeyi Onayla & Kapat
                                                                    </>
                                                                )}
                                                            </button>
                                                            <p className="text-xs text-slate-400 text-center mt-3">
                                                                Bu işlem geri alınamaz. İlgili komisyon kayıtları "Ödendi" olarak işaretlenecektir.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment History Table */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
                                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme Geçmişi</h4>
                                        </div>
                                        <table className="w-full">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                                    <th className="px-6 py-4">Tarih</th>
                                                    <th className="px-6 py-4">Kişi / Kurum</th>
                                                    <th className="px-6 py-4">Tutar</th>
                                                    <th className="px-6 py-4">Açıklama</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {paymentHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                            Henüz ödeme kaydı bulunmuyor.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paymentHistory.map(payment => (
                                                        <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                                {new Date(payment.payment_date).toLocaleDateString('tr-TR')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-slate-800 dark:text-white">
                                                                    {payment.recipient_name || 'Bilinmiyor'}
                                                                </div>
                                                                <div className="text-xs text-slate-500 capitalize">
                                                                    {payment.recipient_type === 'partner' ? 'Ortak' : 'Satış Temsilcisi'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                                                {formatCurrency(payment.amount)}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                                {payment.description || '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        } {/* Policy Report Modal */}
                        {
                            selectedPolicy && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] border border-slate-200 dark:border-slate-700 flex flex-col">

                                        {/* Header - Fixed */}
                                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Poliçe Detay Raporu</h3>
                                                <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedPolicy.policyNo}</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPolicy(null)}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                            >
                                                <X className="w-5 h-5 text-slate-500" />
                                            </button>
                                        </div>

                                        {/* Content - Scrollable if needed but compacted to fit */}
                                        <div className="p-5 space-y-5 overflow-y-auto">
                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-0.5">Müşteri</div>
                                                        <div className="font-bold text-slate-800 dark:text-white truncate max-w-[250px]" title={selectedPolicy.customerName}>
                                                            {selectedPolicy.customerName}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
                                                    <div className="text-right w-full">
                                                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">Poliçe Primi</div>
                                                        <div className="font-bold text-slate-800 dark:text-white text-xl">{formatCurrency(selectedPolicy.premium)}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-4 gap-4 text-sm bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sigorta Poliçesi</label>
                                                    <div className="font-medium text-slate-800 dark:text-white mt-0.5 truncate">{selectedPolicy.type}</div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sigorta Şirketi</label>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {selectedPolicy.companyLogo && (
                                                            <img src={selectedPolicy.companyLogo} alt="" className="w-4 h-4 object-contain" />
                                                        )}
                                                        <div className="font-medium text-slate-800 dark:text-white truncate">{selectedPolicy.company}</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Başlangıç</label>
                                                    <div className="font-medium text-slate-800 dark:text-white mt-0.5">
                                                        {selectedPolicy.startDate ? new Date(selectedPolicy.startDate).toLocaleDateString('tr-TR') : '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bitiş</label>
                                                    <div className="font-medium text-slate-800 dark:text-white mt-0.5">
                                                        {selectedPolicy.endDate ? new Date(selectedPolicy.endDate).toLocaleDateString('tr-TR') : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detailed List */}
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-5 border border-slate-100 dark:border-slate-700">
                                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                                                    Komisyon Dağılımı
                                                </h4>

                                                <div className="grid grid-cols-4 gap-4 items-start">
                                                    {/* Toplam Komisyon */}
                                                    <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <div className="text-xs text-slate-500 mb-1 font-medium uppercase">Toplam Komisyon</div>
                                                        <div className="font-bold text-slate-800 dark:text-white text-lg">
                                                            {formatCurrency(selectedPolicy.totalCommission)}
                                                        </div>
                                                    </div>

                                                    {/* Satışçı Payı */}
                                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800/30">
                                                        <div className="text-xs text-green-700 dark:text-green-400 mb-1 font-medium uppercase">Satış Temsilcisi</div>
                                                        <div className="font-bold text-green-700 dark:text-green-400 text-lg">
                                                            {formatCurrency(selectedPolicy.salespersonAmount)}
                                                        </div>
                                                        <div className="text-[10px] text-green-600/70 dark:text-green-500/70 mt-1">
                                                            %{selectedPolicy.salespersonPercentage}
                                                        </div>
                                                    </div>

                                                    {/* Ortaklar Payı */}
                                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                        <div className="text-xs text-blue-700 dark:text-blue-400 mb-1 font-medium uppercase">Ortaklar Payı</div>
                                                        <div className="font-bold text-blue-700 dark:text-blue-400 text-lg">
                                                            {formatCurrency(selectedPolicy.partnersPoolAmount)}
                                                        </div>
                                                        <div className="text-[10px] text-blue-600/70 dark:text-blue-500/70 mt-1">
                                                            %{selectedPolicy.partnersPercentage}
                                                        </div>
                                                    </div>

                                                    {/* Şirket Kasası */}
                                                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                                        <div className="text-xs text-purple-700 dark:text-purple-400 mb-1 font-medium uppercase">Şirket Kasası</div>
                                                        <div className="font-bold text-purple-700 dark:text-purple-400 text-lg">
                                                            {formatCurrency(selectedPolicy.companyPoolAmount)}
                                                        </div>
                                                        <div className="text-[10px] text-purple-600/70 dark:text-purple-500/70 mt-1">
                                                            %{selectedPolicy.companyPercentage}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                            <button
                                                onClick={() => setSelectedPolicy(null)}
                                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                                            >
                                                Kapat
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </>
                )
                }
            </div >
        </div >
    );
};
