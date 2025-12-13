import React, { useState, useEffect } from 'react';
import {
    X, Users2, Settings, Plus, User, ChevronRight, UserPlus, Phone, Mail, CheckCircle, Loader2
} from 'lucide-react';
import { Customer, FamilyGroup } from '../../types';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { SearchableSelect } from '../ui/SearchableSelect';
import { formatPhoneNumber } from '../../lib/utils';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit: Customer | null;
    onSuccess: () => void;
    families: FamilyGroup[];
    customers: Customer[]; // For duplicate check and contact person
    onManageFamilies: () => void;
    onAddFamily: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
    isOpen,
    onClose,
    customerToEdit,
    onSuccess,
    families,
    customers,
    onManageFamilies,
    onAddFamily
}) => {
    // Local interface for form state
    interface CustomerFormData {
        type: 'Bireysel' | 'Kurumsal';
        customerType: 'BIREYSEL' | 'KURUMSAL';
        riskScore: number;
        tags: string[];
        tcKn: string;
        tcNo?: string | null;
        vkn?: string | null;
        taxOffice?: string;
        fullName?: string;
        email?: string;
        phone?: string;
        familyGroupId?: string | null;
        contactPersonId?: string | null;
        contactPerson?: string;
    }

    const { showToast, showSuccess, showError } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<CustomerFormData>({
        type: 'Bireysel',
        customerType: 'BIREYSEL',
        riskScore: 10,
        tags: [],
        tcKn: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (customerToEdit) {
                setFormData({
                    type: customerToEdit.customerType === 'BIREYSEL' ? 'Bireysel' : 'Kurumsal',
                    customerType: customerToEdit.customerType === 'BIREYSEL' ? 'BIREYSEL' : 'KURUMSAL',
                    riskScore: customerToEdit.riskScore || 10,
                    tags: customerToEdit.tags || [],
                    tcKn: customerToEdit.tcNo || customerToEdit.vkn || '',
                    tcNo: customerToEdit.tcNo,
                    vkn: customerToEdit.vkn,
                    taxOffice: customerToEdit.taxOffice,
                    fullName: customerToEdit.fullName,
                    email: customerToEdit.email,
                    phone: customerToEdit.phone,
                    familyGroupId: customerToEdit.familyGroupId,
                    contactPersonId: customerToEdit.contactPersonId
                });
            } else {
                setFormData({
                    type: 'Bireysel',
                    customerType: 'BIREYSEL',
                    riskScore: 10,
                    tags: [],
                    tcKn: ''
                });
            }
        }
    }, [isOpen, customerToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate TCKN/Vergi No
        const isDuplicate = customers.some(c => (c.tcNo || c.vkn) === formData.tcKn && c.id !== customerToEdit?.id);
        if (isDuplicate) {
            showToast('Hata', 'Bu TC Kimlik / Vergi No ile kayıtlı başka bir müşteri bulunmaktadır.', 'error');
            return;
        }

        setIsLoading(true);

        const customerData = {
            customer_no: customerToEdit ? undefined : `GH-${Math.floor(1000 + Math.random() * 9000)}`,
            customer_type: formData.type === 'Bireysel' ? 'BIREYSEL' : 'KURUMSAL',
            tc_no: formData.type === 'Bireysel' ? formData.tcKn : null,
            vkn: formData.type === 'Kurumsal' ? formData.tcKn : null,
            contact_person_id: formData.type === 'Kurumsal' ? formData.contactPersonId : null,
            tax_office: formData.taxOffice,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            risk_score: formData.riskScore,
            family_group_id: formData.familyGroupId || null,
        };

        try {
            if (customerToEdit) {
                const { error } = await supabase
                    .from('customers')
                    .update(customerData)
                    .eq('id', customerToEdit.id);
                if (error) throw error;
                showSuccess('Başarılı', 'Müşteri başarıyla güncellendi.');
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([customerData]);
                if (error) throw error;
                showSuccess('Başarılı', 'Yeni müşteri eklendi.');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving customer:', error);
            showError('Hata', 'Müşteri kaydedilemedi.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-1 space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Müşteri Tipi</label>
                            <div className="relative">
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
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
                                        value={formData.familyGroupId || ''}
                                        onChange={e => setFormData({ ...formData, familyGroupId: e.target.value || null })}
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
                                    onClick={onManageFamilies}
                                    className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                    title="Aile Gruplarını Yönet"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={onAddFamily}
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
                                value={formData.fullName || ''}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                className="input-std"
                                placeholder="Müşteri Adı Soyadı"
                            />
                            <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {formData.type === 'Kurumsal' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Yetkili Kişi</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <SearchableSelect
                                        options={customers
                                            .filter(c => c.customerType === 'BIREYSEL')
                                            .map(c => ({ value: c.id, label: `${c.fullName} (${c.tcNo || c.vkn || 'TC Yok'})` }))
                                            .sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'))}
                                        value={formData.contactPersonId || customers.find(c => c.fullName === formData.contactPerson)?.id || ''}
                                        onChange={(val) => {
                                            setFormData({ ...formData, contactPersonId: val });
                                        }}
                                        placeholder={typeof formData.contactPerson === 'string' ? formData.contactPerson : "Seçiniz..."}
                                        className="w-full"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, type: 'Bireysel', riskScore: 10, tags: [] });
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

                    {formData.type === 'Kurumsal' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Vergi Dairesi</label>
                            <input
                                type="text"
                                value={formData.taxOffice || ''}
                                onChange={e => setFormData({ ...formData, taxOffice: e.target.value })}
                                className="input-std"
                                placeholder="Örn: Kadıköy"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                {formData.type === 'Bireysel' ? 'TC Kimlik No' : 'VKN / Vergi No'}
                            </label>
                            <input
                                required type="text"
                                maxLength={formData.type === 'Bireysel' ? 11 : 10}
                                value={formData.tcKn || ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData({
                                        ...formData,
                                        tcKn: val,
                                        tcNo: formData.type === 'Bireysel' ? val : formData.tcNo,
                                        vkn: formData.type === 'Kurumsal' ? val : formData.vkn
                                    })
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400 font-mono"
                                placeholder={formData.type === 'Bireysel' ? "12345678901" : "1234567890"}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Telefon</label>
                            <div className="relative">
                                <input
                                    required type="text"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
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
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="input-std"
                                placeholder="ornek@email.com"
                            />
                            <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4 items-center">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
};
