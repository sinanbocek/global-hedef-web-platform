import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Loader2, Car, Home, Briefcase, Heart, Plane, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Check, Trash2, UserPlus, AlertCircle,
  Clock, Plus, Search, Download, ChevronRight, X, AlertTriangle, Calendar, CheckCircle, Building2, FileText,
  Shield, Umbrella, Ship, Activity, LifeBuoy
} from 'lucide-react';
import { Policy, InsuranceType } from '../types';
import { supabase } from '../lib/supabase';
import { MOCK_POLICIES } from '../constants';
import * as XLSX from 'xlsx';

import { PolicyFormModal } from './PolicyFormModal';
import { SearchableSelect } from './ui/SearchableSelect';
import { DatePicker } from './ui/DatePicker';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';

interface PoliciesProps {
  onNavigate?: (page: string) => void;
}

export const Policies: React.FC<PoliciesProps> = ({ onNavigate }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlCustomerId = searchParams.get('customerId');

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // If navigating from Customer list (with ID), show All policies by default to ensure they are visible even if expired
  // UPDATE: User wants 'Active' by default. Since we fixed the count logic, this is safe.
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Expired' | 'Cancelled' | 'Potential'>('Active');
  const [filterType, setFilterType] = useState<string>('All');
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'Default' | 'ExpiringSoon' | 'A-Z' | 'Z-A'>('Default');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterProduct, setFilterProduct] = useState<string>('All');

  // Helper to get days remaining
  // Helper to get days remaining (Midnight to Midnight comparison)
  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return 0;
    // Handle YYYY-MM-DD strictly as local date
    const [y, m, d] = dateStr.split('-').map(Number);
    const end = new Date(y, m - 1, d); // Local Midnight

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Local Midnight

    const diffTime = end.getTime() - now.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to get Derived Status
  const getPolicyStatus = (policy: Policy) => {
    if (policy.status === 'Potential') return 'Potential';
    if (policy.status === 'Cancelled') return 'Cancelled';

    const days = getDaysRemaining(policy.endDate);

    // User Rule: If End Date == Today (days=0), it is still Active.
    // If End Date < Today (days < 0), it is Expired.
    if (days < 0) return 'Expired';
    return 'Active';
  };

  // Add Policy Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const [customers, setCustomers] = useState<{ id: string; full_name: string; customer_type?: string; tcNo?: string; vkn?: string; }[]>([]);
  // Store companies with their active status for filtering logic
  const [companies, setCompanies] = useState<{ id: string, name: string, is_active: boolean }[]>([]);
  const [users, setUsers] = useState<{ id: string, full_name: string, role?: string, roles?: string[] }[]>([]);

  // NEW: Insurance categories and products
  const [categories, setCategories] = useState<{ id: string, code: string, name_tr: string }[]>([]);
  const [products, setProducts] = useState<{ id: string, category_id: string, code: string, name_tr: string }[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<{ id: string, category_id: string, code: string, name_tr: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);



  const { showSuccess, showError } = useToast();

  const formatCurrencyInput = (value: number) => {
    if (value === 0) return '';
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (val: string) => {
    // Remove all dots (thousands separator) and replace comma with dot (decimal separator)
    const cleanVal = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  // Helper to check roles safely (handling both array and legacy string)
  const hasRole = (user: { id: string, full_name: string, role?: string, roles?: string[] }, roleToCheck: string) => {
    if (user.roles && Array.isArray(user.roles)) return user.roles.includes(roleToCheck as any);
    // @ts-ignore - Handle legacy
    if (user.role === roleToCheck) return true;
    return false;
  };

  useEffect(() => {
    fetchPolicies();
    fetchDropdowns();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, searchTerm]);

  // When URL customer filter changes, always reset to Active to show relevant active policies first
  useEffect(() => {
    setFilterStatus('Active');
  }, [urlCustomerId]);

  const fetchDropdowns = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('id, full_name, customer_type, tc_no, vkn');
      const { data: companiesData } = await supabase.from('settings_companies').select('id, name, is_active');
      const { data: usersData } = await supabase.from('settings_users').select('id, full_name, role, roles');

      if (customersData) {
        setCustomers(customersData.map(c => ({
          ...c,
          tcNo: c.tc_no,  // Map DB tc_no → TypeScript tcNo
          vkn: c.vkn      // Map DB vkn → TypeScript vkn
        })).sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr')));
      }
      if (companiesData) {
        setCompanies(companiesData.sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      }
      if (usersData) {
        // Safe mapping
        const mappedUsers = usersData.map(u => ({
          ...u,
          roles: u.roles || (u.role ? [u.role] : [])
        }));
        setUsers(mappedUsers);
      }

      // NEW: Fetch categories and products
      const { data: categoriesData } = await supabase
        .from('insurance_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      const { data: productsData } = await supabase
        .from('insurance_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesData) setCategories(categoriesData);
      if (productsData) {
        setProducts(productsData);
        setFilteredProducts(productsData); // Initially show all
      }
    } catch (error) {
      console.error("Error fetching dropdowns", error);
    }
  }

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('policies')
          .select(`
            *,
            customer: customers(full_name),
            company: settings_companies(name, logo, domain),
            product: insurance_products(id, name_tr, category_id)
          `)
          .order('end_date', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          console.log('Fetched policies raw data:', data); // DEBUG log
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      const mappedPolicies: Policy[] = allData.map((p: any) => ({
        id: p.id,
        policyNo: p.policy_no || '',
        customerId: p.customer_id,
        companyId: p.company_id,
        customerName: p.customer?.full_name || 'Bilinmeyen Müşteri',
        company: p.company?.name || 'Bilinmeyen Şirket',
        type: p.type as InsuranceType,
        productName: p.product?.name_tr || p.type || 'Diğer',  // Use product name if available
        startDate: p.start_date,
        endDate: p.end_date,
        premium: p.premium || 0,
        commissionAmount: p.commission_amount || 0,
        status: p.status as any,
        companyLogo: p.company?.logo,
        companyDomain: p.company?.domain,
        description: p.description || '',
        salespersonId: p.salesperson_id || null,
        // Use policy's category_id, or fallback to product's category_id
        categoryId: p.category_id || p.product?.category_id || '',
        productId: p.product_id || ''
      }));

      setPolicies(mappedPolicies);
    } catch (error) {
      console.error('Error fetching policies:', error);
      // Fallback to empty or mock if critical failure, but prefer real data
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPolicy(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsAddModalOpen(true);
  };




  // --- EXCEL IMPORT LOGIC ---

  const ExcelDateToJSDate = (serial: number | string): string => {
    if (!serial) return '';
    if (typeof serial === 'string') {
      const d = new Date(serial);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return '';
    }
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR').split(' ').map(word =>
      word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
    ).join(' ');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Start reading from Row 5 (Index 4)
        const data: any[] = XLSX.utils.sheet_to_json(ws, { range: 4 });

        console.log("Raw Excel Data:", data.slice(0, 3));

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        const { data: allCompanies } = await supabase.from('settings_companies').select('id, name');

        if (!allCompanies) {
          showError('Hata', 'Şirket listesi yüklenemedi, işlem durduruldu.');
          setLoading(false);
          return;
        }

        // Fetch all existing customers to minimize DB calls
        const { data: existingCustomersData } = await supabase.from('customers').select('id, customer_type, tc_no, vkn, full_name');
        const existingCustomersMap = new Map();

        existingCustomersData?.forEach(c => {
          // Map by TC/VKN for duplicate detection
          if (c.tc_no) existingCustomersMap.set(c.tc_no.trim(), c.id);
          if (c.vkn) existingCustomersMap.set(c.vkn.trim(), c.id);
          existingCustomersMap.set(c.full_name.trim().toLocaleLowerCase('tr-TR'), c.id);
        });

        // Fetch Products & Categories for mapping
        const { data: allProducts } = await supabase.from('insurance_products').select('id, name_tr, category_id');
        const { data: allCategories } = await supabase.from('insurance_categories').select('id, name_tr');


        for (const row of data) {
          try {
            const rawName = row['Müşteri '] || row['Müşteri'];
            const tcknRaw = row['tckn '] || row['tckn'];
            const policyNo = row['poliçe numarası'] || row['poliçe no'];
            const companyName = row['şirket'] || row['sirket'];
            const policyTypeRaw = row['poliçe türü'];

            if (!rawName && !policyNo) continue;

            const customerName = toTitleCase(String(rawName || '').trim());
            const tckn = String(tcknRaw || '').trim();

            let customerId = '';

            // 1. Try to find by TCKN
            if (tckn && existingCustomersMap.has(tckn)) {
              customerId = existingCustomersMap.get(tckn);
            }
            // 2. Try to find by Name
            else if (existingCustomersMap.has(customerName.toLocaleLowerCase('tr-TR'))) {
              customerId = existingCustomersMap.get(customerName.toLocaleLowerCase('tr-TR'));
            }

            // 3. Create if not found
            if (!customerId) {
              const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                  full_name: customerName,
                  tc_kn: tckn || null,
                  phone: row['cep tel '] || '',
                  type: 'Bireysel',
                  risk_score: 50
                })
                .select('id')
                .single();

              if (createError) {
                console.error("Customer creation error:", createError);
                errorCount++;
                continue;
              }
              customerId = newCustomer.id;
              if (tckn) existingCustomersMap.set(tckn, customerId);
              existingCustomersMap.set(customerName.toLocaleLowerCase('tr-TR'), customerId);
            }

            const matchedCompany = allCompanies.find(c =>
              c.name.toLowerCase().includes(companyName?.toLowerCase()) ||
              companyName?.toLowerCase().includes(c.name.toLowerCase())
            );

            if (!matchedCompany) {
              console.warn(`Company not found for: ${companyName}, skipping policy ${policyNo}`);
              skippedCount++;
              continue;
            }

            const startDate = ExcelDateToJSDate(row['KESİM TARİHİ']);
            let endDate = ExcelDateToJSDate(row['POLİÇE VADESİ']);

            if (!endDate && startDate) {
              const d = new Date(startDate);
              d.setFullYear(d.getFullYear() + 1);
              endDate = d.toISOString().split('T')[0];
            }

            const premium = typeof row['prim '] === 'number' ? row['prim '] : parseFloat(String(row['prim ']).replace(/,/g, '') || '0');
            const commission = typeof row['gelir'] === 'number' ? row['gelir'] : parseFloat(String(row['gelir']).replace(/,/g, '') || '0');

            // Map Policy Type
            let type: InsuranceType = 'Diğer' as InsuranceType;
            const pTypeLower = (policyTypeRaw || '').toLowerCase();
            if (pTypeLower.includes('trafik')) type = InsuranceType.TRAFIK;
            else if (pTypeLower.includes('kasko')) type = InsuranceType.KASKO;
            else if (pTypeLower.includes('konut')) type = InsuranceType.KONUT;
            else if (pTypeLower.includes('dask')) type = InsuranceType.KONUT;
            else if (pTypeLower.includes('işyeri') || pTypeLower.includes('isyeri')) type = InsuranceType.ISYERI;
            else if (pTypeLower.includes('sağlık') || pTypeLower.includes('saglik')) type = InsuranceType.SAGLIK;
            else if (pTypeLower.includes('seyahat')) type = InsuranceType.SEYAHAT;

            // Try to resolve Product & Category
            let productId = null;
            let categoryId = null;

            if (allProducts && allCategories) {
              // 1. Try to find product by Name matching 'poliçe türü' or explicit 'ürün' column
              const productNameSearch = (row['ürün'] || row['ürün adı'] || policyTypeRaw || '').toLowerCase();

              // fuzzy match attempt
              const matchedProduct = allProducts.find(p =>
                p.name_tr.toLowerCase() === productNameSearch ||
                productNameSearch.includes(p.name_tr.toLowerCase())
              );

              if (matchedProduct) {
                productId = matchedProduct.id;
                categoryId = matchedProduct.category_id;
              } else {
                // Fallback: Try to map generic types to categories directly if no product found
                // (Simple heuristic based on type enum)
                // ... (logic can be expanded)
              }
            }

            const { error: insertError } = await supabase.from('policies').insert({
              policy_no: policyNo,
              customer_id: customerId,
              company_id: matchedCompany.id,
              type: type,
            });

          } catch (err) { }
        }
      } catch (error) { }
    };
    reader.readAsBinaryString(file);
  };

  // Stats Calculation
  // Use derived status for stats
  const stats = {
    total: policies.length,
    active: policies.filter(p => getPolicyStatus(p) === 'Active').length,
    renewalsBytes: policies.filter(p => {
      const derived = getPolicyStatus(p);
      if (derived !== 'Active') return false;
      const end = new Date(p.endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length,
    expired: policies.filter(p => getPolicyStatus(p) === 'Expired').length,
    potential: policies.filter(p => getPolicyStatus(p) === 'Potential').length
  };


  // Derived Products for Filter (Only products with Active policies)
  const validActiveProducts = React.useMemo(() => {
    const activePolicies = policies.filter(p => getPolicyStatus(p) === 'Active');
    const activeProductIds = new Set(activePolicies.map(p => p.productId));
    // Filter products: must be active AND exist in active policies
    return products.filter(p => activeProductIds.has(p.id));
  }, [policies, products]);

  const filteredPolicies = React.useMemo(() => {
    return policies.filter(policy => {
      // If URL has customerId, strictly filter by it
      if (urlCustomerId && String(policy.customerId) !== String(urlCustomerId)) return false;

      const derivedStatus = getPolicyStatus(policy);
      const matchesSearch =
        policy.policyNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (policy.company && policy.company.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filterStatus === 'All' || derivedStatus === filterStatus;

      // New Filters Logic (Enhanced)
      // If policy definition doesn't have a category saved, try to find it from the product definition
      let effectiveCategoryId = policy.categoryId;
      if (!effectiveCategoryId && policy.productId) {
        const prod = products.find(p => p.id === policy.productId);
        if (prod) effectiveCategoryId = prod.category_id;
      }

      // Fallback: If still no ID, try to map from Type String (Legacy Data Support)
      if (!effectiveCategoryId && !policy.productId && policy.type) {
        const pType = (policy.type || '').toLowerCase();
        // Heuristic mapping
        if (pType.includes('hayat')) {
          const c = categories.find(cat => cat.name_tr.toLowerCase().includes('hayat'));
          if (c) effectiveCategoryId = c.id;
        } else if (pType.includes('sağlık') || pType.includes('saglik') || pType.includes('tamamlayıcı')) {
          const c = categories.find(cat => cat.name_tr.toLowerCase().includes('sağlık'));
          if (c) effectiveCategoryId = c.id;
        } else if (pType.includes('trafik') || pType.includes('kasko')) {
          const c = categories.find(cat => cat.name_tr.toLowerCase().includes('araç') || cat.name_tr.toLowerCase().includes('oto'));
          if (c) effectiveCategoryId = c.id;
        } else if (pType.includes('konut') || pType.includes('dask') || pType.includes('işyeri')) {
          const c = categories.find(cat => cat.name_tr.toLowerCase().includes('konut') || cat.name_tr.toLowerCase().includes('yangın'));
          if (c) effectiveCategoryId = c.id;
        }
      }

      const matchesBranch = filterBranch === 'All' || effectiveCategoryId === filterBranch;
      const matchesProduct = filterProduct === 'All' || policy.productId === filterProduct;

      return matchesSearch && matchesStatus && matchesBranch && matchesProduct;
    }).sort((a, b) => {
      if (sortOrder === 'ExpiringSoon' || sortOrder === 'Default') {
        const daysA = getDaysRemaining(a.endDate);
        const daysB = getDaysRemaining(b.endDate);
        return daysA - daysB;
      }
      if (sortOrder === 'A-Z') return a.customerName.localeCompare(b.customerName, 'tr');
      if (sortOrder === 'Z-A') return b.customerName.localeCompare(a.customerName, 'tr');
      return 0;
    });
  }, [policies, searchTerm, filterStatus, filterBranch, filterProduct, sortOrder, urlCustomerId]);

  // Calculate Pagination
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);
  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPolicyIcon = (policy: Policy) => {
    // 1. Determine effective text for matching
    let textToMatch = '';

    // Try Product Name first
    const product = products.find(p => p.id === policy.productId);
    if (product) textToMatch = product.name_tr;

    // Try Category Name second
    if (!textToMatch) {
      const category = categories.find(c => c.id === policy.categoryId);
      if (category) textToMatch = category.name_tr;
    }

    // Fallback to Type
    if (!textToMatch) textToMatch = policy.type || '';

    const t = textToMatch.toLocaleLowerCase('tr-TR');

    // 2. Return appropriate icon with GRAY styling (text-slate-500)
    const iconClass = "w-5 h-5 text-slate-500 dark:text-slate-400"; // Unified Gray Color

    if (t.includes('araç') || t.includes('oto') || t.includes('trafik') || t.includes('kasko') || t.includes('plaka'))
      return <Car className={iconClass} />;

    if (t.includes('konut') || t.includes('evim') || t.includes('dask') || t.includes('yangın') || t.includes('deprem') || t.includes('eşya'))
      return <Home className={iconClass} />;

    if (t.includes('sağlık') || t.includes('tedavi') || t.includes('medikal') || t.includes('tamamlayıcı'))
      return <Heart className={iconClass} />;

    if (t.includes('hayat') || t.includes('yaşam') || t.includes('emeklilik') || t.includes('bes'))
      return <Umbrella className={iconClass} />; // Umbrella or Activity for Life

    if (t.includes('seyahat') || t.includes('vize') || t.includes('yurtdışı'))
      return <Plane className={iconClass} />;

    if (t.includes('işyeri') || t.includes('esnaf') || t.includes('kobi') || t.includes('ofis'))
      return <Building2 className={iconClass} />;

    if (t.includes('nakliyat') || t.includes('tekne') || t.includes('yat') || t.includes('emtia'))
      return <Ship className={iconClass} />;

    if (t.includes('sorumluluk') || t.includes('ferdi kaza') || t.includes('hukuksal'))
      return <Shield className={iconClass} />;

    if (t.includes('mühendislik') || t.includes('elektronik') || t.includes('montaj'))
      return <Activity className={iconClass} />;

    return <FileText className={iconClass} />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Header & Stats */}
      {/* Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* 1. Yaklaşan Yenilemeler */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-brand-accent/30 dark:border-brand-accent/30 md:col-span-1 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-accent/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="text-brand-accent text-xs font-semibold uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> Yaklaşan Yenilemeler
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.renewalsBytes.toLocaleString('tr-TR')}</div>
          <div className="text-xs text-slate-400 mt-1">Gelecek 30 gün içinde</div>
        </div>

        {/* 2. Potansiyel İşler */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 md:col-span-1 hover:shadow-md transition-all">
          <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase">Potansiyel İşler</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.potential.toLocaleString('tr-TR')}</div>
        </div>

        {/* 3. Aktif Poliçeler */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 md:col-span-1 hover:shadow-md transition-all">
          <div className="text-green-600 dark:text-green-400 text-xs font-semibold uppercase">Aktif Poliçeler</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.active.toLocaleString('tr-TR')}</div>
        </div>

        {/* 4. Toplam Poliçe */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 md:col-span-1 hover:shadow-md transition-all">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">Toplam Poliçe</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stats.total.toLocaleString('tr-TR')}</div>
        </div>

        {/* 5. Poliçe Ekle Butonu */}
        <button
          onClick={openAddModal}
          className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-2 border-dashed border-slate-300 dark:border-slate-600 md:col-span-1 flex flex-col items-center justify-center text-slate-500 hover:text-brand-primary hover:border-brand-primary hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-brand-primary group-hover:text-white flex items-center justify-center mb-1 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-medium text-xs">Poliçe Ekle</span>
        </button>

        {/* Hidden Excel Input (Functionality kept, UI hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".xlsx, .xls"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Poliçe, Müşteri, Şirket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-std pl-9 text-xs h-9"
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg overflow-hidden hidden sm:flex">
            {(['Active', 'Potential', 'Expired', 'All'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`btn-sm text-xs px-3 h-8 transition-all ${filterStatus === s
                  ? 'btn-primary shadow-sm'
                  : 'btn-ghost text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
              >
                {s === 'All' ? 'Tümü' : (s === 'Active' ? 'Aktif' : (s === 'Expired' ? 'Süresi Biten' : 'Potansiyel'))}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">

          {/* Branch Filter */}
          <select
            value={filterBranch}
            onChange={(e) => {
              setFilterBranch(e.target.value);
              setFilterProduct('All'); // Reset product when branch changes
            }}
            className="select-std cursor-pointer min-w-[150px] text-xs h-9 py-0"
          >
            <option value="All">Tüm Branşlar</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_tr}</option>
            ))}
          </select>

          {/* Product Filter */}
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="select-std cursor-pointer min-w-[200px] text-xs h-9 py-0"
          >
            <option value="All">Tüm Ürünler</option>
            {validActiveProducts
              .filter(p => filterBranch === 'All' || p.category_id === filterBranch)
              .sort((a, b) => a.name_tr.localeCompare(b.name_tr, 'tr'))
              .map(p => (
                <option key={p.id} value={p.id}>{p.name_tr}</option>
              ))}
          </select>

        </div>
      </div>

      {/* Policies List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-brand-primary w-8 h-8" />
          </div>
        ) : filteredPolicies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-24">Durum</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Poliçe Tür / No</th>
                  <th
                    className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group select-none"
                    onClick={() => setSortOrder(prev => prev === 'A-Z' ? 'Z-A' : 'A-Z')}
                  >
                    <div className="flex items-center gap-1">
                      Müşteri Adı
                      {sortOrder === 'A-Z' && <ArrowDownAZ className="w-3 h-3 text-brand-primary" />}
                      {sortOrder === 'Z-A' && <ArrowUpZA className="w-3 h-3 text-brand-primary" />}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Sigorta Şirketi</th>
                  <th
                    className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none"
                    onClick={() => setSortOrder('ExpiringSoon')}
                  >
                    <div className="flex items-center gap-1">
                      Bitiş Tarihi
                      {sortOrder === 'ExpiringSoon' && <Clock className="w-3 h-3 text-brand-primary" />}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Prim</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-16">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-4">
                      {(() => {
                        const status = getPolicyStatus(policy);
                        if (status === 'Active') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">Aktif</span>;
                        if (status === 'Expired') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">Süresi Doldu</span>;
                        if (status === 'Potential') return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">Potansiyel</span>;
                        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700">İptal</span>;
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-white group-hover:text-brand-primary transition-colors shadow-sm">
                          {getPolicyIcon(policy)}
                        </div>
                        <div className="flex flex-col">
                          {(() => {
                            const product = products.find(p => p.id === policy.productId);
                            if (product) return <div className="font-medium text-slate-800 dark:text-white text-sm">{product.name_tr}</div>;

                            const category = categories.find(c => c.id === policy.categoryId);
                            if (category) return <div className="font-medium text-slate-800 dark:text-white text-sm">{category.name_tr}</div>;

                            return <div className="font-medium text-slate-800 dark:text-white text-sm">{policy.productName || policy.type}</div>;
                          })()}
                          <div className="font-mono text-[10px] text-slate-400">{policy.policyNo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-primary/5 text-brand-primary flex items-center justify-center text-[10px] font-bold ring-1 ring-slate-100 dark:ring-slate-700">
                          {policy.customerName.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">{policy.customerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const companyName = policy.company;
                          const dbLogo = policy.companyLogo;

                          // Priority:
                          // 1. Explicit Logo URL from DB
                          // 2. Clearbit Logo from DB Domain
                          // 3. Initials Fallback (ui-avatars)

                          let logoUrl = dbLogo;
                          if (!logoUrl && policy.companyDomain) {
                            logoUrl = `https://logo.clearbit.com/${policy.companyDomain}`;
                          }

                          const fallbackLogoUrl = `https://ui-avatars.com/api/?name=${companyName}&background=f1f5f9&color=64748b`;

                          return (
                            <>
                              <div className="w-6 h-6 rounded-md bg-white border border-slate-100 flex items-center justify-center overflow-hidden p-0.5">
                                <img
                                  src={logoUrl || fallbackLogoUrl}
                                  alt={companyName}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src !== fallbackLogoUrl) {
                                      target.src = fallbackLogoUrl;
                                    }
                                  }}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{companyName}</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const daysLeft = getDaysRemaining(policy.endDate);
                        const isExpiring = daysLeft <= 30 && daysLeft > 0;
                        const isExpired = daysLeft <= 0;
                        return (
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-800 dark:text-white flex items-center gap-1.5">
                              {new Date(policy.endDate).toLocaleDateString('tr-TR')}
                            </span>
                            <span className={`text-[10px] mt-0.5 font-medium ${isExpiring ? 'text-red-500 animate-pulse' : isExpired ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isExpired ? 'Süresi Doldu' : `${daysLeft} gün kaldı`}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-slate-800 dark:text-white text-sm">₺{policy.premium.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-brand-secondary">Kom: ₺{policy.commissionAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => openEditModal(policy)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 hover:bg-brand-primary/10 text-brand-primary transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Toplam {filteredPolicies.length} poliçeden {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPolicies.length)} arası gösteriliyor
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
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 2 + i;
                        if (p > totalPages) p = 100000;
                      }
                      return p <= totalPages ? p : null;
                    }).filter(Boolean).map((p: any) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${currentPage === p ? 'bg-brand-primary text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
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
          </div>

        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white">Poliçe Bulunamadı</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Veritabanınızda kayıtlı poliçe yok.
              <br />
              "Hızlı Poliçe Ekle" veya "Excel Yükle" butonunu kullanarak veri girişi yapabilirsiniz.
            </p>
            {filterStatus === 'Potential' && (
              <p className="text-xs text-purple-500 mt-2">Henüz potansiyel iş fırsatı eklenmemiş.</p>
            )}
          </div>
        )}
      </div >

      {/* Add Policy Modal */}
      <PolicyFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchPolicies();
          setIsAddModalOpen(false);
        }}
        policyToEdit={editingPolicy}
        customers={customers}
        companies={companies}
        users={users}
        categories={categories}
        products={products}
        onNavigate={onNavigate}
      />
    </div >
  );
};
