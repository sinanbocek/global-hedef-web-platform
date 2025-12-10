import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, SortAsc, SortDesc, MoreHorizontal, User, UserPlus, FileText, CheckCircle, X, Shield, Phone, Mail, MapPin, Building2, Wallet, Users2, Trash2, Edit, Edit2, ChevronRight, Settings, Loader2, ArrowDownAZ, ArrowUpZA, ArrowUpDown, Calendar, MessageCircle, Tag, Car, Home, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { SearchableSelect } from './ui/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import { MOCK_POLICIES } from '../constants';
import { Customer, CustomerAsset, CustomerNote, InsuranceType, FamilyGroup, Policy } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CustomersProps {
  onNavigate?: (page: string) => void;
}

// 0 (XXX) XXX XX XX format
const formatPhoneNumber = (val: string) => {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 0) return '';

  // If user starts typing without 0, assume they mean 5XX...
  let str = clean;
  if (clean.startsWith('0')) {
    str = clean.substring(1);
  }

  // Limit to 10 digits (excluding leading 0)
  if (str.length > 10) str = str.substring(0, 10);

  let formatted = '0';
  if (str.length > 0) formatted += ' (' + str.substring(0, 3);
  if (str.length >= 3) formatted += ') ' + str.substring(3, 6);
  if (str.length >= 6) formatted += ' ' + str.substring(6, 8);
  if (str.length >= 8) formatted += ' ' + str.substring(8, 10);

  return formatted;
};

const formatNumberInput = (val: string) => {
  const clean = val.replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('tr-TR').format(Number(clean));
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLocaleLowerCase('tr-TR').split(' ').map(word =>
    word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
  ).join(' ');
};

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
  contact_person_rel:contact_person_id(id, full_name, tc_no, vkn),
  assets: customer_assets(*),
    notes: customer_notes(*),
      family_group: family_groups(*),
        policies: policies(*)
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

        // Contact person
        contactPersonId: c.contact_person_id,
        contactPerson: c.contact_person_rel ? {
          id: c.contact_person_rel.id,
          fullName: c.contact_person_rel.full_name,
          tcNo: c.contact_person_rel.tc_no,
          vkn: c.contact_person_rel.vkn
        } as any : undefined,

        fullName: c.full_name,
        email: c.email,
        phone: c.phone,
        riskScore: c.risk_score,
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
  const [activeTab, setActiveTab] = useState<'profile' | 'assets' | 'policies' | 'notes'>('profile');

  // --- MODAL STATES ---
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isManageFamiliesModalOpen, setIsManageFamiliesModalOpen] = useState(false); // NEW: Manage Families Modal

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; type: 'family' | 'customer' | null }>({
    isOpen: false,
    id: null,
    type: null
  });
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTagInputVisible, setIsTagInputVisible] = useState(false);

  // Tag Autocomplete
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Asset Editing
  const [isEditAssetMode, setIsEditAssetMode] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // --- FORM STATES ---
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    type: 'Bireysel', customerType: 'BIREYSEL', riskScore: 10, tags: []
  });
  const [newAsset, setNewAsset] = useState<Partial<CustomerAsset>>({ type: 'Araç' });
  const [assetDisplayValue, setAssetDisplayValue] = useState('');
  const [newNote, setNewNote] = useState<Partial<CustomerNote>>({ type: 'Not' });
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

  const uniqueTags = Array.from(new Set(customers.flatMap(c => c.tags))).sort();
  const filteredTags = uniqueTags.filter(t => t.toLowerCase().includes(newTag.toLowerCase()) && !selectedCustomer?.tags.includes(t));

  // --- FILTER & SORT LOGIC ---

  const processedCustomers = customers
    .filter(c => {
      const matchesSearch =
        (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tcKn || '').includes(searchTerm) ||
        (c.plate?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm);
      const matchesFamily = filterFamilyId === 'All' || c.familyGroupId === filterFamilyId;
      const matchesType = filterType === 'All' || c.customerType === filterType.toUpperCase() || c.type === filterType;

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
    setNewCustomer({ type: 'Bireysel', riskScore: 10, tags: [] });
    setEditingCustomerId(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    // Map tc_no/vkn to tcKn for form display
    setNewCustomer({
      ...customer,
      type: customer.customerType === 'BIREYSEL' ? 'Bireysel' : 'Kurumsal',
      tcKn: customer.tcNo || customer.vkn || ''  // Fallback for old records
    });
    setEditingCustomerId(customer.id);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate TCKN/Vergi No
    const isDuplicate = customers.some(c => c.tcKn === newCustomer.tcKn && c.id !== editingCustomerId);
    if (isDuplicate) {
      showToast('Hata', 'Bu TC Kimlik / Vergi No ile kayıtlı başka bir müşteri bulunmaktadır.', 'error');
      return;
    }

    setIsLoading(true);

    const customerData = {
      customer_no: editingCustomerId ? undefined : `GH-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_type: newCustomer.type?.toUpperCase(),  // BIREYSEL or KURUMSAL
      // Map tcKn to correct field based on type
      tc_no: newCustomer.type === 'Bireysel' ? newCustomer.tcKn : null,  // Bireysel için TC
      vkn: newCustomer.type === 'Kurumsal' ? newCustomer.tcKn : null,    // Kurumsal için VKN
      contact_person_id: newCustomer.type === 'Kurumsal' ? newCustomer.contactPersonId : null, // Kurumsal için yetkili
      tax_office: newCustomer.taxOffice,
      full_name: newCustomer.fullName,
      email: newCustomer.email,
      phone: newCustomer.phone,
      risk_score: newCustomer.riskScore,
      family_group_id: newCustomer.familyGroupId || null,
    };

    // DEBUG: Log data being sent
    console.log('🔍 Customer Data to Save:', customerData);
    console.log('📝 Customer Type:', customerData.customer_type);
    console.log('🆔 TC/VKN:', customerData.tc_no || customerData.vkn);

    try {
      if (editingCustomerId) {
        const { error } = await supabase.from('customers').update(customerData).eq('id', editingCustomerId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([customerData]);
        if (error) throw error;
      }
      await fetchCustomers();
      setIsCustomerModalOpen(false);
      setNewCustomer({ type: 'Bireysel', customerType: 'BIREYSEL', riskScore: 10, tags: [] });
      setEditingCustomerId(null);
      showSuccess('Başarılı', editingCustomerId ? 'Müşteri güncellendi.' : 'Yeni müşteri eklendi.');
    } catch (error) {
      showToast('Hata', 'Müşteri kaydedilirken hata oluştu.', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FAMILY GROUP ACTIONS ---

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamily.name) return;
    try {
      const { data, error } = await supabase.from('family_groups').insert([{ name: newFamily.name, description: newFamily.description }]).select().single();
      if (error) throw error;
      setFamilies([...families, data]);
      setNewCustomer({ ...newCustomer, familyGroupId: data.id });
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

  // Asset Actions
  const openAddAssetModal = () => {
    setNewAsset({ type: 'Araç' });
    setAssetDisplayValue('');
    setIsEditAssetMode(false);
    setEditingAssetId(null);
    setIsAssetModalOpen(true);
  };

  const openEditAssetModal = (asset: CustomerAsset) => {
    setNewAsset(asset);
    setAssetDisplayValue(formatNumberInput(asset.value ? asset.value.toString() : ''));
    setIsEditAssetMode(true);
    setEditingAssetId(asset.id);
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const rawValue = assetDisplayValue ? parseInt(assetDisplayValue.replace(/\./g, '')) : 0;
    const assetData = {
      customer_id: selectedCustomer.id,
      type: newAsset.type || 'Araç',
      description: newAsset.description || '',
      details: newAsset.details || '',
      value: rawValue,
      uavt_code: newAsset.uavtCode
    };

    try {
      if (isEditAssetMode && editingAssetId) {
        const { error } = await supabase.from('customer_assets').update(assetData).eq('id', editingAssetId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customer_assets').insert([assetData]);
        if (error) throw error;
      }
      await fetchCustomers();
      const { data } = await supabase.from('customers').select('*, assets:customer_assets(*), notes:customer_notes(*), family_group:family_groups(*)').eq('id', selectedCustomer.id).single();
      if (data) {
        const formatted: Customer = {
          ...selectedCustomer,
          assets: data.assets.map((a: any) => ({
            id: a.id, type: a.type, description: a.description, details: a.details, value: a.value, uavtCode: a.uavt_code
          }))
        };
        setSelectedCustomer(formatted);
      }
      setIsAssetModalOpen(false);
      showSuccess('Başarılı', isEditAssetMode ? 'Varlık güncellendi.' : 'Varlık eklendi.');
    } catch (error) {
      console.error(error);
      showError('Hata', 'Varlık kaydedilemedi.');
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Varlığı silmek istiyor musunuz?')) return;

    try {
      const { error } = await supabase.from('customer_assets').delete().eq('id', assetId);
      if (error) throw error;
      const updatedAssets = selectedCustomer.assets.filter(a => a.id !== assetId);
      setSelectedCustomer({ ...selectedCustomer, assets: updatedAssets });
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, assets: updatedAssets } : c));
    } catch (error) {
      showError('Hata', 'Varlık silinemedi.');
    }
  };

  // Note Actions
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const noteData = {
      customer_id: selectedCustomer.id,
      date: new Date().toLocaleDateString('tr-TR'),
      type: newNote.type || 'Not',
      content: newNote.content || '',
      created_by: 'Admin'
    };

    try {
      const { data, error } = await supabase.from('customer_notes').insert([noteData]).select().single();
      if (error) throw error;
      const newNoteObj: CustomerNote = {
        id: data.id, date: data.date, type: data.type as any, content: data.content, createdBy: data.created_by
      };
      const updatedNotes = [newNoteObj, ...selectedCustomer.notes];
      setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, notes: updatedNotes } : c));
      setIsNoteModalOpen(false);
      setNewNote({ type: 'Not' });
      showSuccess('Başarılı', 'Not eklendi.');
    } catch (error) {
      showError('Hata', 'Not eklenemedi.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedCustomer) return;
    if (!window.confirm('Notu silmek istiyor musunuz?')) return;
    try {
      const { error } = await supabase.from('customer_notes').delete().eq('id', noteId);
      if (error) throw error;
      const updatedNotes = selectedCustomer.notes.filter(n => n.id !== noteId);
      setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, notes: updatedNotes } : c));
    } catch (error) {
      showError('Hata', 'Not silinemedi.');
    }
  };

  // Tag Actions
  const handleAddTag = async (tagToAdd?: string) => {
    const finalTag = tagToAdd || newTag.trim();
    if (!selectedCustomer || !finalTag) return;
    if (selectedCustomer.tags.includes(finalTag)) return;
    const newTags = [...selectedCustomer.tags, finalTag];
    try {
      const { error } = await supabase.from('customers').update({ tags: newTags }).eq('id', selectedCustomer.id);
      if (error) throw error;
      setSelectedCustomer({ ...selectedCustomer, tags: newTags });
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, tags: newTags } : c));
      setNewTag('');
      setIsTagInputVisible(false);
      setShowTagSuggestions(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedCustomer) return;
    const newTags = selectedCustomer.tags.filter(t => t !== tag);
    try {
      const { error } = await supabase.from('customers').update({ tags: newTags }).eq('id', selectedCustomer.id);
      if (error) throw error;
      setSelectedCustomer({ ...selectedCustomer, tags: newTags });
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, tags: newTags } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const handleQuickQuote = (asset: CustomerAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCustomer || !onNavigate) return;

    const draftData = {
      tcKn: selectedCustomer.tcKn,
      phone: selectedCustomer.phone,
      plate: asset.type === 'Araç' ? asset.description : '',
      email: selectedCustomer.email,
      insuranceType: asset.type === 'Araç' ? InsuranceType.TRAFIK : (asset.type === 'Konut' ? InsuranceType.KONUT : InsuranceType.ISYERI)
    };

    localStorage.setItem('quote_draft_data', JSON.stringify(draftData));
    onNavigate('quote');
  };

  const getAssetPolicyStatus = (asset: CustomerAsset) => {
    const policies = MOCK_POLICIES.filter(p => p.customerId === selectedCustomer?.id && p.status === 'Active');
    if (asset.type === 'Araç') {
      return policies.some(p => p.type === InsuranceType.TRAFIK || p.type === InsuranceType.KASKO);
    }
    if (asset.type === 'Konut') {
      return policies.some(p => p.type === InsuranceType.KONUT);
    }
    if (asset.type === 'İşyeri') {
      return policies.some(p => p.type === InsuranceType.ISYERI);
    }
    return false;
  };

  // --- DRAWER COMPONENT ---
  const renderDrawer = () => {
    if (!isDrawerOpen || !selectedCustomer) return null;
    // Use the fetched real policies from selectedCustomer
    const customerPolicies = selectedCustomer.policies || [];
    const totalPremium = customerPolicies.reduce((sum, p) => sum + p.premium, 0);

    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default" onClick={() => setIsDrawerOpen(false)} />
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-50">            {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{toTitleCase(selectedCustomer.fullName)}</h2>
                {selectedCustomer.familyGroup && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 text-indigo-700 bg-transparent dark:border-indigo-700 dark:text-indigo-400">
                    <Users2 className="w-3 h-3 mr-1.5 opacity-70" />
                    {selectedCustomer.familyGroup.name}
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-4">
                <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">#{selectedCustomer.customerNo}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedCustomer.createdAt}</span>
              </div>
            </div>
            <div className="flex gap-2 relative z-50">
              <button onClick={() => openEditCustomerModal(selectedCustomer)} className="btn-icon rounded-full"><Edit className="w-5 h-5" /></button>
              <button onClick={() => handleDeleteCustomer(selectedCustomer.id)} className="btn-icon rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-5 h-5" /></button>
              <button onClick={() => setIsDrawerOpen(false)} className="btn-icon rounded-full"><X className="w-6 h-6" /></button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 bg-white dark:bg-slate-900">
            {['profile', 'assets', 'policies', 'notes'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'} `}>
                {tab === 'profile' && 'Profil & İletişim'}
                {tab === 'assets' && 'Varlıklar'}
                {tab === 'policies' && 'Poliçe Geçmişi'}
                {tab === 'notes' && 'CRM & Notlar'}
              </button>
            ))}
          </div>
          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => onNavigate && onNavigate('quote')} className="btn-primary w-full p-3 flex items-center justify-center shadow-lg"><FileText className="w-5 h-5 mr-2" /> Hızlı Teklif Al</button>
                  <button className="flex items-center justify-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"><MessageCircle className="w-5 h-5 mr-2" /> WhatsApp</button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center"><User className="w-4 h-4 mr-2" /> İletişim Bilgileri</h3>
                  <div className="space-y-3">
                    {(selectedCustomer.customerType === 'KURUMSAL' && selectedCustomer.contactPerson && typeof selectedCustomer.contactPerson !== 'string') && <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700"><span className="text-slate-500 text-sm">Yetkili Kişi</span><span className="font-medium text-slate-800 dark:text-white">{selectedCustomer.contactPerson.fullName}</span></div>}
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700"><span className="text-slate-500 text-sm">Telefon</span><div className="flex items-center gap-2"><span className="font-medium text-slate-800 dark:text-white">{selectedCustomer.phone}</span></div></div>
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700"><span className="text-slate-500 text-sm">E-Posta</span><span className="font-medium text-slate-800 dark:text-white">{selectedCustomer.email}</span></div>
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700"><span className="text-slate-500 text-sm">TC / Vergi No</span><span className="font-medium font-mono text-slate-800 dark:text-white">{selectedCustomer.tcNo || selectedCustomer.vkn || '-'}</span></div>
                  </div>
                </div>
                {/* Tags */}
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center"><Tag className="w-4 h-4 mr-2" /> Etiketler</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 bg-transparent dark:border-slate-600 dark:text-slate-400">
                        {tag} <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {isTagInputVisible ? (
                      <div className="relative">
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            className="w-32 py-1 px-2 text-xs border rounded outline-none bg-white text-slate-900 border-slate-300 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            placeholder="Etiket..."
                            value={newTag}
                            onChange={(e) => { setNewTag(e.target.value); setShowTagSuggestions(true); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          />
                          <button onClick={() => handleAddTag()} className="text-green-600"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => { setIsTagInputVisible(false); setShowTagSuggestions(false); }} className="text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                        {showTagSuggestions && filteredTags.length > 0 && (
                          <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 border rounded shadow-lg z-50">
                            {filteredTags.map(t => <div key={t} onClick={() => handleAddTag(t)} className="px-3 py-2 text-xs hover:bg-slate-100 cursor-pointer">{t}</div>)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => setIsTagInputVisible(true)} className="px-3 py-1 border border-dashed border-slate-300 text-slate-400 rounded-full text-xs hover:text-brand-primary">+ Etiket Ekle</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ASSETS TAB - With Quick Quote */}
            {activeTab === 'assets' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 dark:text-white">Kayıtlı Varlıklar</h3><button onClick={openAddAssetModal} className="btn-primary btn-sm flex items-center shadow-sm"><Plus className="w-4 h-4 mr-1" /> Varlık Ekle</button></div>
                {selectedCustomer.assets.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">Kayıtlı varlık yok.</p> : selectedCustomer.assets.map((asset) => {
                  const hasActivePolicy = getAssetPolicyStatus(asset);
                  return (
                    <div key={asset.id} className="flex items-start p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow group relative">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mr-4 text-brand-primary">{asset.type === 'Araç' ? <Car className="w-6 h-6" /> : asset.type === 'Konut' ? <Home className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}</div>
                      <div className="flex-1">
                        <div className="flex justify-between pr-8"><h4 className="font-bold text-slate-800 dark:text-white">{asset.description}</h4><div className="flex gap-2"><span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{asset.type}</span>{hasActivePolicy && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sigortalı</span>}</div></div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{asset.details}</p>
                        {asset.value && <p className="text-xs text-slate-400 mt-1">Değer: ₺{asset.value.toLocaleString('tr-TR')}</p>}

                        {/* Quick Quote Button (Visible on Hover if no policy) */}
                        {!hasActivePolicy && (
                          <button
                            onClick={(e) => handleQuickQuote(asset, e)}
                            className="mt-3 text-xs flex items-center gap-1 text-brand-accent hover:text-orange-600 hover:underline font-bold transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
                          >
                            <Zap className="w-3 h-3 fill-current" /> Hızlı Teklif Al
                          </button>
                        )}
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditAssetModal(asset)} className="btn-icon"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteAsset(asset.id)} className="btn-icon text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'policies' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-white">Poliçe Geçmişi</h3>
                  <div className="text-xs bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full font-medium">
                    Toplam Prim: ₺{totalPremium.toLocaleString('tr-TR')}
                  </div>
                </div>

                {customerPolicies.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Bu müşteriye ait poliçe kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-8 pb-4 pt-2">
                    {customerPolicies
                      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
                      .map((p, index) => {
                        const isExpired = new Date(p.endDate) < new Date();
                        const isActive = p.status === 'Active' && !isExpired;
                        const isCancelled = p.status === 'Cancelled';
                        const typeLower = p.type.toLocaleLowerCase('tr-TR');
                        const isVehiclePolicy = typeLower.includes('trafik') || typeLower.includes('kasko');

                        let statusColor = 'bg-slate-300 border-white dark:border-slate-900'; // Default gray
                        let statusText = 'Pasif';
                        let statusBadgeClass = 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';

                        if (isActive) {
                          statusColor = 'bg-green-500 border-white dark:border-slate-900 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]';
                          statusText = 'Aktif';
                          statusBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                        } else if (isCancelled) {
                          statusColor = 'bg-red-500 border-white dark:border-slate-900';
                          statusText = 'İptal';
                          statusBadgeClass = 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400';
                        } else if (isExpired) {
                          statusText = 'Süresi Doldu';
                        }

                        return (
                          <div key={p.id} className="relative pl-8 group">
                            {/* Timeline Node */}
                            <div className={`absolute -left-[9px] top-6 w-[18px] h-[18px] rounded-full border-[3px] box-content z-10 transition-colors ${statusColor} `}></div>

                            {/* Card */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg hover:border-brand-primary/30 dark:hover:border-brand-primary/30 transition-all cursor-default relative overflow-hidden group-hover:translate-x-1 duration-200">
                              {isActive && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-green-500/10 to-transparent -mr-8 -mt-8 rounded-full pointer-events-none" />}

                              <div className="flex justify-between items-start mb-3 relative z-10">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                                      {isVehiclePolicy ? <Car className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">{p.type}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide ${statusBadgeClass} `}>
                                      {statusText}
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                                    {p.companyLogo ? (
                                      <img src={p.companyLogo} alt={p.company} className="w-4 h-4 object-contain" />
                                    ) : (
                                      <Building2 className="w-3.5 h-3.5" />
                                    )}
                                    {p.company}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-slate-400 mb-0.5 font-mono select-all hover:text-brand-primary transition-colors cursor-copy" title="Poliçe Numarası">
                                    No: {p.policyNo}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between items-end pt-3 border-t border-slate-100 dark:border-slate-700/50 mt-3 relative z-10">
                                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                  <div className="flex items-center gap-1.5" title="Başlangıç">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                    {new Date(p.startDate).toLocaleDateString('tr-TR')}
                                  </div>
                                  <div className="flex items-center gap-1.5" title="Bitiş">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    {new Date(p.endDate).toLocaleDateString('tr-TR')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Net Prim</div>
                                  <div className="font-bold text-xl text-brand-primary tracking-tight">
                                    ₺{p.premium.toLocaleString('tr-TR')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'notes' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setIsNoteModalOpen(true)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-brand-primary font-medium">+ Yeni Not Ekle</button>
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-4">
                  {selectedCustomer.notes.map(n => (
                    <div key={n.id} className="relative pl-6 group">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-slate-400"></div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between mb-1"><span className="text-xs font-bold">{n.type}</span><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">{n.date}</span><button onClick={() => handleDeleteNote(n.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button></div></div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{n.content}</p>
                        <div className="mt-2 text-[10px] text-slate-400 border-t pt-2 flex items-center"><User className="w-3 h-3 mr-1" /> {n.createdBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 animate-in fade-in duration-500 relative">
      {renderDrawer()}

      {/* Header & Main Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Müşteri Listesi</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isLoading
              ? 'Veriler yükleniyor...'
              : `Toplam Müşteri: ${customers.length} (${customers.filter(c => c.type === 'Bireysel').length} Bireysel - ${customers.filter(c => c.type === 'Kurumsal').length} Kurumsal)`}
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

      {/* Customer List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 backdrop-blur-sm dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th
                    onClick={() => handleSortToggle()}
                    className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1">
                      Müşteri
                      {sortOrder === 'A-Z' && <ArrowDownAZ className="w-4 h-4 text-brand-primary" />}
                      {sortOrder === 'Z-A' && <ArrowUpZA className="w-4 h-4 text-brand-primary" />}
                      {sortOrder === 'Newest' && <ArrowUpDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İletişim</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aile / Grup</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Etiketler</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Varlıklar</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Poliçeler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${(customer.customerType === 'BIREYSEL' || customer.type === 'Bireysel')
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          }`}>
                          {(customer.customerType === 'BIREYSEL' || customer.type === 'Bireysel') ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{customer.fullName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{customer.tcNo || customer.vkn || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px]">{formatPhoneNumber(customer.phone)}</span>
                        </div>
                        {customer.email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] sm:text-[11px] truncate max-w-[140px]" title={customer.email}>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.familyGroup ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-400 md:whitespace-nowrap">
                          <Users2 className="w-3 h-3 mr-1.5 opacity-70" />
                          {customer.familyGroup.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 md:whitespace-nowrap">
                          <Users2 className="w-3 h-3 mr-1.5 opacity-50" />
                          Genel Müşteriler
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.length > 0 ? (
                          <>
                            {customer.tags.slice(0, 2).map(t => (
                              <span key={t} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 bg-transparent dark:border-slate-600 dark:text-slate-400">
                                <Tag className="w-3 h-3 mr-1 opacity-50" />
                                {t}
                              </span>
                            ))}
                            {customer.tags.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">+{customer.tags.length - 2}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {customer.assets.length === 0 && <span className="text-xs text-slate-400">-</span>}
                        {customer.assets.slice(0, 3).map((asset, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm" title={asset.description}>
                            {asset.type === 'Araç' ? <Car className="w-4 h-4" /> : asset.type === 'Konut' ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          </div>
                        ))}
                        {customer.assets.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            +{customer.assets.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {customer.activePoliciesCount && customer.activePoliciesCount > 0 ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/policies?customerId=${customer.id}`);
                            if (onNavigate) onNavigate('policies');
                          }}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          {customer.activePoliciesCount} Aktif Poliçe
                          <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Poliçe Yok
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {processedCustomers.length > 0 && (
              <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Toplam <span className="font-bold">{processedCustomers.length}</span> kayıt, <span className="font-bold">{currentPage}</span> / {totalPages} sayfa gösteriliyor
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Önceki
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logic to show ranges around current page could be added here for many pages
                      // For now simplified logic
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 2 + i;
                        if (p > totalPages) p = 100000; // invalid, will filter
                      }
                      return p <= totalPages ? p : null;
                    }).filter(Boolean).map((p: any) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${currentPage === p ? 'bg-brand-primary text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'} `}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}

            {processedCustomers.length === 0 && (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">Sonuç bulunamadı</p>
                <p className="text-sm mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALS (Create Customer, Family, Asset, Note) --- */}

      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Müşteri Tipi</label>
                  <div className="relative">
                    <select
                      value={newCustomer.type}
                      onChange={e => setNewCustomer({ ...newCustomer, type: e.target.value as any })}
                      className="select-std"
                    >
                      <option value="Bireysel">Bireysel</option>
                      <option value="Kurumsal">Kurumsal</option>
                    </select>
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Aile / Grup</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={newCustomer.familyGroupId || ''}
                        onChange={e => setNewCustomer({ ...newCustomer, familyGroupId: e.target.value || null })}
                        className="select-std"
                      >
                        <option value="">Seçiniz...</option>
                        {families.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <Users2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManageFamiliesModalOpen(true)}
                      className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      title="Aile Gruplarını Yönet"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFamilyModalOpen(true)}
                      className="p-2.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl hover:bg-brand-primary/20 transition-colors"
                      title="Yeni Aile Grubu Ekle"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Ad Soyad / Ünvan</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    value={newCustomer.fullName || ''}
                    onChange={e => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                    className="input-std"
                    placeholder="Müşteri Adı Soyadı"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Redundant TC No field removed - utilizing unified field below */}

              {newCustomer.type === 'Kurumsal' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Yetkili Kişi</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={customers
                          .filter(c => c.customerType === 'BIREYSEL' || c.type === 'Bireysel')  // Support both new and legacy
                          .map(c => ({ value: c.id, label: `${c.fullName} (${c.tcNo || c.vkn || c.tcKn || 'TC Yok'})` }))
                          .sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'))}
                        value={newCustomer.contactPersonId || customers.find(c => c.fullName === newCustomer.contactPerson)?.id || ''}
                        onChange={(val) => {
                          setNewCustomer({ ...newCustomer, contactPersonId: val });
                        }}
                        placeholder={newCustomer.contactPerson || "Seçiniz..."}
                        className="w-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomer({ type: 'Bireysel', riskScore: 10, tags: [] });
                        showToast('Bilgi', 'Bireysel müşteri ekleme ekranına geçildi. Lütfen önce yetkili kişiyi ekleyin.', 'info');
                      }}
                      className="p-2.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl hover:bg-brand-primary/20 transition-colors"
                      title="Yeni Kişi Ekle"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {newCustomer.type === 'Kurumsal' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={newCustomer.taxOffice || ''}
                    onChange={e => setNewCustomer({ ...newCustomer, taxOffice: e.target.value })}
                    className="input-std"
                    placeholder="Örn: Kadıköy"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                    {newCustomer.type === 'Bireysel' ? 'TC Kimlik No' : 'VKN / Vergi No'}
                  </label>
                  <input
                    required type="text"
                    maxLength={newCustomer.type === 'Bireysel' ? 11 : 10}
                    value={newCustomer.tcKn || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewCustomer({
                        ...newCustomer,
                        tcKn: val,
                        tcNo: newCustomer.type === 'Bireysel' ? val : newCustomer.tcNo,
                        vkn: newCustomer.type === 'Kurumsal' ? val : newCustomer.vkn
                      })
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 font-mono"
                    placeholder={newCustomer.type === 'Bireysel' ? "12345678901" : "1234567890"}
                  />
                  {/* Validation Feedback */}
                  {newCustomer.tcKn && (
                    (newCustomer.type === 'Bireysel' && newCustomer.tcKn.length !== 11) ||
                    (newCustomer.type === 'Kurumsal' && newCustomer.tcKn.length !== 10)
                  ) && (
                      <p className="text-xs text-amber-500 ml-1 mt-1">
                        {newCustomer.type === 'Bireysel' ? 'TC Kimlik No 11 hane olmalıdır' : 'VKN 10 hane olmalıdır'}
                      </p>
                    )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Telefon</label>
                  <div className="relative">
                    <input
                      required type="text"
                      value={newCustomer.phone || ''}
                      onChange={e => setNewCustomer({ ...newCustomer, phone: formatPhoneNumber(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 font-mono"
                      placeholder="0 (5XX) XXX XX XX"
                      maxLength={17}
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">E-Posta</label>
                <div className="relative">
                  <input
                    type="email"
                    value={newCustomer.email || ''}
                    onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="input-std"
                    placeholder="ornek@email.com"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-4 items-center">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 max-w-[120px] py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <div className="flex-1 flex justify-end">
                  <button
                    disabled={isLoading}
                    className="btn-primary py-3 px-8 rounded-2xl font-bold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Kaydet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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



      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-primary" />
                {isEditAssetMode ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}
              </h3>
              <button onClick={() => setIsAssetModalOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" /></button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Tip</label>
                <div className="relative">
                  <select
                    value={newAsset.type}
                    onChange={e => setNewAsset({ ...newAsset, type: e.target.value as any })}
                    className="select-std"
                  >
                    <option value="Araç">Araç</option>
                    <option value="Konut">Konut</option>
                    <option value="İşyeri">İşyeri</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                  {newAsset.type === 'Araç' ? 'Plaka' : 'Başlık (Örn: Yazlık)'}
                </label>
                <input
                  required type="text"
                  value={newAsset.description || ''}
                  onChange={e => setNewAsset({ ...newAsset, description: e.target.value })}
                  className="input-std"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Detay (Marka/Model veya Adres)</label>
                <input
                  required type="text"
                  value={newAsset.details || ''}
                  onChange={e => setNewAsset({ ...newAsset, details: e.target.value })}
                  className="input-std"
                />
              </div>
              {(newAsset.type === 'Konut' || newAsset.type === 'İşyeri') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">UAVT Kodu (Opsiyonel)</label>
                  <input
                    type="text"
                    value={newAsset.uavtCode || ''}
                    onChange={e => setNewAsset({ ...newAsset, uavtCode: e.target.value })}
                    className="input-std"
                    placeholder="10 haneli adres kodu"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Tahmini Değer (TL)</label>
                <input
                  type="text"
                  value={assetDisplayValue}
                  onChange={(e) => setAssetDisplayValue(formatNumberInput(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 font-mono"
                  placeholder="0"
                />
              </div>
              <div className="pt-4 flex gap-4 items-center">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="flex-1 max-w-[120px] py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <div className="flex-1 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary py-3 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{isEditAssetMode ? 'Güncelle' : 'Ekle'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-primary" />
                Yeni Not Ekle
              </h3>
              <button onClick={() => setIsNoteModalOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" /></button>
            </div>

            <form onSubmit={handleAddNote} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Etkileşim Tipi</label>
                <div className="relative">
                  <select
                    value={newNote.type}
                    onChange={e => setNewNote({ ...newNote, type: e.target.value as any })}
                    className="select-std"
                  >
                    <option value="Not">Genel Not</option>
                    <option value="Görüşme">Görüşme</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">İçerik</label>
                <textarea
                  required rows={4}
                  value={newNote.content || ''}
                  onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all resize-none placeholder:text-slate-400"
                  placeholder="Not detaylarını buraya giriniz..."
                />
              </div>

              <div className="pt-4 flex gap-4 items-center">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 max-w-[120px] py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  İptal
                </button>
                <div className="flex-1 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary py-3 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Kaydet</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TAGS MODAL (Moved to Drawer so removed here) */}

      {/* MANAGE FAMILIES MODAL */}
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
