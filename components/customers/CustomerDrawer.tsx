import React, { useState } from 'react';
import {
    X, Edit, Trash2, Calendar, FileText, CheckCircle, ExternalLink,
    Plus, Car, Home, Building2, Zap, MessageCircle, User, Tag, Users2
} from 'lucide-react';
import { Customer, CustomerAsset, CustomerNote, InsuranceType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { toTitleCase, formatNumberInput } from '../../lib/utils';
import { MOCK_POLICIES } from '../../constants';

interface CustomerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCustomer: Customer | null;
    onUpdateCustomer: (updated: Customer) => void;
    onDeleteCustomer: (id: string) => void;
    onEditCustomer: (customer: Customer) => void;
    onNavigate?: (page: string) => void;
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
    isOpen, onClose, selectedCustomer, onUpdateCustomer, onDeleteCustomer, onEditCustomer, onNavigate
}) => {
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'assets' | 'policies' | 'notes'>('profile');

    // Local UI State for Tags
    const [isTagInputVisible, setIsTagInputVisible] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    // Local UI State for Notes
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [newNote, setNewNote] = useState<Partial<CustomerNote>>({ type: 'Not' });

    // Local UI State for Assets
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isEditAssetMode, setIsEditAssetMode] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [newAsset, setNewAsset] = useState<Partial<CustomerAsset>>({});
    const [assetDisplayValue, setAssetDisplayValue] = useState('');


    if (!isOpen || !selectedCustomer) return null;

    const customerPolicies = selectedCustomer.policies || [];
    const totalPremium = customerPolicies.reduce((sum, p) => sum + p.premium, 0);

    // --- ACTIONS ---

    // Tag Actions
    const handleAddTag = async (tagToAdd?: string) => {
        const finalTag = tagToAdd || newTag.trim();
        if (!selectedCustomer || !finalTag) return;
        if (selectedCustomer.tags.includes(finalTag)) return;
        const newTags = [...selectedCustomer.tags, finalTag];
        try {
            const { error } = await supabase.from('customers').update({ tags: newTags }).eq('id', selectedCustomer.id);
            if (error) throw error;
            onUpdateCustomer({ ...selectedCustomer, tags: newTags });
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
            onUpdateCustomer({ ...selectedCustomer, tags: newTags });
        } catch (error) {
            console.error(error);
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
            onUpdateCustomer({ ...selectedCustomer, notes: updatedNotes });
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
            onUpdateCustomer({ ...selectedCustomer, notes: updatedNotes });
        } catch (error) {
            showError('Hata', 'Not silinemedi.');
        }
    };

    // Asset Actions
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

            // Need fresh fetch? Or just local update? 
            // Ideally we fetch the new asset to get ID.
            // But for Quick fix, let's fetch customer fresh data in parent? 
            // Or select single here.
            const { data } = await supabase.from('customers').select('*, assets:customer_assets(*), notes:customer_notes(*), family_group:family_groups(*)').eq('id', selectedCustomer.id).single();
            if (data) {
                const formatted: Customer = {
                    ...selectedCustomer,
                    assets: data.assets.map((a: any) => ({
                        id: a.id, type: a.type, description: a.description, details: a.details, value: a.value, uavtCode: a.uavt_code
                    }))
                };
                onUpdateCustomer(formatted);
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
            onUpdateCustomer({ ...selectedCustomer, assets: updatedAssets });
        } catch (error) {
            showError('Hata', 'Varlık silinemedi.');
        }
    };

    const handleQuickQuote = (asset: CustomerAsset, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedCustomer || !onNavigate) return;

        const draftData = {
            tcKn: selectedCustomer.tcNo || selectedCustomer.vkn, // Updated field usage
            phone: selectedCustomer.phone,
            plate: asset.type === 'Araç' ? asset.description : '',
            email: selectedCustomer.email,
            insuranceType: asset.type === 'Araç' ? InsuranceType.TRAFIK : (asset.type === 'Konut' ? InsuranceType.KONUT : InsuranceType.ISYERI)
        };

        localStorage.setItem('quote_draft_data', JSON.stringify(draftData));
        onNavigate('quote');
    };

    const getAssetPolicyStatus = (asset: CustomerAsset) => {
        // This expects MOCK_POLICIES or real policies?
        // Using prop customerPolicies is better if available, but for now filtering all.
        // The previous code used MOCK_POLICIES. Let's try to use customerPolicies if possible?
        // But customerPolicies might not have "customerId" field populated if it's nested?
        // Let's stick to existing logic for safety, but check customerPolicies too.
        const activeCustomerPolicies = customerPolicies.filter(p => p.status === 'Active');

        if (asset.type === 'Araç') {
            return activeCustomerPolicies.some(p => p.type === InsuranceType.TRAFIK || p.type === InsuranceType.KASKO);
        }
        if (asset.type === 'Konut') {
            return activeCustomerPolicies.some(p => p.type === InsuranceType.KONUT);
        }
        if (asset.type === 'İşyeri') {
            return activeCustomerPolicies.some(p => p.type === InsuranceType.ISYERI);
        }
        return false;
    };

    const filteredTags = ['Vip', 'Riskli', 'Ödeme Sorunu', 'Referanslı', 'Yeni'].filter(t =>
        t.toLowerCase().includes(newTag.toLowerCase()) && !selectedCustomer.tags.includes(t)
    );


    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-50">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{toTitleCase(selectedCustomer.fullName)}</h2>
                                {selectedCustomer.phone && (
                                    <a
                                        href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                                        title="WhatsApp ile mesaj gönder"
                                    >
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                        WhatsApp
                                    </a>
                                )}
                                {selectedCustomer.familyGroup && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 text-indigo-700 bg-transparent dark:border-indigo-700 dark:text-indigo-400">
                                        <Users2 className="w-3 h-3 mr-1.5 opacity-70" />
                                        {selectedCustomer.familyGroup.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-4">
                                <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">#{selectedCustomer.customerNo}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 relative z-50">
                            <button onClick={() => onEditCustomer(selectedCustomer)} className="btn-icon rounded-full"><Edit className="w-5 h-5" /></button>
                            <button onClick={() => onDeleteCustomer(selectedCustomer.id)} className="btn-icon rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-5 h-5" /></button>
                            <button onClick={onClose} className="btn-icon rounded-full"><X className="w-6 h-6" /></button>
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

                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center"><User className="w-4 h-4 mr-2" /> İletişim Bilgileri</h3>
                                    <div className="space-y-3">
                                        {(selectedCustomer.customerType === 'KURUMSAL' && selectedCustomer.contactPersonId) && <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700"><span className="text-slate-500 text-sm">Yetkili Kişi</span><span className="font-medium text-slate-800 dark:text-white">TODO: Fetch Contact Person</span></div>}
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

                        {/* ASSETS TAB */}
                        {activeTab === 'assets' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800 dark:text-white">Kayıtlı Varlıklar</h3><button onClick={() => { setNewAsset({ type: 'Araç' }); setAssetDisplayValue(''); setIsEditAssetMode(false); setIsAssetModalOpen(true); }} className="btn-primary btn-sm flex items-center shadow-sm"><Plus className="w-4 h-4 mr-1" /> Varlık Ekle</button></div>
                                {selectedCustomer.assets.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">Kayıtlı varlık yok.</p> : selectedCustomer.assets.map((asset) => {
                                    const hasActivePolicy = getAssetPolicyStatus(asset);
                                    return (
                                        <div key={asset.id} className="flex items-start p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow group relative">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mr-4 text-brand-primary">{asset.type === 'Araç' ? <Car className="w-6 h-6" /> : asset.type === 'Konut' ? <Home className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between pr-8"><h4 className="font-bold text-slate-800 dark:text-white">{asset.description}</h4><div className="flex gap-2"><span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{asset.type}</span>{hasActivePolicy && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sigortalı</span>}</div></div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{asset.details}</p>
                                                {asset.value && <p className="text-xs text-slate-400 mt-1">Değer: ₺{asset.value.toLocaleString('tr-TR')}</p>}


                                            </div>
                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setNewAsset(asset); setAssetDisplayValue(formatNumberInput(asset.value ? asset.value.toString() : '')); setIsEditAssetMode(true); setEditingAssetId(asset.id); setIsAssetModalOpen(true); }} className="btn-icon"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteAsset(asset.id)} className="btn-icon text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* POLICIES TAB */}
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
                                        {[...customerPolicies]
                                            .sort((a, b) => {
                                                // Potential policies first
                                                if (a.status === 'Potential' && b.status !== 'Potential') return -1;
                                                if (a.status !== 'Potential' && b.status === 'Potential') return 1;

                                                // Then sort by end date descending (newer first)
                                                return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
                                            })
                                            .map((p, index) => {
                                                const isExpired = new Date(p.endDate) < new Date();
                                                const isActive = p.status === 'Active' && !isExpired;
                                                const isCancelled = p.status === 'Cancelled';
                                                const isPotential = p.status === 'Potential';

                                                // Translate status to Turkish
                                                const statusTextTR = p.status === 'Active' ? 'Aktif' :
                                                    p.status === 'Expired' ? 'Süresi Dolmuş' :
                                                        p.status === 'Cancelled' ? 'İptal Edildi' :
                                                            p.status === 'Potential' ? 'Potansiyel' : p.status;

                                                // Find plate number for traffic/kasko policies from description or customer assets
                                                const isVehiclePolicy = p.type === InsuranceType.TRAFIK || p.type === InsuranceType.KASKO || p.type === 'Elementer' as any || (p.productName && (p.productName.includes('Trafik') || p.productName.includes('Kasko')));

                                                // Try to extract plate from description first (Format: "Plaka: 34ABC123" or similar)
                                                // Coverage for different separators and loose matching
                                                let plateNumber = null;
                                                const plateMatch = p.description?.match(/Plaka:\s*([\w\s]+?)(?:\s*-\s*|$)/i);
                                                if (plateMatch && plateMatch[1]) {
                                                    plateNumber = plateMatch[1].trim();
                                                } else {
                                                    // Fallback to asset matching
                                                    const vehicleAsset = isVehiclePolicy
                                                        ? selectedCustomer.assets.find(a => a.type === 'Araç' && (a.details?.includes(p.policyNo || '') || (p.description && p.description.includes(a.description))))
                                                        : null;
                                                    plateNumber = vehicleAsset?.description || null;
                                                }

                                                return (
                                                    <div key={p.id} className="relative pl-8 group">
                                                        <div className={`absolute -left-[9px] top-6 w-[18px] h-[18px] rounded-full border-[3px] box-content z-10 transition-colors ${isActive ? 'bg-green-500' : isPotential ? 'bg-yellow-500' : 'bg-slate-300'} `}></div>
                                                        <div className={`bg-white dark:bg-slate-800 border p-5 rounded-xl ${isPotential ? 'border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10' : 'border-slate-200'}`}>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                                        {p.productName || p.type}
                                                                        {isVehiclePolicy && plateNumber && (
                                                                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                                                                ({plateNumber})
                                                                            </span>
                                                                        )}
                                                                    </h4>
                                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.policyNo}</p>
                                                                </div>
                                                                <span className={`text-xs font-bold px-2 py-1 rounded ${isPotential ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'text-slate-600'}`}>{statusTextTR}</span>
                                                            </div>
                                                            <div className="mt-3 flex items-center justify-between">
                                                                <p className="font-bold text-brand-primary">₺{p.premium.toLocaleString('tr-TR')}</p>
                                                                <p className="text-xs text-slate-500">Vade: {new Date(p.endDate).toLocaleDateString('tr-TR')}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NOTES TAB */}
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

                {/* --- MODALS INSIDE DRAWER (Assets, Notes) --- */}
                {/* We can keep them inline or extract them too. For now inline. */}
                {/* ASSET MODAL */}
                {isAssetModalOpen && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl w-full max-w-md m-4">
                            <h3 className="font-bold text-xl mb-4">{isEditAssetMode ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}</h3>
                            <form onSubmit={handleSaveAsset} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tip</label>
                                    <select value={newAsset.type} onChange={e => setNewAsset({ ...newAsset, type: e.target.value as any })} className="w-full p-2 border rounded">
                                        <option value="Araç">Araç</option>
                                        <option value="Konut">Konut</option>
                                        <option value="İşyeri">İşyeri</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{newAsset.type === 'Araç' ? 'Plaka' : 'Tanım'}</label>
                                    <input required type="text" value={newAsset.description || ''} onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} className="w-full p-2 border rounded" placeholder={newAsset.type === 'Araç' ? '34 ABC 123' : 'Ev, Yazlık, Depo...'} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Detaylar</label>
                                    <input type="text" value={newAsset.details || ''} onChange={e => setNewAsset({ ...newAsset, details: e.target.value })} className="w-full p-2 border rounded" placeholder="Marka model, adres vb." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Değer (TL)</label>
                                    <input type="text" value={assetDisplayValue} onChange={e => setAssetDisplayValue(formatNumberInput(e.target.value))} className="w-full p-2 border rounded" placeholder="0" />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">İptal</button>
                                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90">{isEditAssetMode ? 'Güncelle' : 'Ekle'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* NOTE MODAL */}
                {isNoteModalOpen && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl w-full max-w-md m-4">
                            <h3 className="font-bold text-xl mb-4">Yeni Not Ekle</h3>
                            <form onSubmit={handleAddNote} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tür</label>
                                    <select value={newNote.type} onChange={e => setNewNote({ ...newNote, type: e.target.value as any })} className="w-full p-2 border rounded">
                                        <option value="Not">Not</option>
                                        <option value="Görüşme">Görüşme</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Email">Email</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">İçerik</label>
                                    <textarea required rows={4} value={newNote.content || ''} onChange={e => setNewNote({ ...newNote, content: e.target.value })} className="w-full p-2 border rounded" placeholder="Notunuzu buraya yazın..." />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">İptal</button>
                                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90">Ekle</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};
