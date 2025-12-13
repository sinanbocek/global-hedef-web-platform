import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Trash2, AlertTriangle, Plus, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { SearchableSelect } from './ui/SearchableSelect';
import { DatePicker } from './ui/DatePicker';
import { Policy, InsuranceType } from '../types';

interface PolicyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    policyToEdit?: Policy | null;
    // Dropdown data passed from parent to avoid refetching
    customers: { id: string; full_name: string; tcNo?: string; vkn?: string; }[];
    companies: { id: string; name: string; is_active: boolean }[];
    users: { id: string; full_name: string; role?: string; roles?: string[] }[];
    categories: { id: string; code: string; name_tr: string }[];
    products: { id: string; category_id: string; code: string; name_tr: string }[];
    onNavigate?: (page: string) => void;
}

export const PolicyFormModal: React.FC<PolicyFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    policyToEdit,
    customers,
    companies,
    users,
    categories,
    products,
    onNavigate
}) => {
    const { showSuccess, showError } = useToast();
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Filtered products based on selected category
    const [filteredProducts, setFilteredProducts] = useState<{ id: string, category_id: string, code: string, name_tr: string }[]>([]);

    const [formData, setFormData] = useState({
        customerId: '',
        companyId: '',
        categoryId: '',
        productId: '',
        type: 'Trafik Sigortası' as InsuranceType,
        salespersonId: '',
        policyNo: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        premium: 0,
        commissionAmount: 0,
        status: 'Active' as 'Active' | 'Potential',
        description: ''
    });

    // Effect to reset or populate form when modal opens or policyToEdit changes
    useEffect(() => {
        if (isOpen) {
            if (policyToEdit) {
                // EDIT MODE
                setFormData({
                    customerId: policyToEdit.customerId || '',
                    companyId: policyToEdit.companyId || '',
                    categoryId: policyToEdit.categoryId || '',
                    productId: policyToEdit.productId || '',
                    type: policyToEdit.type,
                    policyNo: policyToEdit.policyNo,
                    startDate: policyToEdit.startDate,
                    endDate: policyToEdit.endDate,
                    premium: policyToEdit.premium,
                    commissionAmount: policyToEdit.commissionAmount || 0,
                    status: policyToEdit.status as any,
                    description: policyToEdit.description || '',
                    salespersonId: policyToEdit.salespersonId || ''
                });

                // Setup filtered products
                const sortedProducts = [...products].sort((a, b) => a.name_tr.localeCompare(b.name_tr, 'tr'));
                if (policyToEdit.categoryId) {
                    setFilteredProducts(sortedProducts.filter(p => p.category_id === policyToEdit.categoryId));
                } else {
                    setFilteredProducts(sortedProducts);
                }

            } else {
                // CREATE MODE - RESET
                setFormData({
                    customerId: '',
                    companyId: '',
                    categoryId: '',
                    productId: '',
                    type: 'Trafik Sigortası' as InsuranceType,
                    salespersonId: '',
                    policyNo: '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    premium: 0,
                    commissionAmount: 0,
                    status: 'Active' as 'Active' | 'Potential',
                    description: ''
                });
                setFilteredProducts(products);
            }
            setDeleteConfirmId(null);
        }
    }, [isOpen, policyToEdit, products]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalPolicyNo = formData.policyNo;

            // Auto-generate Policy No for Potential Policies if empty
            if (formData.status === 'Potential' && !finalPolicyNo) {
                finalPolicyNo = `POT-${Date.now().toString().slice(-6)}`;
            }

            if (!finalPolicyNo) {
                showError('Hata', 'Poliçe numarası zorunludur.');
                setLoading(false);
                return;
            }

            const policyPayload = {
                policy_no: finalPolicyNo,
                customer_id: formData.customerId || null,
                company_id: formData.companyId || null,
                product_id: formData.productId || null,
                category_id: formData.categoryId || null,
                type: formData.type,
                start_date: formData.startDate,
                end_date: formData.endDate,
                premium: formData.premium,
                commission_amount: formData.commissionAmount,
                status: formData.status,
                description: formData.description,
                salesperson_id: formData.salespersonId || null
            };

            if (policyToEdit) {
                const { error } = await supabase.from('policies').update(policyPayload).eq('id', policyToEdit.id);
                if (error) throw error;
                showSuccess('Başarılı', 'Poliçe başarıyla güncellendi.');
            } else {
                const { error } = await supabase.from('policies').insert(policyPayload);
                if (error) throw error;
                showSuccess('Başarılı', 'Yeni poliçe oluşturuldu.');
            }

            onSuccess();
        } catch (error) {
            console.error("Error saving policy:", error);
            const errorMessage = (error as any)?.message || 'Beklenmedik bir hata oluştu.';
            showError('Hata', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!policyToEdit) return;
        try {
            const { error } = await supabase.from('policies').delete().eq('id', policyToEdit.id);
            if (error) throw error;
            showSuccess('Silindi', 'Poliçe başarıyla silindi.');
            onSuccess();
        } catch (error) {
            showError('Hata', "Silme işlemi başarısız.");
        }
    };

    const hasRole = (user: any, roleToCheck: string) => {
        if (user.roles && Array.isArray(user.roles)) return user.roles.includes(roleToCheck);
        if (user.role === roleToCheck) return true;
        return false;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                        </div>
                        {policyToEdit ? 'Poliçe Düzenle' : 'Yeni Poliçe Ekle'}
                    </h3>
                    <button onClick={onClose} className="btn-icon rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-0 relative">
                    {/* Delete Confirmation Overlay */}
                    {deleteConfirmId && (
                        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 flex items-center justify-center p-6 animate-in fade-in duration-200">
                            <div className="max-w-md w-full text-center space-y-4">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-white">Poliçeyi Silmek İstiyor musunuz?</h4>
                                <p className="text-slate-500 dark:text-slate-400">Bu işlem geri alınamaz. Poliçe ve ilgili finansal kayıtlar kalıcı olarak silinecektir.</p>

                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="btn-ghost px-6 py-2.5 bg-slate-100 dark:bg-slate-800"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="btn-danger px-6 py-2.5 shadow-lg shadow-red-600/20"
                                    >
                                        Evet, Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row h-[600px]">
                        {/* Left: Main Details */}
                        <div className="flex-1 p-6 space-y-3 overflow-y-auto border-r border-slate-100 dark:border-slate-700 custom-scrollbar">
                            <div className="space-y-3">

                                {/* Status Toggle */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Poliçe Durumu</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: 'Active' })}
                                            className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${formData.status === 'Active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Aktif Poliçe
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: 'Potential' })}
                                            className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${formData.status === 'Potential' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Potansiyel
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Policy No & Salesperson */}
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Poliçe No {formData.status === 'Potential' && <span className="text-[10px] text-slate-300 font-normal normal-case">(Otomatik)</span>}</label>
                                        <input
                                            required={formData.status !== 'Potential'}
                                            type="text"
                                            value={formData.policyNo}
                                            onChange={e => setFormData({ ...formData, policyNo: e.target.value })}
                                            className="input-std font-mono py-1.5"
                                            placeholder={formData.status === 'Potential' ? "Otomatik" : "POL-..."}
                                        />
                                    </div>
                                    <div className="col-span-8 space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Satış Temsilcisi</label>
                                        <select
                                            value={formData.salespersonId}
                                            onChange={e => setFormData({ ...formData, salespersonId: e.target.value })}
                                            className="select-std py-1.5"
                                        >
                                            <option value="">Seçiniz...</option>
                                            {users
                                                .filter(u => hasRole(u, 'Satışçı'))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Category & Product */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Branş</label>
                                        <select
                                            value={formData.categoryId}
                                            onChange={e => {
                                                const catId = e.target.value;

                                                // Sort products alphabetically
                                                const sortedProducts = [...products].sort((a, b) => a.name_tr.localeCompare(b.name_tr, 'tr'));

                                                // Filter
                                                const nextProducts = catId
                                                    ? sortedProducts.filter(p => p.category_id === catId)
                                                    : sortedProducts;

                                                setFilteredProducts(nextProducts);
                                                setFormData({ ...formData, categoryId: catId, productId: '' });
                                            }}
                                            className="select-std w-full h-[42px]"
                                        >
                                            <option value="">Branş Seçiniz</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_tr}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Ürün</label>
                                        <SearchableSelect
                                            options={filteredProducts.map(p => ({ value: p.id, label: p.name_tr }))}
                                            value={formData.productId}
                                            onChange={(val) => setFormData({ ...formData, productId: val })}
                                            placeholder="Ürün Seçiniz..."
                                        />
                                        {!formData.categoryId && (
                                            <p className="text-[10px] text-amber-500 ml-1">Önce branş seçiniz</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Müşteri</label>
                                        <button type="button" onClick={() => {
                                            if (onNavigate) {
                                                // Use localStorage flag to open modal on customers page
                                                localStorage.setItem('openNewCustomerModal', 'true');
                                                onNavigate('customers');
                                            } else {
                                                window.location.hash = '#/customers';
                                            }
                                        }} className="text-[10px] text-brand-primary hover:underline flex items-center gap-1 font-medium bg-brand-primary/5 px-2 py-0.5 rounded-full hover:bg-brand-primary/10 transition-colors">
                                            <Plus className="w-3 h-3" /> Yeni Müşteri Ekle
                                        </button>
                                    </div>
                                    <SearchableSelect
                                        options={customers.map(c => ({ value: c.id, label: `${c.full_name} ${(c.tcNo || c.vkn) ? `(${c.tcNo || c.vkn})` : ''}` }))}
                                        value={formData.customerId}
                                        onChange={(val) => setFormData({ ...formData, customerId: val })}
                                        placeholder="Müşteri Seçin..."
                                    />
                                </div>

                                {/* Row 4: Company & Note */}
                                <div className="grid grid-cols-12 gap-4 items-start">
                                    <div className="col-span-12 space-y-1">
                                        <div className="flex justify-between items-center pr-1">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Sigorta Şirketi</label>
                                        </div>
                                        <SearchableSelect
                                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                                            value={formData.companyId}
                                            onChange={(val) => setFormData({ ...formData, companyId: val })}
                                            placeholder="Şirket Seçin..."
                                        />
                                    </div>

                                    <div className="col-span-12 space-y-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Not / Açıklama</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="input-std min-h-[80px] py-2 resize-none"
                                            placeholder="Poliçe notu..."
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                        {/* Right: Financial & Dates */}
                        <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col justify-between border-l border-slate-100 dark:border-slate-700">
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Başlangıç Tarihi</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <DatePicker
                                            value={formData.startDate}
                                            onChange={(date) => setFormData({ ...formData, startDate: date })}
                                            placeholder="Başlangıç"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Bitiş Tarihi</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <DatePicker
                                            value={formData.endDate}
                                            onChange={(date) => setFormData({ ...formData, endDate: date })}
                                            placeholder="Bitiş"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <hr className="border-slate-200 dark:border-slate-700" />

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Prim Tutarı (₺)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input-std font-bold text-right"
                                        placeholder="0.00"
                                        value={formData.premium === 0 ? '' : formData.premium}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            setFormData({ ...formData, premium: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Komisyon (₺)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input-std font-medium text-brand-secondary text-right"
                                        placeholder="0.00"
                                        value={formData.commissionAmount === 0 ? '' : formData.commissionAmount}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            setFormData({ ...formData, commissionAmount: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-6">
                                <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-bold shadow-lg flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Kaydet
                                </button>

                                {policyToEdit && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setDeleteConfirmId(policyToEdit.id);
                                        }}
                                        className="btn-danger w-full py-3 font-medium flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Poliçeyi Sil
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
