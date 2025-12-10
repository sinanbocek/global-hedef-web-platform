import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Percent, Save, X, AlertCircle } from 'lucide-react';
import { Partner, PartnerShare, CommissionSettings } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface PartnershipSettingsProps {
    partners: Partner[];
    commissionSettings: CommissionSettings;
    onDataChange: () => void;
}

export const PartnershipSettings: React.FC<PartnershipSettingsProps> = ({
    partners,
    commissionSettings: initialCommissionSettings,
    onDataChange
}) => {
    const { showSuccess, showError } = useToast();

    // Modal States
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
    const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({
        name: '', tcVkn: '', email: '', phone: '', isActive: true
    });
    const [sharePercentage, setSharePercentage] = useState<number>(0);

    // Commission Settings
    const [commissionSettings, setCommissionSettings] = useState(initialCommissionSettings);
    const [isEditingCommission, setIsEditingCommission] = useState(false);

    // Calculate total share percentage
    const totalSharePercentage = partners
        .filter(p => p.isActive)
        .reduce((sum, p) => sum + (p.currentShare?.sharePercentage || 0), 0);

    const handleSavePartner = async () => {
        if (!partnerForm.name) {
            showError('Hata', 'Ortak adı zorunludur.');
            return;
        }

        if (sharePercentage <= 0 || sharePercentage > 100) {
            showError('Hata', 'Hisse or انی 0-100 arasında olmalıdır.');
            return;
        }

        try {
            let partnerId = editingPartnerId;

            // 1. Save/Update Partner
            if (editingPartnerId) {
                const { error } = await supabase
                    .from('partners')
                    .update({
                        name: partnerForm.name,
                        tc_vkn: partnerForm.tcVkn,
                        email: partnerForm.email,
                        phone: partnerForm.phone,
                        is_active: partnerForm.isActive
                    })
                    .eq('id', editingPartnerId);

                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('partners')
                    .insert([{
                        name: partnerForm.name,
                        tc_vkn: partnerForm.tcVkn,
                        email: partnerForm.email,
                        phone: partnerForm.phone,
                        is_active: partnerForm.isActive
                    }])
                    .select()
                    .single();

                if (error) throw error;
                partnerId = data.id;
            }

            // 2. Add Partner Share (only if new or percentage changed)
            const currentPartner = partners.find(p => p.id === partnerId);
            const currentPercentage = currentPartner?.currentShare?.sharePercentage || 0;

            if (sharePercentage !== currentPercentage) {
                // Close previous share
                if (currentPartner?.currentShare) {
                    await supabase
                        .from('partner_shares')
                        .update({ effective_until: new Date().toISOString().split('T')[0] })
                        .eq('id', currentPartner.currentShare.id);
                }

                // Create new share
                const { error: shareError } = await supabase
                    .from('partner_shares')
                    .insert([{
                        partner_id: partnerId,
                        share_percentage: sharePercentage,
                        effective_from: new Date().toISOString().split('T')[0],
                        effective_until: null,
                        notes: editingPartnerId ? 'Hisse güncellendi' : 'İlk hisse'
                    }]);

                if (shareError) throw shareError;
            }

            showSuccess('Başarılı', editingPartnerId ? 'Ortak güncellendi.' : 'Ortak eklendi.');
            setIsPartnerModalOpen(false);
            onDataChange();
        } catch (error: any) {
            console.error(error);
            showError('Hata', error.message || 'Ortak kaydedilemedi.');
        }
    };

    const handleDeletePartner = async (id: string) => {
        if (!window.confirm('Bu ortağı silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('partners')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showSuccess('Başarılı', 'Ortak silindi.');
            onDataChange();
        } catch (error: any) {
            showError('Hata', error.message || 'Ortak silinemedi.');
        }
    };

    const handleSaveCommissionSettings = async () => {
        // Validate total = 100%
        const total = commissionSettings.salespersonPercentage +
            commissionSettings.partnersPercentage +
            commissionSettings.companyPercentage;

        if (Math.abs(total - 100) > 0.01) {
            showError('Hata', 'Komisyon oranları toplamı %100 olmalıdır.');
            return;
        }

        try {
            const { error } = await supabase
                .from('settings_brand')
                .update({
                    commission_settings: commissionSettings
                })
                .eq('id', (await supabase.from('settings_brand').select('id').single()).data?.id);

            if (error) throw error;

            showSuccess('Başarılı', 'Komisyon ayarları güncellendi.');
            setIsEditingCommission(false);
            onDataChange();
        } catch (error: any) {
            showError('Hata', error.message || 'Ayarlar kaydedilemedi.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Commission Distribution Settings */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Percent className="w-5 h-5 text-brand-primary" />
                            Komisyon Dağılım Oranları
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Poliçe komisyonlarının dağılım yüzdelerini belirleyin.
                        </p>
                    </div>
                    {!isEditingCommission ? (
                        <button
                            onClick={() => setIsEditingCommission(true)}
                            className="btn-primary px-4 py-2 text-sm flex items-center"
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Düzenle
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveCommissionSettings}
                                className="btn-primary px-4 py-2 text-sm flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                            </button>
                            <button
                                onClick={() => setIsEditingCommission(false)}
                                className="btn-ghost px-4 py-2 text-sm flex items-center"
                            >
                                <X className="w-4 h-4 mr-2" />
                                İptal
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                            Satış Temsilcisi
                        </label>
                        {isEditingCommission ? (
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={commissionSettings.salespersonPercentage}
                                onChange={e => setCommissionSettings({
                                    ...commissionSettings,
                                    salespersonPercentage: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg text-lg font-bold text-center bg-white dark:bg-slate-800"
                            />
                        ) : (
                            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 text-center">
                                %{commissionSettings.salespersonPercentage}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <label className="block text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                            Ortaklar Havuzu
                        </label>
                        {isEditingCommission ? (
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={commissionSettings.partnersPercentage}
                                onChange={e => setCommissionSettings({
                                    ...commissionSettings,
                                    partnersPercentage: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-green-300 dark:border-green-700 rounded-lg text-lg font-bold text-center bg-white dark:bg-slate-800"
                            />
                        ) : (
                            <div className="text-3xl font-bold text-green-700 dark:text-green-400 text-center">
                                %{commissionSettings.partnersPercentage}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <label className="block text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
                            Şirket Kasası
                        </label>
                        {isEditingCommission ? (
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={commissionSettings.companyPercentage}
                                onChange={e => setCommissionSettings({
                                    ...commissionSettings,
                                    companyPercentage: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg text-lg font-bold text-center bg-white dark:bg-slate-800"
                            />
                        ) : (
                            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400 text-center">
                                %{commissionSettings.companyPercentage}
                            </div>
                        )}
                    </div>
                </div>

                {isEditingCommission && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                            <strong>Toplam:</strong> {(commissionSettings.salespersonPercentage + commissionSettings.partnersPercentage + commissionSettings.companyPercentage).toFixed(0)}%
                            {Math.abs((commissionSettings.salespersonPercentage + commissionSettings.partnersPercentage + commissionSettings.companyPercentage) - 100) > 0.01 &&
                                <span className="text-red-600 dark:text-red-400 ml-2">(%100 olmalı!)</span>
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Partners List */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Şirket Ortakları</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Toplam Hisse: <span className={`font-bold ${Math.abs(totalSharePercentage - 100) < 0.01 ? ' text-green-600' : 'text-red-600'}`}>
                                %{totalSharePercentage.toFixed(2)}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingPartnerId(null);
                            setPartnerForm({ name: '', tcVkn: '', email: '', phone: '', isActive: true });
                            setSharePercentage(0);
                            setIsPartnerModalOpen(true);
                        }}
                        className="btn-primary px-4 py-2 text-sm flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ortak Ekle
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr className="text-left text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                <th className="px-6 py-4">Ortak Adı</th>
                                <th className="px-6 py-4">TC/VKN</th>
                                <th className="px-6 py-4">İletişim</th>
                                <th className="px-6 py-4">Hisse Oranı</th>
                                <th className="px-6 py-4">Durum</th>
                                <th className="px-6 py-4 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {partners.map(partner => (
                                <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800 dark:text-white">{partner.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-300 font-mono">{partner.tcVkn || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 dark:text-slate-300">
                                            <div>{partner.email || '-'}</div>
                                            <div className="text-xs text-slate-400">{partner.phone || '-'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            %{partner.currentShare?.sharePercentage.toFixed(2) || '0.00'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${partner.isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{partner.isActive ? 'Aktif' : 'Pasif'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingPartnerId(partner.id);
                                                    setPartnerForm(partner);
                                                    setSharePercentage(partner.currentShare?.sharePercentage || 0);
                                                    setIsPartnerModalOpen(true);
                                                }}
                                                className="btn-icon text-brand-primary hover:bg-blue-50"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePartner(partner.id)}
                                                className="btn-icon text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {partners.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Ortak bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Partner Modal */}
            {isPartnerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingPartnerId ? 'Ortak Düzenle' : 'Yeni Ortak Ekle'}
                            </h3>
                            <button
                                onClick={() => setIsPartnerModalOpen(false)}
                                className="btn-icon"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ortak Adı *
                                </label>
                                <input
                                    type="text"
                                    value={partnerForm.name || ''}
                                    onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })}
                                    className="input-std"
                                    placeholder="Örn: Emel İpek"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    TC/VKN
                                </label>
                                <input
                                    type="text"
                                    value={partnerForm.tcVkn || ''}
                                    onChange={e => setPartnerForm({ ...partnerForm, tcVkn: e.target.value })}
                                    className="input-std"
                                    placeholder="12345678901"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    E-posta
                                </label>
                                <input
                                    type="email"
                                    value={partnerForm.email || ''}
                                    onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })}
                                    className="input-std"
                                    placeholder="ortak@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    value={partnerForm.phone || ''}
                                    onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                                    className="input-std"
                                    placeholder="0555 123 45 67"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Hisse Oranı (%) *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={sharePercentage}
                                    onChange={e => setSharePercentage(parseFloat(e.target.value) || 0)}
                                    className="input-std text-lg font-bold"
                                    placeholder="30.00"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={partnerForm.isActive}
                                    onChange={e => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                                    className="w-4 h-4 text-brand-primary border-slate-300 rounded focus:ring-brand-primary"
                                />
                                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                                    Aktif Ortak
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSavePartner}
                                className="btn-primary flex-1 py-2.5"
                            >
                                <Save className="w-4 h-4 inline mr-2" />
                                Kaydet
                            </button>
                            <button
                                onClick={() => setIsPartnerModalOpen(false)}
                                className="btn-ghost flex-1 py-2.5"
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
