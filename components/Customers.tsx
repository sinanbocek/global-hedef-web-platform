import React, { useState, useEffect } from 'react';
import {
  X, Edit, Edit2, Trash2, Calendar, FileText, CheckCircle, ExternalLink, AlertTriangle,
  Plus, Car, Home, Building2, Zap, MessageCircle, User, Tag, Users2,
  Search, Filter, ArrowUpAZ, ArrowDownZA, ArrowUpDown, ChevronLeft, ChevronRight,
  Phone, Mail, Loader2
} from 'lucide-react';
import { CustomerDrawer } from './customers/CustomerDrawer';
import { CustomerFormModal } from './customers/CustomerFormModal';
import { CustomerList } from './customers/CustomerList';
import { SearchableSelect } from './ui/SearchableSelect';
import { useToast } from '../context/ToastContext';
import { MOCK_POLICIES } from '../constants';
import { Customer, CustomerAsset, CustomerNote, InsuranceType, FamilyGroup, Policy } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatPhoneNumber, formatNumberInput, toTitleCase } from '../lib/utils';

interface CustomersProps {
  onNavigate?: (page: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({ onNavigate }) => {
  // --- DATABASE STATE ---
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Removed drawerPolicies state
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- PAGINATION & FILTER STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
  const fetchFamilies = async () => {
    try {
      const { data, error } = await supabase.from('family_groups').select('*').order('name');
      if (error) throw error;
      setFamilies(data || []);
    } catch (error) {
      console.error('Error fetching families:', error);
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch companies for lookup
      const { data: companiesData } = await supabase.from('settings_companies').select('id, name, logo');
      const companyMap = new Map((companiesData || []).map(c => [c.id, c]));

      const { data, error } = await supabase
        .from('customers')
        .select(`
  *,
  assets: customer_assets(*),
    notes: customer_notes(*),
      family_group: family_groups(*),
        policies: policies(*, insurance_products(name_tr))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: Customer[] = (data || []).map((c: any) => ({
        id: c.id,
        customerNo: c.customer_no,
        customerType: c.customer_type as 'BIREYSEL' | 'KURUMSAL',

        // TC/VKN Field Mapping
        tcNo: c.tc_no,
        vkn: c.vkn,

        // Contact person - REMOVED
        contactPersonId: undefined,
        contactPerson: undefined,

        fullName: c.full_name || '',
        email: c.email || '',
        phone: c.phone || '',
        riskScore: c.risk_score || 0,
        familyGroupId: c.family_group_id,
        familyGroup: c.family_group ? { id: c.family_group.id, name: c.family_group.name, description: c.family_group.description } : undefined,
        activePoliciesCount: c.policies ? c.policies.filter((p: any) => {
          // Check both status and date to match Policies page logic
          if (p.status !== 'Active') return false;
          // Check if expired
          const end = new Date(p.end_date);
          const now = new Date();
          const diffTime = end.getTime() - now.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return days > 0;
        }).length : 0,
        tags: c.tags || [],
        createdAt: new Date(c.created_at).toLocaleDateString('tr-TR'),
        assets: c.assets.map((a: any) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          details: a.details,
          value: a.value,
          uavtCode: a.uavt_code
        })),
        notes: c.notes.map((n: any) => ({
          id: n.id,
          date: n.date,
          type: n.type,
          content: n.content,
          createdBy: n.created_by
        })),
        policies: c.policies ? c.policies.map((p: any) => {
          const company = companyMap.get(p.company_id);
          return {
            id: p.id,
            customerId: p.customer_id,
            companyId: p.company_id,
            policyNo: p.policy_no,
            type: p.type,
            customerName: c.full_name,
            company: company?.name || 'Bilinmiyor',
            companyLogo: company?.logo,
            startDate: p.start_date,
            endDate: p.end_date,
            premium: p.premium,
            status: p.status,
            commissionAmount: p.commission_amount,
            description: p.description,
            productName: p.insurance_products?.name_tr, // Map product name
            plate: p.plate
          };
        }) : []
      }));

      setCustomers(formattedData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showError('Hata', 'Veriler çekilirken hata oluştu. Lütfen bağlantıyı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
    fetchCustomers();

    if (localStorage.getItem('openNewCustomerModal') === 'true') {
      localStorage.removeItem('openNewCustomerModal');
      // Small delay to ensure state readiness
      setTimeout(() => {
        openAddCustomerModal();
      }, 100);
    }
  }, []);

  // --- UI STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamilyId, setFilterFamilyId] = useState<string>('All');
  const [filterType, setFilterType] = useState<'All' | 'Bireysel' | 'Kurumsal'>('All');
  const [sortOrder, setSortOrder] = useState<'Newest' | 'A-Z' | 'Z-A'>('A-Z');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Removed useEffect for drawerPolicies

  // --- DRAWER ACTIONS ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // --- MODAL STATES ---
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isManageFamiliesModalOpen, setIsManageFamiliesModalOpen] = useState(false); // NEW: Manage Families Modal

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; type: 'family' | 'customer' | null }>({
    isOpen: false,
    id: null,
    type: null
  });

  /* State for new family creation */
  const [newFamily, setNewFamily] = useState<Partial<FamilyGroup>>({});
  const { showToast, showSuccess, showError } = useToast();

  // Family Edit State
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingFamilyForm, setEditingFamilyForm] = useState({ name: '', description: '' });

  // --- HELPERS ---
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 70) return 'text-yellow-500';
    return 'text-red-500';
  };



  // --- FILTER & SORT LOGIC ---

  const processedCustomers = customers
    .filter(c => {
      const matchesSearch =
        (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tcNo || c.vkn || '').includes(searchTerm) ||
        (c.plate?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm);
      const matchesFamily = filterFamilyId === 'All' || c.familyGroupId === filterFamilyId;
      const matchesType = filterType === 'All' || c.customerType === filterType.toUpperCase();

      // Alphabet Filter
      const matchesLetter = !selectedLetter || c.fullName.trim().toUpperCase().startsWith(selectedLetter);

      return matchesSearch && matchesFamily && matchesType && matchesLetter;
    })
    .sort((a, b) => {
      if (sortOrder === 'A-Z') return a.fullName.localeCompare(b.fullName);
      if (sortOrder === 'Z-A') return b.fullName.localeCompare(a.fullName);
      // Default newest first
      return 0;
    });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(processedCustomers.length / itemsPerPage);
  const paginatedCustomers = processedCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSortToggle = () => {
    setSortOrder(prev => {
      if (prev === 'Newest') return 'A-Z';
      if (prev === 'A-Z') return 'Z-A';
      return 'Newest';
    });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterFamilyId, filterType, selectedLetter]);




  // --- ACTIONS ---

  const openAddCustomerModal = () => {
    setEditingCustomerId(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setIsCustomerModalOpen(true);
  };

  // handleSaveCustomer logic moved to CustomerFormModal

  // --- FAMILY GROUP ACTIONS ---

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamily.name) return;
    try {
      const { data, error } = await supabase.from('family_groups').insert([{ name: newFamily.name, description: newFamily.description }]).select().single();
      if (error) throw error;
      setFamilies([...families, data]);
      // setNewCustomer({ ...newCustomer, familyGroupId: data.id }); // Removed as newCustomer is gone
      setIsFamilyModalOpen(false);
      setNewFamily({});
    } catch (error) {
      showToast('Hata', 'Aile grubu oluşturulamadı', 'error');
      console.error(error);
    }
  };

  const handleUpdateFamily = async (id: string) => {
    try {
      const { error } = await supabase.from('family_groups').update({
        name: editingFamilyForm.name,
        description: editingFamilyForm.description
      }).eq('id', id);

      if (error) throw error;

      setFamilies(prev => prev.map(f => f.id === id ? { ...f, ...editingFamilyForm } : f));
      setEditingFamilyId(null);
      // Refresh customers to update displayed group names
      fetchCustomers();
    } catch (error) {

      console.error(error);
      showToast('Hata', 'Güncelleme başarısız', 'error');
    }
  };

  const handleDeleteFamily = (id: string) => {
    setDeleteConfirmation({ isOpen: true, id, type: 'family' });
  };

  const handleDeleteCustomer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id, type: 'customer' });
  };

  const finalDelete = async () => {
    if (!deleteConfirmation.id || !deleteConfirmation.type) return;

    try {
      if (deleteConfirmation.type === 'family') {
        const { error } = await supabase.from('family_groups').delete().eq('id', deleteConfirmation.id);
        if (error) throw error;
        setFamilies(prev => prev.filter(f => f.id !== deleteConfirmation.id));
        fetchCustomers();
      } else {
        const { error } = await supabase.from('customers').delete().eq('id', deleteConfirmation.id);
        if (error) throw error;
        setCustomers(prev => prev.filter(c => c.id !== deleteConfirmation.id));
        if (selectedCustomer?.id === deleteConfirmation.id) {
          setIsDrawerOpen(false);
          setSelectedCustomer(null);
        }
      }
      setDeleteConfirmation({ isOpen: false, id: null, type: null });
    } catch (error) {
      console.error(error);
      showError('Hata', 'Silme işlemi başarısız.');
    }
  };

  // Asset, Note, and Tag actions moved to CustomerDrawer

  // renderDrawer removed and replaced by CustomerDrawer component

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 animate-in fade-in duration-500 relative">
      <CustomerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedCustomer={selectedCustomer}
        onUpdateCustomer={(updated) => {
          setSelectedCustomer(updated);
          setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
        }}
        onDeleteCustomer={handleDeleteCustomer}
        onEditCustomer={openEditCustomerModal}
        onNavigate={onNavigate}
      />

      {/* Header & Main Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Müşteri Listesi</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isLoading
              ? 'Veriler yükleniyor...'
              : `Toplam Müşteri: ${customers.length} (${customers.filter(c => c.customerType === 'BIREYSEL').length} Bireysel - ${customers.filter(c => c.customerType === 'KURUMSAL').length} Kurumsal)`}
          </p>
        </div>
        <div className="flex gap-3 relative z-10 flex-wrap md:flex-nowrap w-full md:w-auto">
          <button
            onClick={() => setIsManageFamiliesModalOpen(true)}
            className="btn-outline px-4 py-2.5 bg-white dark:bg-slate-700 flex-1 md:flex-none flex justify-center items-center shadow-sm"
          >
            <Users2 className="w-5 h-5 mr-2" />
            Aile Grupları
          </button>
          <button
            onClick={openAddCustomerModal}
            className="btn-primary px-5 py-2.5 flex-1 md:flex-none justify-center items-center shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Müşteri Ekle
          </button>
        </div>
        {/* Abstract Background Elements */}
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none dark:from-blue-900/10" />
      </div>

      {/* NEW: Filter & Sort Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4 justify-between items-center">

        {/* Left: Search & Type Filter */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              placeholder="İsim, TC, Plaka veya Telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-std pl-11 pr-4 py-3 shadow-sm"
            />
          </div>
          {/* Type Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl self-start md:self-center">
            {(['All', 'Bireysel', 'Kurumsal'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === type
                  ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  } `}
              >
                {type === 'All' ? 'Tümü' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Family */}
        <div className="flex gap-3 w-full xl:w-auto justify-end">
          {/* Family Filter */}
          <div className="relative">
            <select
              value={filterFamilyId}
              onChange={(e) => setFilterFamilyId(e.target.value)}
              className="select-std pl-4 pr-10 py-3 shadow-sm"
            >
              <option value="All">Tüm Gruplar</option>
              {families.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <Users2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <CustomerList
        customers={paginatedCustomers}
        totalCount={processedCustomers.length}
        isLoading={isLoading}
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
        onCustomerClick={(customer) => {
          setSelectedCustomer(customer);
          setIsDrawerOpen(true);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onNavigateProp={onNavigate}
      />

      {/* --- MODALS (Create Customer, Family, Asset, Note) --- */}

      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customers.find(c => c.id === editingCustomerId) || null}
        onSuccess={() => {
          fetchCustomers();
          setIsCustomerModalOpen(false);
        }}
        families={families}
        customers={customers}
        onManageFamilies={() => setIsManageFamiliesModalOpen(true)}
        onAddFamily={() => setIsFamilyModalOpen(true)}
      />

      {/* FAMILY MODAL */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-brand-primary" />
                Yeni Aile Grubu
              </h3>
              <button onClick={() => setIsFamilyModalOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
            </div>
            <form onSubmit={handleSaveFamily} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Grup Adı</label>
                <input
                  required type="text"
                  placeholder="Örn: Yılmaz Ailesi veya ABC Holding"
                  value={newFamily.name || ''}
                  onChange={e => setNewFamily({ ...newFamily, name: e.target.value })}
                  className="input-std"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Açıklama</label>
                <textarea
                  rows={3}
                  placeholder="Opsiyonel açıklama..."
                  value={newFamily.description || ''}
                  onChange={e => setNewFamily({ ...newFamily, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none placeholder:text-slate-400"
                />
              </div>
              <button className="btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Oluştur ve Seç</span>
              </button>
            </form>
          </div>
        </div>
      )}




      {isManageFamiliesModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users2 className="w-6 h-6 text-brand-primary" /> Aile Grupları Yönetimi</h3>
              <button onClick={() => setIsManageFamiliesModalOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /></button>
            </div>

            {/* New Family Input */}
            <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Yeni Grup Oluştur</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Grup Adı (Örn: Yılmaz Ailesi)"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
                  value={newFamily.name || ''}
                  onChange={e => setNewFamily({ ...newFamily, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Açıklama (Opsiyonel)"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
                  value={newFamily.description || ''}
                  onChange={e => setNewFamily({ ...newFamily, description: e.target.value })}
                />
              </div>
              <button
                onClick={handleSaveFamily}
                className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Oluştur
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {families.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">Henüz bir aile grubu oluşturulmamış.</div>
              ) : (
                families.map(f => (
                  <div key={f.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:shadow-md transition-all">
                    {editingFamilyId === f.id ? (
                      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-brand-primary rounded-lg text-sm outline-none"
                          value={editingFamilyForm.name}
                          onChange={e => setEditingFamilyForm({ ...editingFamilyForm, name: e.target.value })}
                          autoFocus
                        />
                        <input
                          type="text"
                          className="input-std py-2 px-3"
                          value={editingFamilyForm.description}
                          onChange={e => setEditingFamilyForm({ ...editingFamilyForm, description: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          {f.name}
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 font-normal">
                            {customers.filter(c => c.familyGroupId === f.id).length} Üye
                          </span>
                        </h5>
                        {f.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.description}</p>}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {editingFamilyId === f.id ? (
                        <>
                          <button onClick={() => handleUpdateFamily(f.id)} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200" title="Kaydet"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => setEditingFamilyId(null)} className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200" title="İptal"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingFamilyId(f.id); setEditingFamilyForm({ name: f.name, description: f.description || '' }) }}
                            className="btn-icon bg-slate-50 dark:bg-slate-700"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFamily(f.id)}
                            className="btn-icon bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {deleteConfirmation.type === 'family' ? 'Grubu Sil?' : 'Kullanıcıyı Sil?'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {deleteConfirmation.type === 'family'
                ? 'Bu işlem geri alınamaz. Aile grubu kalıcı olarak silinecektir. Gruba bağlı müşteriler silinmez.'
                : 'Bu işlem geri alınamaz. Kullanıcı ve verileri kalıcı olarak silinecektir.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, id: null, type: null })}
                className="btn-ghost flex-1 py-2.5 bg-slate-100 dark:bg-slate-700"
              >
                İptal
              </button>
              <button
                onClick={finalDelete}
                className="btn-danger flex-1 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/25 active:scale-95"
              >
                Silmeyi Onayla
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
