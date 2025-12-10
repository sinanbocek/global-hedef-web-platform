/**
 * Treasury Tab - New Comprehensive Treasury Management
 * Replaces old TreasuryTab.tsx with full transaction management
 */

import React, { useState } from 'react';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Plus,
    Calendar,
    Filter,
    Download,
    Edit2,
    Trash2,
    X,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatting';
import { useTreasuryData } from '../hooks/useTreasuryData';
import { useTreasuryMutations } from '../hooks/useTreasuryMutations';
import { useToast } from '../../../contexts/ToastContext';
import { CreateTreasuryTransactionInput, TreasuryTransaction, TreasuryCategory } from '../types/treasury';

const COLORS = {
    income: '#10b981',
    expense: '#ef4444',
    chart: ['#003087', '#00C2FF', '#FF6B00', '#22c55e', '#ef4444', '#8b5cf6', '#f59e0b']
};

interface TreasuryTabProps {
    dateRange: { start: string; end: string };
    activeBanks: any[];
}

export const TreasuryTab: React.FC<TreasuryTabProps> = ({ dateRange, activeBanks }) => {
    const { showToast } = useToast();
    const { transactions, categories, summary, categoryStats, loading, refetch } = useTreasuryData(dateRange);
    const { creating, createTransaction, updateTransaction, deleteTransaction } = useTreasuryMutations();

    // UI State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TreasuryTransaction | null>(null);
    const [formData, setFormData] = useState<Partial<CreateTreasuryTransactionInput>>({
        transactionType: 'expense',
        category: 'Kira',
        transactionDate: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        paymentMethod: 'cash'
    });
    const [displayAmount, setDisplayAmount] = useState('');

    // Kategorileri filtrele
    const activeCategories = categories.filter(c =>
        c.type === formData.transactionType && c.isActive
    );

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) return;

        let integerPart = parts[0].replace(/\./g, '');
        const decimalPart = parts[1];

        if (integerPart) {
            integerPart = parseInt(integerPart).toLocaleString('tr-TR');
        }

        const finalDisplay = decimalPart !== undefined ? `${integerPart},${decimalPart}` : integerPart;
        setDisplayAmount(finalDisplay);

        const rawVal = val.replace(/\./g, '').replace(',', '.');
        setFormData({ ...formData, amount: parseFloat(rawVal) || 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.amount || formData.amount <= 0) {
            showToast('Hata', 'Lütfen geçerli bir tutar giriniz', 'error');
            return;
        }

        if (!formData.description?.trim()) {
            if (!window.confirm('Açıklama boş. Devam etmek istiyor musunuz?')) return;
        }

        try {
            if (editingTransaction) {
                await updateTransaction({
                    id: editingTransaction.id,
                    ...formData as any
                });
                showToast('Başarılı', 'İşlem güncellendi', 'success');
            } else {
                await createTransaction(formData as CreateTreasuryTransactionInput);
                showToast('Başarılı', 'İşlem eklendi', 'success');
            }

            // Reset form
            setFormData({
                transactionType: 'expense',
                category: 'Kira',
                transactionDate: new Date().toISOString().split('T')[0],
                amount: 0,
                description: '',
                paymentMethod: 'cash'
            });
            setDisplayAmount('');
            setShowAddModal(false);
            setEditingTransaction(null);
            refetch();
        } catch (err: any) {
            showToast('Hata', err.message, 'error');
        }
    };

    const handleEdit = (transaction: TreasuryTransaction) => {
        setEditingTransaction(transaction);
        setFormData({
            transactionDate: transaction.transactionDate,
            transactionType: transaction.transactionType,
            category: transaction.category,
            amount: transaction.amount,
            description: transaction.description,
            paymentMethod: transaction.paymentMethod,
            bankAccountId: transaction.bankAccountId
        });
        setDisplayAmount(transaction.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;

        try {
            await deleteTransaction(id);
            showToast('Başarılı', 'İşlem silindi', 'success');
            refetch();
        } catch (err: any) {
            showToast('Hata', err.message, 'error');
        }
    };

    const expenseStats = categoryStats.filter(c => c.type === 'expense');
    const incomeStats = categoryStats.filter(c => c.type === 'income');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-brand-primary" />
                    Şirket Kasası & Hazine Yönetimi
                </h3>
                <button
                    onClick={() => {
                        setEditingTransaction(null);
                        setFormData({
                            transactionType: 'expense',
                            category: 'Kira',
                            transactionDate: new Date().toISOString().split('T')[0],
                            amount: 0,
                            description: '',
                            paymentMethod: 'cash'
                        });
                        setDisplayAmount('');
                        setShowAddModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Yeni İşlem
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">Toplam Bakiye</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {formatCurrency(summary.totalBalance)}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Nakit Kasa</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        {formatCurrency(summary.cashBalance)}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Banka Hesapları</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                        {formatCurrency(summary.bankBalance)}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        Bu Ay Gelir
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(summary.periodIncome)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{summary.incomeCount} işlem</div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-600" />
                        Bu Ay Gider
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(summary.periodExpense)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{summary.expenseCount} işlem</div>
                </div>

                <div className={`border rounded-xl p-4 ${summary.periodNet >= 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Net Durum</div>
                    <div className={`text-2xl font-bold ${summary.periodNet >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                        {formatCurrency(Math.abs(summary.periodNet))}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {summary.periodNet >= 0 ? 'Kâr' : 'Zarar'}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-red-600" />
                        Gider Dağılımı
                    </h4>
                    {expenseStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={expenseStats}
                                    dataKey="amount"
                                    nameKey="categoryName"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={(entry) => `${entry.categoryName}: ${entry.percentage.toFixed(0)}%`}
                                >
                                    {expenseStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS.chart[index % COLORS.chart.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-slate-500 py-8">Henüz gider kaydı yok</div>
                    )}
                </div>

                {/* Income Breakdown */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Gelir Analizi
                    </h4>
                    {incomeStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={incomeStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="categoryName" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="amount" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-slate-500 py-8">Henüz gelir kaydı yok</div>
                    )}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-md font-semibold text-slate-800 dark:text-white">Son İşlemler</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/30">
                            <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <th className="px-6 py-3">Tarih</th>
                                <th className="px-6 py-3">Kategori</th>
                                <th className="px-6 py-3">Açıklama</th>
                                <th className="px-6 py-3">Ödeme</th>
                                <th className="px-6 py-3 text-right">Tutar</th>
                                <th className="px-6 py-3 text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Yükleniyor...
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Henüz işlem kaydı yok
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                        <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {formatDate(t.transactionDate)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${t.transactionType === 'income'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {t.description || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">
                                            {t.paymentMethod === 'cash' ? '💵 Nakit' : '🏦 Banka'}
                                            {t.bankAccount && (
                                                <div className="text-[10px] text-slate-400">
                                                    {t.bankAccount.branchName}
                                                </div>
                                            )}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-bold ${t.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {t.transactionType === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {!t.relatedCommissionDistributionId && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(t)}
                                                            className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                            title="Düzenle"
                                                        >
                                                            <Edit2 className="w-4 h-4 text-blue-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(t.id)}
                                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </>
                                                )}
                                                {t.relatedCommissionDistributionId && (
                                                    <span className="text-xs text-slate-400">Otomatik</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingTransaction ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Transaction Type */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">İşlem Türü</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transactionType: 'income', category: 'Komisyon Geliri' })}
                                        className={`py-2 rounded-lg font-medium border ${formData.transactionType === 'income'
                                            ? 'bg-green-50 border-green-200 text-green-700'
                                            : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        Gelir
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transactionType: 'expense', category: 'Kira' })}
                                        className={`py-2 rounded-lg font-medium border ${formData.transactionType === 'expense'
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        Gider
                                    </button>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kategori</label>
                                <select
                                    className="input-std"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    {activeCategories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tarih</label>
                                <input
                                    type="date"
                                    className="input-std"
                                    value={formData.transactionDate}
                                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tutar (₺)</label>
                                <input
                                    type="text"
                                    className="input-std"
                                    placeholder="0,00"
                                    value={displayAmount}
                                    onChange={handleAmountChange}
                                    required
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ödeme Yöntemi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: 'cash', bankAccountId: undefined })}
                                        className={`py-2 rounded-lg font-medium border flex items-center justify-center gap-2 ${formData.paymentMethod === 'cash'
                                            ? 'bg-slate-100 border-slate-300 text-slate-800'
                                            : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        Nakit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, paymentMethod: 'bank' })}
                                        className={`py-2 rounded-lg font-medium border flex items-center justify-center gap-2 ${formData.paymentMethod === 'bank'
                                            ? 'bg-slate-100 border-slate-300 text-slate-800'
                                            : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Banka
                                    </button>
                                </div>
                            </div>

                            {/* Bank Account */}
                            {formData.paymentMethod === 'bank' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Banka Hesabı</label>
                                    {activeBanks.length > 0 ? (
                                        <select
                                            className="input-std"
                                            value={formData.bankAccountId || ''}
                                            onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                                            required={formData.paymentMethod === 'bank'}
                                        >
                                            <option value="">Seçiniz...</option>
                                            {activeBanks.flatMap(bank =>
                                                bank.accounts.map((acc: any) => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {bank.name} - {acc.branchName} ({acc.currency})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-red-500 p-2 bg-red-50 rounded">
                                            Aktif banka hesabı yok
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Açıklama</label>
                                <textarea
                                    rows={3}
                                    className="input-std"
                                    placeholder="Detay giriniz..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 btn-primary"
                                >
                                    {creating ? 'Kaydediliyor...' : editingTransaction ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
