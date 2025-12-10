/**
 * Enhanced Salespeople Tab - Sales Representative Performance with Analytics
 * FIXED: Y-axis formatting, pie chart labels, table columns, policy detail modal
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    Users,
    Wallet,
    Target,
    TrendingUp,
    Download,
    ChevronRight,
    Search,
    Trophy,
    Medal,
    Award,
    Activity,
    Filter,
    BarChart3,
    X
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatting';
import { useExportCSV } from '../hooks/useExportCSV';
import { useToast } from '../../../contexts/ToastContext';

interface SalespeopleTabProps {
    salespeopleStats: any[];
    distributions: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Format Y-axis with K suffix for thousands
const formatYAxis = (value: number) => {
    if (value >= 1000) {
        return `₺${(value / 1000).toFixed(0)}K`;
    }
    return `₺${value}`;
};

export const SalespeopleTab: React.FC<SalespeopleTabProps> = ({
    salespeopleStats,
    distributions
}) => {
    const { showSuccess, showError } = useToast();
    const { exportCSV } = useExportCSV();
    const navigate = useNavigate();

    // View mode & selections
    const [viewMode, setViewMode] = useState<'table' | 'leaderboard'>('table');
    const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null);
    const [detailPage, setDetailPage] = useState(1);
    const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

    // Filtering & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [minCommission, setMinCommission] = useState(0);
    const [sortBy, setSortBy] = useState<'commission' | 'count' | 'avg'>('commission');

    // Filtered and sorted stats
    const filteredStats = useMemo(() => {
        return salespeopleStats
            .filter(s => {
                const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesMinCommission = s.totalCommission >= minCommission;
                return matchesSearch && matchesMinCommission;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'commission':
                        return b.totalCommission - a.totalCommission;
                    case 'count':
                        return b.policyCount - a.policyCount;
                    case 'avg':
                        return b.avgCommission - a.avgCommission;
                    default:
                        return 0;
                }
            });
    }, [salespeopleStats, searchTerm, minCommission, sortBy]);

    // Performance Charts Data
    const monthlyData = useMemo(() => {
        const months: Record<string, number> = {};
        distributions.forEach(d => {
            const month = new Date(d.distributionDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
            months[month] = (months[month] || 0) + d.salespersonAmount;
        });
        return Object.entries(months).map(([month, total]) => ({ month, total })).slice(-6);
    }, [distributions]);

    const topPerformersData = filteredStats.slice(0, 5).map(s => ({
        name: s.name.split(' ')[0],
        commission: s.totalCommission
    }));

    const productBreakdown = useMemo(() => {
        const products: Record<string, number> = {};
        distributions.forEach(d => {
            const product = d.policy?.type || 'Diğer';
            products[product] = (products[product] || 0) + 1;
        });
        return Object.entries(products).map(([name, value]) => ({ name, value })).slice(0, 6);
    }, [distributions]);

    // Stats
    const topPerformer = filteredStats[0];
    const totalDistributed = filteredStats.reduce((sum, s) => sum + s.totalCommission, 0);
    const avgPerformance = filteredStats.length > 0 ? totalDistributed / filteredStats.length : 0;

    // Activity Timeline
    const recentActivity = distributions
        .sort((a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime())
        .slice(0, 10);

    const handleExport = (salesperson?: any) => {
        const result = exportCSV(distributions, salesperson?.id, salesperson?.name);
        if (result.success) {
            showSuccess('CSV dosyası başarıyla indirildi');
        } else {
            showError(result.error || 'CSV oluşturulurken hata oluştu');
        }
    };

    // Leaderboard rank badges
    const getRankBadge = (index: number) => {
        if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
        if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
        return <span className="text-slate-400 font-bold">#{index + 1}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-brand-primary" />
                        Satış Temsilcisi Performansı
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{filteredStats.length} aktif satış temsilcisi</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === 'table'
                            ? 'bg-brand-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-2" />
                        Tablo
                    </button>
                    <button
                        onClick={() => setViewMode('leaderboard')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewMode === 'leaderboard'
                            ? 'bg-brand-primary text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        <Trophy className="w-4 h-4 inline mr-2" />
                        Liderlik Tablosu
                    </button>
                    <button
                        onClick={() => handleExport()}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        CSV İndir
                    </button>
                </div>
            </div>

            {/* Filtering & Search */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            Satışçı Ara
                        </label>
                        <input
                            type="text"
                            placeholder="İsim ile ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            Minimum Komisyon
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            value={minCommission || ''}
                            onChange={e => setMinCommission(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sırala</label>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                        >
                            <option value="commission">Komisyon (Yüksek → Düşük)</option>
                            <option value="count">Poliçe Sayısı</option>
                            <option value="avg">Ortalama Komisyon</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend with FIXED Y-axis */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Aylık Komisyon Trendi</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={formatYAxis} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Performers with FIXED Y-axis */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top 5 Performans</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={topPerformersData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={formatYAxis} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Bar dataKey="commission" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Product Breakdown with FIXED PIE labels */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Branş Bazında Dağılım</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={productBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {productBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-1 shadow-lg text-white">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 h-full">
                        <p className="text-white/80 text-xs font-medium uppercase tracking-wider">En Başarılı</p>
                        <h3 className="font-bold text-lg mt-1">{topPerformer?.name || '-'}</h3>
                        <div className="text-2xl font-bold mt-2">{formatCurrency(topPerformer?.totalCommission || 0)}</div>
                        <p className="text-xs text-white/70 mt-1">{topPerformer?.policyCount || 0} poliçe</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs text-slate-500 uppercase">Toplam Ekip</p>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{filteredStats.length}</h3>
                    <p className="text-xs text-slate-400 mt-1">Aktif personel</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-xs text-slate-500 uppercase">Toplam Dağıtım</p>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalDistributed)}</h3>
                    <p className="text-xs text-slate-400 mt-1">Dağıtılan komisyon</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-slate-500 uppercase">Ortalama</p>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(avgPerformance)}</h3>
                    <p className="text-xs text-slate-400 mt-1">Kişi başı kazanç</p>
                </div>
            </div>

            {/* Activity Timeline - TABLE FORMAT */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-primary" />
                        Son Satış Aktiviteleri
                    </h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/30">
                            <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <th className="px-6 py-3">Tarih</th>
                                <th className="px-6 py-3">Poliçe Adı</th>
                                <th className="px-6 py-3">Müşteri Adı</th>
                                <th className="px-6 py-3">Satış Temsilcisi</th>
                                <th className="px-6 py-3">Toplam Komisyon</th>
                                <th className="px-6 py-3">Satışçı Primi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {recentActivity.slice(0, 10).map((d, idx) => (
                                <tr
                                    key={d.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                                    onClick={() => setSelectedPolicy(d)}
                                >
                                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                                        {formatDate(d.distributionDate)}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-medium text-slate-800 dark:text-white">
                                        {d.policy?.type || 'N/A'}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
                                        {d.policy?.customer?.full_name || d.policy?.customerName || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                                        {d.salesperson?.name || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(d.totalCommission || 0)}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-bold text-brand-primary">
                                        {formatCurrency(d.salespersonAmount || 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Table or Leaderboard View */}
            {viewMode === 'leaderboard' ? (
                /* LEADERBOARD VIEW */
                <div className="space-y-4">
                    {filteredStats.map((stat, index) => (
                        <div
                            key={stat.id}
                            className={`bg-white dark:bg-slate-800 border rounded-xl p-6 transition-all ${index < 3
                                ? 'border-brand-primary shadow-lg'
                                : 'border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-center min-w-[60px]">{getRankBadge(index)}</div>
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">{stat.name}</h4>
                                        <p className="text-sm text-slate-500">{stat.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-brand-primary">{formatCurrency(stat.totalCommission)}</p>
                                    <p className="text-sm text-slate-500 mt-1">{stat.policyCount} poliçe | Ort: {formatCurrency(stat.avgCommission)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* TABLE VIEW with FIXED columns */
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
                            {filteredStats.map(stat => {
                                const isSelected = selectedSalesperson?.id === stat.id;
                                const startIdx = (detailPage - 1) * 50;
                                const paginatedDists = stat.distributions.slice(startIdx, startIdx + 50);

                                return (
                                    <React.Fragment key={stat.id}>
                                        <tr
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                            onClick={() => {
                                                if (!isSelected) setDetailPage(1);
                                                setSelectedSalesperson(isSelected ? null : stat);
                                            }}
                                        >
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
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleExport(stat);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded"
                                                    title="CSV İndir"
                                                >
                                                    <Download className="w-4 h-4 text-slate-400" />
                                                </button>
                                                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
                                                    <ChevronRight
                                                        className={`w-5 h-5 text-slate-400 transform transition-transform ${isSelected ? 'rotate-90' : ''
                                                            }`}
                                                    />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Details with FIXED table columns */}
                                        {isSelected && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="p-0 border-b border-l border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20"
                                                >
                                                    <div className="p-4 relative">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>

                                                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-50 dark:bg-slate-700/30">
                                                                    <tr className="text-left text-xs font-semibold text-slate-500">
                                                                        <th className="px-4 py-2">Tarih</th>
                                                                        <th className="px-4 py-2">Poliçe Türü</th>
                                                                        <th className="px-4 py-2">Müşteri Adı</th>
                                                                        <th className="px-4 py-2">Toplam Komisyon</th>
                                                                        <th className="px-4 py-2">Satışçı Primi</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                    {paginatedDists.map(d => (
                                                                        <tr
                                                                            key={d.id}
                                                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                                                                            onClick={() => setSelectedPolicy(d)}
                                                                        >
                                                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                                                {formatDate(d.distributionDate)}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                                                                {d.policy?.type || '-'}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-slate-700 dark:text-slate-200 font-medium">
                                                                                {d.policy?.customer?.full_name || d.policy?.customerName || '-'}
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
                                                                    {startIdx + 1} - {Math.min(startIdx + 50, stat.distributions.length)} /{' '}
                                                                    {stat.distributions.length}
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setDetailPage(p => Math.max(1, p - 1));
                                                                        }}
                                                                        disabled={detailPage === 1}
                                                                        className="p-1 px-2 text-xs border rounded hover:bg-slate-100 disabled:opacity-50"
                                                                    >
                                                                        Önceki
                                                                    </button>
                                                                    <button
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setDetailPage(p => p + 1);
                                                                        }}
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
                </div>
            )}

            {/* Policy Detail Modal */}
            {selectedPolicy && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedPolicy(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Poliçe Detayları</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Poliçe No: {selectedPolicy.policy?.policyNo || selectedPolicy.policy?.policy_no || 'N/A'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPolicy(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Başlangıç Tarihi</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        {selectedPolicy.policy?.startDate || selectedPolicy.policy?.start_date
                                            ? formatDate(selectedPolicy.policy.startDate || selectedPolicy.policy.start_date)
                                            : '-'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Bitiş Tarihi</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        {selectedPolicy.policy?.endDate || selectedPolicy.policy?.end_date
                                            ? formatDate(selectedPolicy.policy.endDate || selectedPolicy.policy.end_date)
                                            : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Policy Name & Customer */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Poliçe Adı</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        {selectedPolicy.policy?.type || '-'}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Müşteri</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        {selectedPolicy.policy?.customer?.full_name || selectedPolicy.policy?.customerName || '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Insurance Company & Premium */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Sigorta Şirketi</p>
                                    <div className="flex items-center gap-3">
                                        {(selectedPolicy.policy?.companyLogo || selectedPolicy.policy?.company_logo) && (
                                            <img
                                                src={selectedPolicy.policy.companyLogo || selectedPolicy.policy.company_logo}
                                                alt=""
                                                className="w-12 h-12 object-contain"
                                            />
                                        )}
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {selectedPolicy.policy?.company || selectedPolicy.policy?.insurance_company || '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Poliçe Prim Tutarı</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                        {formatCurrency(selectedPolicy.policy?.premium || 0)}
                                    </p>
                                </div>
                            </div>

                            {/* Commission Breakdown */}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Komisyon Detayları</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <span className="text-xs text-blue-700 dark:text-blue-300">Toplam Komisyon</span>
                                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                            {formatCurrency(selectedPolicy.totalCommission || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <span className="text-xs text-green-700 dark:text-green-300">Satışçı Primi</span>
                                        <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                            {formatCurrency(selectedPolicy.salespersonAmount || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setSelectedPolicy(null)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
