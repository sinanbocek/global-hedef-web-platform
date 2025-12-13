
import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, FileText, Plus, Filter, Calendar, Trash2, Edit2, Save
} from 'lucide-react';
import { DatePicker } from './ui/DatePicker';
import { MOCK_POLICIES, MOCK_TRANSACTIONS, DEFAULT_PROFIT_DISTRIBUTION, MOCK_USERS } from '../constants';
import { FinancialTransaction, TransactionType, TransactionCategory, ProfitDistribution, CompanySettings, BankSettings, PaymentMethod } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

const COLORS = ['#003087', '#00C2FF', '#FF6B00', '#22c55e', '#ef4444'];

const CATEGORY_MAP: Record<string, string> = {
  Rent: 'Kira',
  Utilities: 'Fatura (Elektrik/Su)',
  Salary: 'Personel Maaş',
  Marketing: 'Reklam & Pazarlama',
  Commission: 'Komisyon Geliri',
  Other: 'Diğer'
};

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
};

const formatNumber = (num: number) => {
  return num.toLocaleString('tr-TR');
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR');
};

export const Analysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'transactions' | 'policies'>('financial');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(MOCK_TRANSACTIONS);
  const [profitDist, setProfitDist] = useState<ProfitDistribution>(DEFAULT_PROFIT_DISTRIBUTION);
  const [activeCompanies, setActiveCompanies] = useState<CompanySettings[]>([]);
  const [activeBanks, setActiveBanks] = useState<BankSettings[]>([]);

  // Current user for permissions (Assuming Admin for now based on context)
  const currentUser = MOCK_USERS.find(u => u.roles.includes('Admin'));
  const { showSuccess } = useToast();

  useEffect(() => {
    const savedProfit = localStorage.getItem('profit_distribution');
    if (savedProfit) {
      setProfitDist(JSON.parse(savedProfit));
    }

    const fetchSettings = async () => {
      // Fetch Active Companies
      const { data: companiesData } = await supabase.from('settings_companies').select('id, name, logo').eq('is_active', true).order('name');
      if (companiesData) {
        // Map to CompanySettings (partial)
        setActiveCompanies(companiesData.map((c: any) => ({
          id: c.id, name: c.name, logo: c.logo, isActive: true, agencyNo: '', commissions: {}, collaterals: []
        })));
      }

      // Fetch Active Banks with Accounts
      const { data: banksData } = await supabase.from('settings_banks').select('*, accounts:settings_bank_accounts(*)').eq('is_active', true);
      if (banksData) {
        setActiveBanks(banksData.map((b: any) => ({
          id: b.id, name: b.name, logo: b.logo, isActive: true,
          accounts: (b.accounts || []).map((a: any) => ({
            id: a.id, branchName: a.branch_name, accountNo: a.account_no, iban: a.iban, currency: a.currency
          }))
        })));
      }
    };

    fetchSettings();
  }, []);

  // Transaction Form State
  const [displayAmount, setDisplayAmount] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [newTransaction, setNewTransaction] = useState<Partial<FinancialTransaction>>({
    type: 'Expense',
    category: 'Rent',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    paymentMethod: 'Cash'
  });

  // Calculations
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Pie Chart Data based on Settings
  const distributionData = [
    { name: 'Acente Payı', value: netProfit * (profitDist.agentShare / 100) },
    { name: 'Kasa (Şirket)', value: netProfit * (profitDist.companyShare / 100) },
    { name: 'Ortak Payı', value: netProfit * (profitDist.partnerShare / 100) },
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric except comma
    let val = e.target.value.replace(/[^0-9,]/g, '');

    // Check if valid number format (allow only one comma)
    const parts = val.split(',');
    if (parts.length > 2) return;

    // Display Logic: Add dots for thousands to integer part
    let integerPart = parts[0].replace(/\./g, '');
    const decimalPart = parts[1];

    if (integerPart) {
      integerPart = parseInt(integerPart).toLocaleString('tr-TR');
    }

    const finalDisplay = decimalPart !== undefined ? `${integerPart},${decimalPart}` : integerPart;
    setDisplayAmount(finalDisplay);

    // Store Logic: Convert to standard float for storage (12.345,50 -> 12345.50)
    const rawVal = val.replace(/\./g, '').replace(',', '.');
    setNewTransaction({ ...newTransaction, amount: parseFloat(rawVal) || 0 });
  };

  const updateDisplayAmountFromValue = (val: number) => {
    const formatted = val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setDisplayAmount(formatted);
  };

  const handleEditTransaction = (t: FinancialTransaction) => {
    setEditingTransactionId(t.id);
    setNewTransaction({ ...t });
    updateDisplayAmountFromValue(t.amount);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTransaction.description?.trim()) {
      const confirm = window.confirm("Açıklama alanı boş bırakıldı. Devam etmek istiyor musunuz?");
      if (!confirm) return;
    }

    if (editingTransactionId) {
      // Update existing
      setTransactions(prev => prev.map(t =>
        t.id === editingTransactionId ? { ...t, ...newTransaction, amount: Number(newTransaction.amount) } as FinancialTransaction : t
      ));
      showSuccess('Başarılı', 'İşlem güncellendi.');
    } else {
      // Create new
      const t: FinancialTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: newTransaction.type as TransactionType,
        category: newTransaction.category as TransactionCategory,
        date: newTransaction.date!,
        amount: Number(newTransaction.amount),
        description: newTransaction.description || '',
        relatedCompanyId: newTransaction.relatedCompanyId,
        paymentMethod: newTransaction.paymentMethod as PaymentMethod,
        bankAccountId: newTransaction.bankAccountId
      };
      setTransactions([t, ...transactions]);
      showSuccess('Başarılı', 'İşlem başarıyla eklendi.');
    }

    // Reset Form
    setNewTransaction({
      type: 'Expense',
      category: 'Rent',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      relatedCompanyId: undefined,
      bankAccountId: undefined,
      paymentMethod: 'Cash'
    });
    setDisplayAmount('');
    setEditingTransactionId(null);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const findAccountName = (accId?: string) => {
    if (!accId) return '';
    for (const bank of activeBanks) {
      const account = bank.accounts.find(a => a.id === accId);
      if (account) return `${bank.name} - ${account.branchName} (${account.currency})`;
    }
    return 'Bilinmeyen Hesap';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-2">
        <button onClick={() => setActiveTab('financial')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'financial' ? 'btn-primary shadow-md' : 'btn-ghost text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Finansal Özet & Dağılım</button>
        <button onClick={() => setActiveTab('transactions')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'btn-primary shadow-md' : 'btn-ghost text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Gelir / Gider Girişi</button>
        <button onClick={() => setActiveTab('policies')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'policies' ? 'btn-primary shadow-md' : 'btn-ghost text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Poliçe Analizi</button>
      </div>

      {/* FINANCIAL SUMMARY TAB */}
      {activeTab === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Kar Dağılımı Analizi</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {distributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <ReTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-fit sticky top-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
              <span className="flex items-center">
                {editingTransactionId ? <Edit2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {editingTransactionId ? 'İşlemi Düzenle' : 'Yeni İşlem Girişi'}
              </span>
              {editingTransactionId && (
                <button onClick={() => { setEditingTransactionId(null); setNewTransaction({ type: 'Expense', category: 'Rent', date: new Date().toISOString().split('T')[0], amount: 0, description: '', paymentMethod: 'Cash' }); setDisplayAmount(''); }} className="text-xs text-red-500 underline">İptal</button>
              )}
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* ... (Previous Form Fields) ... */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">İşlem Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewTransaction({ ...newTransaction, type: 'Income', category: 'Commission' })} className={`py-2 rounded-lg text-sm font-medium border ${newTransaction.type === 'Income' ? 'bg-green-50 border-green-200 text-green-700' : 'border-slate-200 text-slate-500'}`}>Gelir</button>
                  <button type="button" onClick={() => setNewTransaction({ ...newTransaction, type: 'Expense', category: 'Rent' })} className={`py-2 rounded-lg text-sm font-medium border ${newTransaction.type === 'Expense' ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-500'}`}>Gider</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori</label>
                <select className="select-std" value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value as any })}>
                  {newTransaction.type === 'Income' ? (
                    <>
                      <option value="Commission">Sigorta Komisyonu</option>
                      <option value="Other">Diğer Gelir</option>
                    </>
                  ) : (
                    <>
                      <option value="Rent">Kira</option>
                      <option value="Utilities">Fatura (Elektrik/Su/İnternet)</option>
                      <option value="Salary">Personel Maaş</option>
                      <option value="Marketing">Reklam & Pazarlama</option>
                      <option value="Other">Diğer Gider</option>
                    </>
                  )}
                </select>
              </div>

              {newTransaction.category === 'Commission' && newTransaction.type === 'Income' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Şirket Seçimi (Aktif)</label>
                  <select className="select-std" onChange={(e) => setNewTransaction({ ...newTransaction, relatedCompanyId: e.target.value })} value={newTransaction.relatedCompanyId || ''}>
                    <option value="">Seçiniz...</option>
                    {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tarih</label>
                <div className="relative">
                  <DatePicker
                    value={newTransaction.date}
                    onChange={(date) => setNewTransaction({ ...newTransaction, date })}
                    placeholder="Tarih"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tutar (TL)</label>
                <input type="text" className="input-std" placeholder="0,00" value={displayAmount} onChange={handleAmountChange} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ödeme Yöntemi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewTransaction({ ...newTransaction, paymentMethod: 'Cash', bankAccountId: undefined })} className={`py-2 rounded-lg text-sm font-medium border flex items-center justify-center ${newTransaction.paymentMethod === 'Cash' ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white' : 'border-slate-200 text-slate-500'}`}><DollarSign className="w-4 h-4 mr-1" /> Nakit</button>
                  <button type="button" onClick={() => setNewTransaction({ ...newTransaction, paymentMethod: 'Bank' })} className={`py-2 rounded-lg text-sm font-medium border flex items-center justify-center ${newTransaction.paymentMethod === 'Bank' ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white' : 'border-slate-200 text-slate-500'}`}><Wallet className="w-4 h-4 mr-1" /> Banka</button>
                </div>
              </div>

              {newTransaction.paymentMethod === 'Bank' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banka Hesabı</label>
                  {activeBanks.length > 0 ? (
                    <select className="select-std" onChange={(e) => setNewTransaction({ ...newTransaction, bankAccountId: e.target.value })} value={newTransaction.bankAccountId || ''}>
                      <option value="">Hesap Seçiniz...</option>
                      {activeBanks.map(bank => (
                        bank.accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{bank.name} - {acc.branchName} ({acc.currency})</option>
                        ))
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-red-500 p-2 bg-red-50 rounded">Tanımlı aktif banka hesabı yok. Lütfen Ayarlar {'>'} Banka Hesapları bölümünden ekleyin.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Açıklama <span className="text-red-500">*</span></label>
                <textarea rows={2} className="input-std" placeholder="Detay giriniz..." value={newTransaction.description} onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} />
              </div>
              <button className="btn-primary w-full py-3 rounded-lg font-bold shadow-lg flex items-center justify-center">
                {editingTransactionId ? <Save className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {editingTransactionId ? 'Güncelle' : 'İşlemi Kaydet'}
              </button>
            </form>
          </div>
          {/* ... (Previous Table Code) ... */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Son İşlemler</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300">Tarih</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300">Kategori</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300">Ödeme</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300">Açıklama</th>
                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300 text-right">Tutar</th>
                    {currentUser?.roles.includes('Admin') && <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-300 text-center">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(t.date)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.category === 'Commission' && t.relatedCompanyId ? activeCompanies.find(c => c.id === t.relatedCompanyId)?.name + ' Komisyon' : CATEGORY_MAP[t.category] || t.category}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{t.paymentMethod === 'Cash' ? 'Nakit' : (<span>Banka <br /><span className="text-[10px] text-slate-400">{findAccountName(t.bankAccountId)}</span></span>)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.description}</td>
                      <td className={`px-4 py-3 text-right font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}</td>
                      {currentUser?.roles.includes('Admin') && (
                        <td className="px-4 py-3 text-center"><div className="flex items-center justify-center space-x-1"><button type="button" onClick={() => handleEditTransaction(t)} className="btn-icon" title="Düzenle"><Edit2 className="w-4 h-4" /></button><button type="button" onClick={() => handleDeleteTransaction(t.id)} className="btn-icon text-red-500 hover:bg-red-50" title="Sil"><Trash2 className="w-4 h-4" /></button></div></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
