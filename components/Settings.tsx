import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import {
   Upload, Save, CheckCircle, Image as ImageIcon,
   Trash2, Building2, Users, Palette, Moon, Sun, Search, Edit2, Shield, Plus, X, Percent,
   Landmark, AlertCircle, Monitor, Globe, Mail, Phone, MapPin, CreditCard, AlertTriangle, Loader2, Database, Handshake
} from 'lucide-react';
import { CompanySettings, UserProfile, UserRole, BankSettings, BankAccount, BrandSettings, CompanyCollateral, InsuranceType, Partner, PartnerShare, CommissionSettings } from '../types';
import { supabase } from '../lib/supabase';
import { PartnershipSettings } from './PartnershipSettings';
import { ProductManagement } from './ProductManagement';

// Helper for TR IBAN Validation
const isValidIBAN = (iban: string) => {
   const trIbanRegex = /^TR\d{24}$/;
   return trIbanRegex.test(iban);
};

interface SettingsProps {
   onNavigate?: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
   const [activeTab, setActiveTab] = useState<'companies' | 'banks' | 'users' | 'brand' | 'partners' | 'products'>('companies');
   const [loading, setLoading] = useState(false);
   const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

   // Data State
   const [companies, setCompanies] = useState<CompanySettings[]>([]);
   const [banks, setBanks] = useState<BankSettings[]>([]);
   const [users, setUsers] = useState<UserProfile[]>([]);

   const [companyModalTab, setCompanyModalTab] = useState<'general' | 'collaterals' | 'commissions'>('general');
   const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
   const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
   const [companyForm, setCompanyForm] = useState<Partial<CompanySettings>>({
      name: '', domain: '', logo: '', agencyNo: '', isActive: true, commissions: {}, collaterals: []
   });
   const [newCollateral, setNewCollateral] = useState<Partial<CompanyCollateral>>({
      type: 'Teminat Mektubu', amount: 0, currency: 'TL'
   });

   // 2. Bank Modal
   const [isBankModalOpen, setIsBankModalOpen] = useState(false);
   const [editingBankId, setEditingBankId] = useState<string | null>(null);
   const [bankForm, setBankForm] = useState<Partial<BankSettings>>({
      name: '', domain: '', isActive: true
   });

   // 3. Account Modal
   const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
   const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
   const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
   const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({
      accountName: '', branchName: '', iban: 'TR', currency: 'TL', balance: 0, accountType: 'Vadesiz Mevduat'
   });
   const [ibanError, setIbanError] = useState<string | null>(null);

   // 4. User Modal
   const [isUserModalOpen, setIsUserModalOpen] = useState(false);
   const [editingUserId, setEditingUserId] = useState<string | null>(null);
   const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
   const [userForm, setUserForm] = useState<{
      fullName: string;
      email: string;
      phone: string;
      roles: UserRole[];
      isActive: boolean;
   }>({
      fullName: '', email: '', phone: '', roles: [], isActive: true
   });

   const [brand, setBrand] = useState<BrandSettings>({
      companyName: 'Global Hedef Sigorta',
      themePreference: 'light'
   });

   // Partners State
   const [partners, setPartners] = useState<Partner[]>([]);
   const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
   const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
   const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({
      name: '', tcVkn: '', email: '', phone: '', isActive: true
   });
   const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
      salespersonPercentage: 30,
      partnersPercentage: 30,
      companyPercentage: 40
   });

   // General State
   const [searchTerm, setSearchTerm] = useState('');
   const { showSuccess, showError } = useToast();

   // Product Management State
   const [categories, setCategories] = useState<any[]>([]);
   const [products, setProducts] = useState<any[]>([]);
   const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
   const [isProductModalOpen, setIsProductModalOpen] = useState(false);
   const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
   const [editingProductId, setEditingProductId] = useState<string | null>(null);
   const [categoryForm, setCategoryForm] = useState({ code: '', name_tr: '', description: '', is_active: true, display_order: 1 });
   const [productForm, setProductForm] = useState({ category_id: '', code: '', name_tr: '', aliases: '', is_active: true, display_order: 1 });


   // --- FETCH DATA ---
   const fetchData = async () => {
      setLoading(true);
      try {
         // 1. Companies
         const { data: companiesData } = await supabase
            .from('settings_companies')
            .select('*, collaterals:company_collaterals(*)')
            .order('name');

         const mappedCompanies: CompanySettings[] = (companiesData || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            domain: c.domain,
            logo: c.domain ? `https://logo.clearbit.com/${c.domain}` : c.logo,
            isActive: c.is_active,
            agencyNo: c.agency_no,
            commissions: c.commissions || {},
            collaterals: (c.collaterals || []).map((col: any) => ({
               id: col.id, companyId: col.company_id, type: col.type, amount: col.amount, currency: col.currency
            }))
         }));
         setCompanies(mappedCompanies);

         // 2. Banks
         const { data: banksData } = await supabase.from('settings_banks').select(`*, accounts:settings_bank_accounts(*)`).order('name');
         const mappedBanks: BankSettings[] = (banksData || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            domain: b.domain,
            logo: b.domain ? `https://logo.clearbit.com/${b.domain}` : b.logo,
            isActive: b.is_active,
            accounts: (b.accounts || []).map((a: any) => ({
               id: a.id,
               accountName: a.account_name || 'İsimsiz Hesap',
               branchName: a.branch_name,
               accountNo: a.account_no,
               iban: a.iban,
               currency: a.currency,
               balance: a.balance || 0,
               accountType: a.account_type || 'Vadesiz Mevduat'
            }))
         }));
         setBanks(mappedBanks);

         // 3. Users
         const { data: userData } = await supabase.from('settings_users').select('*').order('full_name');
         setUsers((userData || []).map((u: any) => ({
            id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, roles: u.roles || (u.role ? [u.role] : []), isActive: u.is_active, lastLogin: u.last_login || '-'
         })));

         // 4. Brand
         const { data: brandData } = await supabase.from('settings_brand').select('*').single();
         if (brandData) {
            setBrand({
               id: brandData.id,
               companyName: brandData.company_name || 'Global Hedef Sigorta',
               logoUrl: brandData.logo_url,
               address: brandData.address,
               taxNo: brandData.tax_no,
               phone: brandData.phone,
               website: brandData.website,
               themePreference: brandData.theme_preference || 'light',
               commissionSettings: brandData.commission_settings || {
                  salespersonPercentage: 30,
                  partnersPercentage: 30,
                  companyPercentage: 40
               }
            });
            // Apply theme immediately
            if (brandData.theme_preference === 'dark') {
               document.documentElement.classList.add('dark');
            } else {
               document.documentElement.classList.remove('dark');
            }
            // Load commission settings
            if (brandData.commission_settings) {
               setCommissionSettings(brandData.commission_settings);
            }
         }

         // 5. Partners
         const { data: partnersData } = await supabase
            .from('partners')
            .select(`
               *,
               current_share:partner_shares(*)
            `)
            .order('name');

         const mappedPartners: Partner[] = (partnersData || []).map((p: any) => {
            // Get the active share (where effective_until is null)
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

      } catch (error) {
         console.error("Error fetching settings:", error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   // --- HANDLERS ---

   const handleSaveBrand = async () => {
      try {
         const { error } = await supabase.from('settings_brand').upsert({
            // We use a singleton approach, but if ID exists use it
            ...(brand.id ? { id: brand.id } : {}),
            company_name: brand.companyName,
            logo_url: brand.logoUrl,
            address: brand.address,
            tax_no: brand.taxNo,
            phone: brand.phone,
            website: brand.website,
            theme_preference: brand.themePreference
         });

         if (error) throw error;

         // Apply Theme
         if (brand.themePreference === 'dark') {
            document.documentElement.classList.add('dark');
         } else {
            document.documentElement.classList.remove('dark');
         }

         setStatus('saved');
         setTimeout(() => setStatus('idle'), 3000);
         fetchData();
      } catch (error) {
         console.error(error);
         alert('Marka ayarları kaydedilemedi.');
      }
   };

   const toggleTheme = (theme: 'light' | 'dark') => {
      setBrand(prev => ({ ...prev, themePreference: theme }));
   };

   // --- COMPANY HANDLERS ---
   const handleSaveCompany = async () => {
      if (!companyForm.name) return alert("Şirket adı zorunludur.");
      const companyId = editingCompanyId || companyForm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      try {
         const { error } = await supabase.from('settings_companies').upsert({
            id: companyId,
            name: companyForm.name,
            domain: companyForm.domain,
            logo: companyForm.domain ? `https://logo.clearbit.com/${companyForm.domain}` : companyForm.logo,
            agency_no: companyForm.agencyNo,
            commissions: companyForm.commissions,
            is_active: companyForm.isActive
         });
         if (error) throw error;
         await fetchData();
         setIsCompanyModalOpen(false);
      } catch (error) { console.error(error); alert('Hata oluştu.'); }
   };

   const handleDeleteCompany = async (id: string) => {
      if (!window.confirm("Bu şirketi silmek istediğinize emin misiniz?")) return;
      try {
         const { error } = await supabase.from('settings_companies').delete().eq('id', id);
         if (error) throw error;
         setCompanies(prev => prev.filter(c => c.id !== id));
         setIsCompanyModalOpen(false);
      } catch (error) { alert('Silme işlemi başarısız.'); }
   };

   const handleAddCollateral = async () => {
      if (!editingCompanyId) return;
      try {
         const { error } = await supabase.from('company_collaterals').insert({
            company_id: editingCompanyId,
            type: newCollateral.type,
            amount: newCollateral.amount,
            currency: newCollateral.currency
         });
         if (error) throw error;
         // Refresh specific company collaterals logic could be here, but simpler to just re-fetch or optimistically update
         // For now, re-fetch for safety
         fetchData();
         setNewCollateral({ type: 'Teminat Mektubu', amount: 0, currency: 'TL' });
      } catch (error) { alert('Teminat eklenemedi.'); }
   };

   const handleDeleteCollateral = async (id: string) => {
      try {
         const { error } = await supabase.from('company_collaterals').delete().eq('id', id);
         if (error) throw error;
         const updatedCollaterals = (companyForm.collaterals || []).filter(c => c.id !== id);
         setCompanyForm(prev => ({ ...prev, collaterals: updatedCollaterals }));
         // Optimistically update main list
         setCompanies(prev => prev.map(c => c.id === editingCompanyId ? { ...c, collaterals: updatedCollaterals } : c));
      } catch (error) { alert('Silinemedi.'); }
   };

   // --- BANK HANDLERS ---
   const handleSaveBank = async () => {
      if (!bankForm.name) return alert("Banka adı zorunludur.");
      const bankId = editingBankId || bankForm.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const logoUrl = bankForm.domain ? `https://logo.clearbit.com/${bankForm.domain}` : bankForm.logo;
      try {
         const { error } = await supabase.from('settings_banks').upsert({
            id: bankId,
            name: bankForm.name,
            domain: bankForm.domain,
            logo: logoUrl,
            is_active: bankForm.isActive
         });
         if (error) throw error;
         await fetchData();
         setIsBankModalOpen(false);
      } catch (error) { console.error(error); alert('Banka kaydedilemedi.'); }
   };

   const handleDeleteBank = async (id: string) => {
      if (!window.confirm("Bu bankayı ve tüm hesaplarını silmek istediğinize emin misiniz?")) return;
      try {
         const { error } = await supabase.from('settings_banks').delete().eq('id', id);
         if (error) throw error;
         setBanks(prev => prev.filter(b => b.id !== id));
      } catch (error) { alert('Silme işlemi başarısız.'); }
   };

   const handleSaveAccount = async () => {
      if (!selectedBankId) return;
      if (!isValidIBAN(accountForm.iban || '')) {
         setIbanError("Geçersiz IBAN. TR ile başlayan 26 haneli IBAN giriniz.");
         return;
      }

      const accountData = {
         bank_id: selectedBankId,
         account_name: accountForm.accountName,
         branch_name: accountForm.branchName,
         account_no: accountForm.accountNo,
         iban: accountForm.iban,
         currency: accountForm.currency,
         balance: accountForm.balance,
         account_type: accountForm.accountType
      };

      try {
         if (editingAccountId) {
            const { error } = await supabase.from('settings_bank_accounts').update(accountData).eq('id', editingAccountId);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('settings_bank_accounts').insert([accountData]);
            if (error) throw error;
         }
         await fetchData();
         setIsAccountModalOpen(false);
         setEditingAccountId(null);
      } catch (error) { console.error(error); alert('Hesap kaydedilemedi.'); }
   };

   const handleDeleteAccount = async (accountId: string) => {
      if (!window.confirm("Hesabı silmek istediğinize emin misiniz?")) return;
      try {
         const { error } = await supabase.from('settings_bank_accounts').delete().eq('id', accountId);
         if (error) throw error;
         await fetchData();
      } catch (error) { alert('Hesap silinemedi.'); }
   };

   // --- USER HANDLERS ---
   const handleSaveUser = async () => {
      if (!userForm.fullName || !userForm.email) {
         showError("Hata", "Ad Soyad ve E-posta zorunludur.");
         return;
      }

      // Ensure roles array is not empty
      if (!userForm.roles || userForm.roles.length === 0) {
         showError("Hata", "En az bir rol seçmelisiniz.");
         return;
      }

      const userData = {
         full_name: userForm.fullName,
         email: userForm.email,
         phone: userForm.phone,
         roles: userForm.roles,
         is_active: userForm.isActive
      };

      try {
         if (editingUserId) {
            try {
               const { error } = await supabase.from('settings_users').update(userData).eq('id', editingUserId);
               if (error) throw error;
               showSuccess("Başarılı", "Kullanıcı güncellendi.");
            } catch (err: any) {
               // Fallback: If 'roles' column missing, try legacy 'role'
               if (err?.message?.includes('column') || err?.message?.includes('roles')) {
                  const legacyData = {
                     full_name: userForm.fullName,
                     email: userForm.email,
                     phone: userForm.phone,
                     role: userForm.roles?.[0] || 'Operasyon',
                     is_active: userForm.isActive
                  };
                  const { error: legacyError } = await supabase.from('settings_users').update(legacyData).eq('id', editingUserId);
                  if (legacyError) throw legacyError;
                  showSuccess("Başarılı", "Kullanıcı güncellendi (Eski Şema).");
               } else { throw err; }
            }
         } else {
            try {
               const { error } = await supabase.from('settings_users').insert([userData]);
               if (error) throw error;
               showSuccess("Başarılı", "Kullanıcı eklendi.");
            } catch (err: any) {
               if (err?.message?.includes('column') || err?.message?.includes('roles')) {
                  const legacyData = {
                     full_name: userForm.fullName,
                     email: userForm.email,
                     phone: userForm.phone,
                     role: userForm.roles?.[0] || 'Operasyon',
                     is_active: userForm.isActive
                  };
                  const { error: legacyError } = await supabase.from('settings_users').insert([legacyData]);
                  if (legacyError) throw legacyError;
                  showSuccess("Başarılı", "Kullanıcı eklendi (Eski Şema).");
               } else { throw err; }
            }
         }
         await fetchData();
         setIsUserModalOpen(false);
      } catch (error: any) {
         console.error(error);
         showError('Kayıt Hatası', error.message || 'Kullanıcı kaydedilemedi.');
      }

   };

   const initiateDeleteUser = (id: string) => {
      setDeleteConfirmId(id);
   };

   const confirmDeleteUser = async () => {
      if (!deleteConfirmId) return;
      try {
         const { error } = await supabase.from('settings_users').delete().eq('id', deleteConfirmId);
         if (error) throw error;
         setUsers(prev => prev.filter(u => u.id !== deleteConfirmId));
         setDeleteConfirmId(null);
         setIsUserModalOpen(false); // Close edit modal if open
      } catch (error) {
         console.error(error);
         alert('Silme işlemi başarısız.');
      }
   };

   const openAddAccountModal = (bankId: string) => {
      setSelectedBankId(bankId);
      setEditingAccountId(null);
      setAccountForm({ accountName: '', branchName: '', iban: 'TR', currency: 'TL', balance: 0, accountType: 'Vadesiz Mevduat' });
      setIbanError(null);
      setIsAccountModalOpen(true);
   };

   const calculateBankTotal = (accounts: BankAccount[]) => {
      const totals: Record<string, number> = {};
      accounts.forEach(acc => {
         totals[acc.currency] = (totals[acc.currency] || 0) + (acc.balance || 0);
      });
      return totals;
   };

   // DEBUG LOG
   console.log('Settings Component Rendering', { status, loading, activeTab });

   const currentCompanies = (companies || []).filter(c => c?.name?.toLowerCase()?.includes((searchTerm || '').toLowerCase()));
   const currentBanks = (banks || []).filter(b => b?.name?.toLowerCase()?.includes((searchTerm || '').toLowerCase()));

   console.log('Settings: Calculated lists', { companiesCount: companies?.length, banksCount: banks?.length });


   return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
         {/* Title Section */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Sistem Ayarları</h2>
               <p className="text-slate-500 dark:text-slate-400">Platform genelindeki tüm yapılandırmaları buradan yönetebilirsiniz.</p>
            </div>
            {onNavigate && (
               <button
                  onClick={() => onNavigate('anatomy')}
                  className="mt-4 md:mt-0 btn-ghost btn-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
               >
                  <Database className="w-4 h-4 mr-2" />
                  Sistem Anatomisi
               </button>
            )}
         </div>

         {status === 'saved' && <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center shadow-sm animate-in slide-in-from-top-2"><CheckCircle className="w-5 h-5 mr-2" /> Değişiklikler başarıyla kaydedildi.</div>}

         {/* Navigation Tabs */}
         <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex overflow-x-auto gap-2">
            {[
               { id: 'companies', label: 'Sigorta Şirketleri', icon: Building2 },
               { id: 'products', label: 'Ürün Yönetimi', icon: Database },
               { id: 'banks', label: 'Banka Hesapları', icon: Landmark },
               { id: 'users', label: 'Ekip & Yetkiler', icon: Users },
               { id: 'partners', label: 'Ortaklık Yapısı', icon: Handshake },
               { id: 'brand', label: 'Yönetim & Marka', icon: Palette },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'btn-primary shadow-md' : 'btn-ghost'}`}
               >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
               </button>
            ))}
         </div>

         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[500px]">

            {/* --- TAB: COMPANIES --- */}
            {activeTab === 'companies' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center gap-4">
                     <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="Şirket ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-std pl-9" />
                     </div>
                     <button onClick={() => {
                        setEditingCompanyId(null);
                        setCompanyForm({ name: '', domain: '', agencyNo: '', isActive: true, commissions: {}, collaterals: [] });
                        setCompanyModalTab('general');
                        setIsCompanyModalOpen(true);
                     }} className="btn-primary btn-sm shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Şirket Ekle
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {currentCompanies.map((company) => (
                        <div key={company.id} className={`group relative border rounded-xl p-5 transition-all duration-300 hover:shadow-lg ${company.isActive ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-75'}`}>
                           <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 p-1.5 flex items-center justify-center shadow-sm">
                                    <img src={company.logo} alt={company.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${company.name}&background=f1f5f9&color=64748b` }} />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{company.name}</h4>
                                    <div className="flex items-center gap-1.5 mt-1">
                                       <span className={`w-2 h-2 rounded-full ${company.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                       <span className="text-xs text-slate-500">{company.isActive ? 'Aktif' : 'Pasif'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-700/50">
                                 <span className="text-slate-500">Acente No</span>
                                 <span className="font-mono text-slate-700 dark:text-slate-300">{company.agencyNo || '-'}</span>
                              </div>
                              <div className="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-700/50">
                                 <span className="text-slate-500">Teminatlar</span>
                                 <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {company.collaterals.reduce((sum, c) => sum + (c.currency === 'TL' ? c.amount : 0), 0).toLocaleString()} ₺
                                    {company.collaterals.some(c => c.currency !== 'TL') && '+ Döviz'}
                                 </span>
                              </div>
                           </div>

                           <button
                              onClick={() => { setEditingCompanyId(company.id); setCompanyForm({ ...company }); setCompanyModalTab('general'); setIsCompanyModalOpen(true); }}
                              className="w-full mt-2 btn-outline btn-sm"
                           >
                              <Edit2 className="w-3 h-3 mr-2" /> Yönet
                           </button>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* --- TAB: BANKS --- */}
            {activeTab === 'banks' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center gap-4">
                     <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="Banka ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-std pl-9" />
                     </div>
                     <button onClick={() => { setEditingBankId(null); setBankForm({ name: '', domain: '', isActive: true }); setIsBankModalOpen(true); }} className="btn-primary btn-sm shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Banka Ekle
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {currentBanks.map((bank) => {
                        const totals = calculateBankTotal(bank.accounts);
                        return (
                           <div key={bank.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                              <div className="p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/20 border-b border-slate-100 dark:border-slate-700">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                                       <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${bank.name}&background=f1f5f9&color=64748b` }} />
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-slate-800 dark:text-white">{bank.name}</h4>
                                       <span className="text-[10px] text-slate-500 uppercase tracking-wider">{bank.accounts.length} HESAP</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingBankId(bank.id); setBankForm({ ...bank }); setIsBankModalOpen(true); }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteBank(bank.id)} className="btn-icon hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>

                              <div className="p-4 space-y-4">
                                 <div className="flex flex-wrap gap-2">
                                    {Object.entries(totals).map(([curr, val]) => (
                                       <span key={curr} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50">
                                          {val.toLocaleString()} {curr}
                                       </span>
                                    ))}
                                    {Object.keys(totals).length === 0 && <span className="text-xs text-slate-400 italic">Bakiye bulunmuyor</span>}
                                 </div>

                                 <div className="space-y-2">
                                    {bank.accounts.map(acc => (
                                       <div key={acc.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg group/acc hover:border-brand-primary/30 transition-colors">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-600">
                                                <CreditCard className="w-4 h-4" />
                                             </div>
                                             <div>
                                                <div className="font-medium text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                                   {acc.accountName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-wide">{acc.iban}</div>
                                             </div>
                                          </div>
                                          <div className="text-right">
                                             <div className="font-bold text-sm text-slate-800 dark:text-white">{acc.balance?.toLocaleString()} {acc.currency}</div>
                                             <div className="flex justify-end gap-2 opacity-0 group-hover/acc:opacity-100 transition-opacity">
                                                <button onClick={() => { setSelectedBankId(bank.id); setEditingAccountId(acc.id); setAccountForm(acc); setIsAccountModalOpen(true); }} className="text-brand-primary text-[10px] hover:underline font-medium">DÜZENLE</button>
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>

                                 <button onClick={() => openAddAccountModal(bank.id)} className="w-full mt-4 btn-ghost border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-500 hover:border-brand-primary hover:text-brand-primary">
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Hesap Ekle
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* --- TAB: USERS (Admin Table) --- */}
            {activeTab === 'users' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ekip & Yetkiler</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Takım üyelerini ve sistem erişim yetkilerini yönetin.</p>
                     </div>
                     <button onClick={() => {
                        setEditingUserId(null);
                        setUserForm({ fullName: '', email: '', phone: '', roles: [], isActive: true });
                        setIsUserModalOpen(true);
                     }} className="btn-primary btn-sm shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Yeni Kullanıcı
                     </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                           <tr>
                              <th className="px-6 py-4">Kullanıcı</th>
                              <th className="px-6 py-4">Rol</th>
                              <th className="px-6 py-4">İletişim</th>
                              <th className="px-6 py-4">Son Giriş</th>
                              <th className="px-6 py-4">Durum</th>
                              <th className="px-6 py-4 text-right">İşlem</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                           {users.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm border border-brand-primary/20">
                                          {u.fullName.charAt(0)}
                                       </div>
                                       <div>
                                          <div className="font-medium text-slate-800 dark:text-white">{u.fullName}</div>
                                          <div className="text-xs text-slate-500 font-mono">ID: {u.id.substring(0, 8)}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                       {u.roles && u.roles.length > 0 ? (
                                          u.roles.map(r => (
                                             <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border
                                                ${r === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                                                   r === 'Satışçı' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                                                      r === 'Acente Yetkilisi' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' :
                                                         r === 'Operasyon' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                {r}
                                             </span>
                                          ))
                                       ) : (
                                          <span className="text-xs text-slate-400 italic">Yetki Yok</span>
                                       )}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex flex-col gap-1">
                                       <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {u.email}</span>
                                       <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {u.phone || '-'}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-sm text-slate-500">
                                    {u.lastLogin}
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                       <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                       <span className="text-sm text-slate-600 dark:text-slate-300">{u.isActive ? 'Aktif' : 'Pasif'}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-1">
                                       <button onClick={() => {
                                          setEditingUserId(u.id);
                                          // Explicitly map properties to match userForm state structure
                                          // handling potential camelCase vs snake_case mismatches from DB/Type definitions
                                          setUserForm({
                                             fullName: u.fullName || (u as any).full_name || '',
                                             email: u.email || '',
                                             phone: u.phone || '',
                                             roles: u.roles || [],
                                             isActive: u.isActive
                                          });
                                          setIsUserModalOpen(true);
                                       }} className="btn-icon">
                                          <Edit2 className="w-4 h-4" />
                                       </button>
                                       {/* Delete button removed from here, moved to modal */}
                                    </div>
                                 </td>
                              </tr>
                           ))}
                           {users.length === 0 && (
                              <tr>
                                 <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    Kullanıcı bulunamadı.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {/* --- TAB: PARTNERS (Ortaklık Yapısı) --- */}
            {activeTab === 'partners' && (
               <PartnershipSettings
                  partners={partners}
                  commissionSettings={commissionSettings}
                  onDataChange={fetchData}
               />
            )}

            {/* --- TAB: PRODUCTS --- */}
            {activeTab === 'products' && <ProductManagement />}

            {/* --- TAB: BRAND & MANAGEMENT --- */}
            {activeTab === 'brand' && (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                           <Building2 className="w-5 h-5 text-brand-primary" /> Firma Bilgileri
                        </h3>
                        <div className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Firma Ünvanı</label>
                                 <input type="text" className="input-std" value={brand.companyName} onChange={e => setBrand({ ...brand, companyName: e.target.value })} />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vergi No / Dairesi</label>
                                 <input type="text" className="input-std" value={brand.taxNo || ''} onChange={e => setBrand({ ...brand, taxNo: e.target.value })} placeholder="1234567890" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                 <input type="text" className="input-std" value={brand.phone || ''} onChange={e => setBrand({ ...brand, phone: e.target.value })} placeholder="0212..." />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Web Sitesi</label>
                                 <input type="text" className="input-std" value={brand.website || ''} onChange={e => setBrand({ ...brand, website: e.target.value })} placeholder="www.example.com" />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adres</label>
                                 <textarea className="input-std h-20 resize-none py-2" value={brand.address || ''} onChange={e => setBrand({ ...brand, address: e.target.value })} placeholder="Açık adres..." />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
                                 <div className="flex gap-2">
                                    <input type="text" className="input-std flex-1" value={brand.logoUrl || ''} onChange={e => setBrand({ ...brand, logoUrl: e.target.value })} placeholder="https://..." />
                                    {brand.logoUrl && <img src={brand.logoUrl} alt="Preview" className="w-10 h-10 object-contain border rounded bg-white p-1" />}
                                 </div>
                              </div>
                           </div>
                           <button onClick={handleSaveBrand} className="btn-primary w-full md:w-auto px-6 py-2.5 flex items-center justify-center shadow-lg shadow-brand-primary/20">
                              <Save className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                           <Monitor className="w-5 h-5 text-brand-secondary" /> Uygulama Görünümü
                        </h3>
                        <div className="space-y-4">
                           <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => toggleTheme('light')}>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <Sun className="w-5 h-5" />
                                 </div>
                                 <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Aydınlık Mod</div>
                              </div>
                              {brand.themePreference === 'light' && <CheckCircle className="w-5 h-5 text-green-500" />}
                           </div>
                           <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => toggleTheme('dark')}>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <Moon className="w-5 h-5" />
                                 </div>
                                 <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Karanlık Mod</div>
                              </div>
                              {brand.themePreference === 'dark' && <CheckCircle className="w-5 h-5 text-green-500" />}
                           </div>
                        </div>
                     </div>

                     <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
                        <h4 className="font-bold text-brand-primary dark:text-blue-400 mb-2">Marka Yönetimi Hakkında</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                           Burada yaptığınız değişiklikler (Logo, Firma İsmi, Tema) tüm sistem genelinde anlık olarak güncellenir. Fatura başlıkları ve müşteri bildirimlerinde bu bilgiler kullanılır.
                        </p>
                     </div>
                  </div>
               </div>
            )}

         </div>

         {/* --- MODALS --- */}

         {/* COMPANY MODAL */}
         {isCompanyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="bg-brand-primary/10 p-2 rounded-lg text-brand-primary">
                           {editingCompanyId ? <Edit2 className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        {editingCompanyId ? 'Şirket Bilgilerini Düzenle' : 'Yeni Sigorta Şirketi Ekle'}
                     </h3>
                     <button onClick={() => setIsCompanyModalOpen(false)} className="btn-icon">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="flex border-b border-slate-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 sticky top-0 z-10">
                     <button onClick={() => setCompanyModalTab('general')} className={`py-4 px-4 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${companyModalTab === 'general' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Building2 className="w-4 h-4" /> Genel Bilgiler
                     </button>
                     <button onClick={() => setCompanyModalTab('collaterals')} className={`py-4 px-4 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${companyModalTab === 'collaterals' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Shield className="w-4 h-4" /> Teminatlar
                     </button>
                     <button onClick={() => setCompanyModalTab('commissions')} className={`py-4 px-4 border-b-2 font-medium text-sm transition-all flex items-center gap-2 ${companyModalTab === 'commissions' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Percent className="w-4 h-4" /> Komisyonlar
                     </button>
                  </div>

                  <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                     {companyModalTab === 'general' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 max-w-2xl mx-auto">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="col-span-2">
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Şirket Adı</label>
                                 <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} autoFocus placeholder="Örn: Allianz Sigorta A.Ş." />
                                 </div>
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Domain</label>
                                 <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={companyForm.domain} onChange={e => setCompanyForm({ ...companyForm, domain: e.target.value })} placeholder="allianz.com.tr" />
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-1 ml-1">Logo otomatik çekilir.</p>
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Acente No</label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold">#</span>
                                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-mono" value={companyForm.agencyNo} onChange={e => setCompanyForm({ ...companyForm, agencyNo: e.target.value })} />
                                 </div>
                              </div>
                           </div>

                           <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                 <input type="checkbox" checked={companyForm.isActive} onChange={e => setCompanyForm({ ...companyForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                                 <div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif Şirket</span>
                                    <p className="text-xs text-slate-400">Pasif şirketler poliçe girişlerinde görünmez.</p>
                                 </div>
                              </label>
                           </div>

                           <div className="pt-4 flex gap-3">
                              <button onClick={handleSaveCompany} className="btn-primary flex-1 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center">
                                 <CheckCircle className="w-4 h-4 mr-2" /> Kaydet
                              </button>
                              {editingCompanyId && (
                                 <button onClick={() => handleDeleteCompany(editingCompanyId!)} className="btn-ghost text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-4">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              )}
                           </div>
                        </div>
                     )}

                     {companyModalTab === 'collaterals' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                           {/* Add Collateral Card */}
                           <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                 <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Yeni Teminat Ekle
                                 </h4>
                              </div>
                              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                 <div className="md:col-span-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Teminat Türü</label>
                                    <select className="select-std" value={newCollateral.type} onChange={e => setNewCollateral({ ...newCollateral, type: e.target.value as any })}>
                                       <option>Teminat Mektubu</option><option>Nakit Blokaj</option><option>DBS</option><option>Gayrimenkul İpoteği</option>
                                    </select>
                                 </div>
                                 <div className="md:col-span-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Tutar</label>
                                    <input type="number" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-brand-primary outline-none" value={newCollateral.amount} onChange={e => setNewCollateral({ ...newCollateral, amount: parseFloat(e.target.value) })} />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Döviz</label>
                                    <select className="select-std" value={newCollateral.currency} onChange={e => setNewCollateral({ ...newCollateral, currency: e.target.value as any })}>
                                       <option>TL</option><option>USD</option><option>EUR</option>
                                    </select>
                                 </div>
                                 <div className="md:col-span-2">
                                    <button onClick={handleAddCollateral} className="btn-primary w-full h-[40px] flex items-center justify-center">Ekle</button>
                                 </div>
                              </div>
                           </div>

                           {/* List */}
                           <div className="space-y-3">
                              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pl-1"><Shield className="w-4 h-4 text-brand-primary" /> Mevcut Teminatlar</h4>
                              {companyForm.collaterals && companyForm.collaterals.length > 0 ? (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {companyForm.collaterals.map((col, idx) => (
                                       <div key={idx} className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                                          <div className="flex items-center gap-3">
                                             <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400">
                                                <Shield className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-white">{col.type}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{col.amount.toLocaleString()} {col.currency}</p>
                                             </div>
                                          </div>
                                          <button onClick={() => handleDeleteCollateral(col.id)} className="btn-icon text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                                       </div>
                                    ))}
                                 </div>
                              ) : <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50">Bu şirkete ait teminat bulunmuyor.</div>}
                           </div>
                        </div>
                     )}

                     {companyModalTab === 'commissions' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 max-w-3xl mx-auto">
                           <div className="flex items-center gap-3 mb-4 p-4 bg-blue-50 text-blue-800 rounded-xl dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                              <AlertCircle className="w-5 h-5 flex-shrink-0" />
                              <span className="text-sm font-medium">Bu oranlar, poliçe girişi sırasında ilgili poliçe türü seçildiğinde komisyon tutarını otomatik hesaplamak için kullanılır.</span>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                              {Object.values(InsuranceType).map((type) => (
                                 <div key={type} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{type}</label>
                                    <div className="relative w-24">
                                       <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.5"
                                          className="w-full pl-3 pr-7 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-mono text-center"
                                          value={companyForm.commissions ? (companyForm.commissions[type] || 0) : 0}
                                          onChange={e => setCompanyForm({
                                             ...companyForm,
                                             commissions: { ...companyForm.commissions, [type]: parseFloat(e.target.value) }
                                          })}
                                       />
                                       <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                           <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                              <button onClick={handleSaveCompany} className="btn-primary w-full sm:w-auto ml-auto px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center">
                                 <CheckCircle className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* BANK MODAL */}
         {isBankModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
               <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="bg-brand-primary/10 p-2 rounded-lg text-brand-primary">
                           <Landmark className="w-5 h-5" />
                        </div>
                        {editingBankId ? 'Bankayı Düzenle' : 'Yeni Banka Ekle'}
                     </h3>
                     <button onClick={() => setIsBankModalOpen(false)} className="btn-icon"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-5">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Banka Adı</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} placeholder="Örn: Garanti BBVA" autoFocus />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Web Sitesi (Logo İçin)</label>
                        <div className="relative">
                           <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={bankForm.domain} onChange={e => setBankForm({ ...bankForm, domain: e.target.value })} placeholder="garantibbva.com.tr" />
                        </div>
                     </div>
                     <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                           <input type="checkbox" checked={bankForm.isActive} onChange={e => setBankForm({ ...bankForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                           <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif Banka</span>
                        </label>
                     </div>
                     <button onClick={handleSaveBank} className="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 mt-2 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" /> Kaydet
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ACCOUNT MODAL */}
         {isAccountModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
               <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="bg-brand-secondary/10 p-2 rounded-lg text-brand-secondary">
                           <CreditCard className="w-5 h-5" />
                        </div>
                        {editingAccountId ? 'Hesap Düzenle' : 'Yeni Hesap Ekle'}
                     </h3>
                     <button onClick={() => setIsAccountModalOpen(false)} className="btn-icon"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-5">
                     <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                           <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Hesap Adı</label>
                           <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={accountForm.accountName} onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })} placeholder="Ana Hesap" />
                        </div>
                        <div className="col-span-1">
                           <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Döviz</label>
                           <select className="select-std" value={accountForm.currency} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value as any })}>
                              <option>TL</option><option>USD</option><option>EUR</option>
                           </select>
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">IBAN</label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-[10px] font-bold">TR</span>
                           <input className={`input-std pl-9 font-mono uppercase ${ibanError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`} value={accountForm.iban} onChange={e => {
                              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              setAccountForm({ ...accountForm, iban: val });
                              if (val.length > 0 && !val.startsWith('TR')) setIbanError('TR ile başlamalı');
                              else setIbanError(null);
                           }} maxLength={26} placeholder="TR..." />
                        </div>
                        {ibanError && <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {ibanError}</p>}
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Şube Adı</label>
                           <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={accountForm.branchName} onChange={e => setAccountForm({ ...accountForm, branchName: e.target.value })} />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Hesap No</label>
                           <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={accountForm.accountNo} onChange={e => setAccountForm({ ...accountForm, accountNo: e.target.value })} />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Başlangıç Bakiyesi</label>
                        <input type="number" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-mono" value={accountForm.balance} onChange={e => setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) })} />
                     </div>
                     <div className="pt-2">
                        <button onClick={handleSaveAccount} className="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center">
                           <CheckCircle className="w-4 h-4 mr-2" /> Kaydet
                        </button>
                        {editingAccountId && (
                           <button onClick={() => handleDeleteAccount(editingAccountId!)} className="btn-ghost w-full mt-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex justify-center">
                              <Trash2 className="w-4 h-4 mr-2" /> Hesabı Sil
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* USER MODAL */}
         {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
               <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="bg-brand-secondary/10 p-2 rounded-lg text-brand-secondary">
                           <Users className="w-5 h-5" />
                        </div>
                        {editingUserId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
                     </h3>
                     <button onClick={() => setIsUserModalOpen(false)} className="btn-icon"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-5">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Ad Soyad</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="Ad Soyad" autoFocus />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">E-Posta Adresi</label>
                        <input type="email" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="ornek@globalhedef.com" />
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                           <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Telefon</label>
                           <input type="tel" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="05..." />
                        </div>
                        <div className="col-span-1">
                           <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Roller / Yetkiler</label>
                           <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                              {['Admin', 'Satışçı', 'Operasyon', 'Firma Ortağı'].map((roleOption) => (
                                 <label key={roleOption} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded transition-colors">
                                    <input
                                       type="checkbox"
                                       checked={userForm.roles?.includes(roleOption as UserRole)}
                                       onChange={(e) => {
                                          const checked = e.target.checked;
                                          setUserForm(prev => {
                                             const currentRoles = prev.roles || [];
                                             if (checked) return { ...prev, roles: [...currentRoles, roleOption as UserRole] };
                                             return { ...prev, roles: currentRoles.filter(r => r !== roleOption) };
                                          });
                                       }}
                                       className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{roleOption}</span>
                                 </label>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                           <input type="checkbox" checked={userForm.isActive} onChange={e => setUserForm({ ...userForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                           <div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif Kullanıcı</span>
                              <p className="text-xs text-slate-400">Pasif kullanıcılar sisteme giriş yapamaz.</p>
                           </div>
                        </label>
                     </div>

                     <div className="pt-2">
                        <button onClick={handleSaveUser} className="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center">
                           <CheckCircle className="w-4 h-4 mr-2" /> Kaydet
                        </button>
                        {editingUserId && (
                           <button onClick={() => initiateDeleteUser(editingUserId!)} className="btn-ghost w-full mt-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex justify-center">
                              <Trash2 className="w-4 h-4 mr-2" /> Kullanıcıyı Sil
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Delete Confirmation Overlay - Placed here to be inside the main div */}
         {deleteConfirmId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center space-y-4">
                     <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-2">
                        <AlertTriangle className="w-8 h-8" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Kullanıcıyı Sil?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                           Bu işlem geri alınamaz. Kullanıcı kalıcı olarak silinecektir.
                        </p>
                     </div>
                     <div className="flex gap-3 w-full pt-2">
                        <button
                           onClick={() => setDeleteConfirmId(null)}
                           className="flex-1 btn-ghost bg-slate-100 dark:bg-slate-800"
                        >
                           İptal
                        </button>
                        <button
                           onClick={confirmDeleteUser}
                           className="btn-danger flex-1 py-3 rounded-xl font-bold shadow-lg shadow-red-500/30"
                        >
                           Silmeyi Onayla
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};