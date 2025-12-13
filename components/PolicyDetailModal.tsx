import React, { useState, useEffect } from 'react';
import { AgendaItem } from '../hooks/useDashboardAgenda';
import { Calendar, X, Phone, MessageCircle, AlertTriangle, Check, RotateCw, XCircle, ArrowRight } from 'lucide-react';
import { SearchableSelect } from './ui/SearchableSelect';
import { DatePicker } from './ui/DatePicker';

// Temporary format util if not exists
const safeFormatCurrency = (amount?: number) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

interface PolicyDetailModalProps {
    item: AgendaItem;
    onClose: () => void;
    onAction: (action: 'renewed_us' | 'renewed_other' | 'cancelled', payload?: any) => void;
    companies: { id: string; name: string }[];
}

export const PolicyDetailModal: React.FC<PolicyDetailModalProps> = ({ item, onClose, onAction, companies }) => {
    const [actionStep, setActionStep] = useState<'initial' | 'renewed_other' | 'renewed_us' | 'confirm_cancel'>('initial');

    // Form States
    const [newPrice, setNewPrice] = useState('');
    const [newCompanyId, setNewCompanyId] = useState('');
    const [newPolicyNo, setNewPolicyNo] = useState('');
    const [newCommission, setNewCommission] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');

    useEffect(() => {
        if (item) {
            // Default Date Logic
            const nextYear = new Date(item.date);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            setNewEndDate(nextYear.toISOString().split('T')[0]);

            // Default Start Date to item date (expiry date)
            setNewStartDate(item.date.toISOString().split('T')[0]);

            // Default Policy No
            setNewPolicyNo(item.meta?.policyNo || '');

            // Default Company Logic
            if (item.meta?.company) {
                // Try exact match first
                let found = companies.find(c => c.name.toLowerCase() === item.meta?.company?.toLowerCase());
                if (found) {
                    setNewCompanyId(found.id);
                }
            }
        }
    }, [item, companies]);

    if (!item) return null;

    const handleRenewedUs = () => {
        setActionStep('renewed_us');
    };

    // Helper to find existing company ID if we need to reset it explicitly
    // (kept in useEffect for simplicity when modal opens)

    const submitRenewedUs = () => {
        if (!newCompanyId) { alert('Lütfen şirket seçiniz.'); return; }
        onAction('renewed_us', {
            price: parseFloat(newPrice),
            endDate: newEndDate,
            companyId: newCompanyId,
            policyNo: newPolicyNo,
            commission: parseFloat(newCommission)
        });
    };

    const submitRenewedOther = () => {
        if (!newCompanyId) { alert('Lütfen şirket seçiniz.'); return; }
        // Find name for description
        const cName = companies.find(c => c.id === newCompanyId)?.name || '';
        onAction('renewed_other', {
            companyId: newCompanyId,
            companyName: cName,
            price: parseFloat(newPrice),
            startDate: newStartDate,
            endDate: newEndDate
        });
    };

    // Shared Styles
    const labelStyle = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header Compact */}
                <div className="bg-white p-5 border-b border-slate-100 flex justify-between items-start shrink-0 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 leading-tight">{item.title}</h3>
                            {item && item.meta?.phone && (
                                <a
                                    href={`https://wa.me/${item.meta.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full transition-colors"
                                    title="WhatsApp Başlat"
                                >
                                    <MessageCircle size={14} fill="white" />
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{item.description}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 overflow-y-auto">

                    {/* Key Info Row */}
                    {actionStep === 'initial' && (
                        <div className="flex gap-4">
                            <div className="flex-1 bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Vade Bitiş</span>
                                <div className="font-bold text-blue-900 text-base flex items-center gap-1.5">
                                    <Calendar size={14} className="text-blue-500" />
                                    {item.date.toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                            <div className="flex-1 bg-green-50/50 rounded-xl p-3 border border-green-100/50 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1">Prim Tutar</span>
                                <div className="font-bold text-green-900 text-base">
                                    {safeFormatCurrency(item.meta?.amount)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compact Details Grid */}
                    {actionStep === 'initial' && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-medium uppercase">Poliçe No</span>
                                <span className="font-medium text-slate-700 font-mono text-xs">{item.meta?.policyNo || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-right">
                                <span className="text-[10px] text-slate-400 font-medium uppercase">Şirket</span>
                                <span className="font-medium text-slate-900">{item.meta?.company || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-medium uppercase">Plaka / Varlık</span>
                                <span className="font-medium text-slate-900">{item.meta?.plate || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-right">
                                <span className="text-[10px] text-slate-400 font-medium uppercase">Telefon</span>
                                <span className="font-medium text-slate-900">{item.meta?.phone || '-'}</span>
                            </div>
                        </div>
                    )}

                    {/* ACTION FORMS (Refined CSS & Layout) */}
                    {actionStep === 'renewed_us' && (
                        <div className="space-y-4 animate-in slide-in-from-right-10 duration-200">
                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex items-center gap-3">
                                <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600"><Check size={16} /></div>
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-800">Bizden Yenilendi</h4>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Row 1: Company & Policy No */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelStyle}>ŞİRKET *</label>
                                        <SearchableSelect
                                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                                            value={newCompanyId}
                                            onChange={setNewCompanyId}
                                            placeholder="Seçiniz..."
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelStyle}>YENİ POLİÇE NO</label>
                                        <input
                                            type="text"
                                            value={newPolicyNo}
                                            onChange={e => setNewPolicyNo(e.target.value)}
                                            className="input-std mt-1 font-mono"
                                            placeholder="Poliçe No"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Start & End Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelStyle}>YENİ BAŞLANGIÇ</label>
                                        <DatePicker value={newStartDate} onChange={setNewStartDate} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelStyle}>YENİ BİTİŞ</label>
                                        <DatePicker value={newEndDate} onChange={setNewEndDate} />
                                    </div>
                                </div>

                                {/* Row 3: Premium & Commission */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className={labelStyle}>YENİ PRİM (TL)</label>
                                        <input
                                            type="number"
                                            value={newPrice}
                                            placeholder="0.00"
                                            onChange={e => setNewPrice(e.target.value)}
                                            className="input-std font-bold text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelStyle}>KOMİSYON (TL)</label>
                                        <input
                                            type="number"
                                            value={newCommission}
                                            placeholder="0.00"
                                            onChange={e => setNewCommission(e.target.value)}
                                            className="input-std font-medium text-brand-secondary text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setActionStep('initial')} className="flex-1 py-2.5 bg-slate-100 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">İptal</button>
                                <button onClick={submitRenewedUs} className="flex-1 py-2.5 bg-emerald-600 text-xs font-bold text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors">Kaydet</button>
                            </div>
                        </div>
                    )}

                    {actionStep === 'renewed_other' && (
                        <div className="space-y-4 animate-in slide-in-from-right-10 duration-200">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-3">
                                <div className="bg-amber-100 p-1.5 rounded-full text-amber-600"><RotateCw size={16} /></div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800">Başka Şirket</h4>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className={labelStyle}>YENİ ŞİRKET</label>
                                        <SearchableSelect
                                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                                            value={newCompanyId}
                                            onChange={setNewCompanyId}
                                            placeholder="Şirket Seçin..."
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className={labelStyle}>YENİ FİYAT (TL)</label>
                                        <input
                                            type="number"
                                            value={newPrice}
                                            onChange={e => setNewPrice(e.target.value)}
                                            className="input-std font-bold text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Başlangıç</label>
                                        <DatePicker value={newStartDate} onChange={setNewStartDate} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Bitiş</label>
                                        <DatePicker value={newEndDate} onChange={setNewEndDate} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setActionStep('initial')} className="flex-1 py-2.5 bg-slate-100 text-xs font-bold text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">İptal</button>
                                <button onClick={submitRenewedOther} className="flex-1 py-2.5 bg-amber-600 text-xs font-bold text-white rounded-lg hover:bg-amber-700 shadow-sm transition-colors">Kaydet</button>
                            </div>
                        </div>
                    )}

                    {actionStep === 'confirm_cancel' && (
                        <div className="space-y-4 animate-in slide-in-from-right-10 duration-200 text-center py-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-2">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-800">Poliçeyi İptal Et?</h4>
                                <p className="text-sm text-slate-500 mt-1">Bu işlem poliçeyi iptal statüsüne alacak. Emin misiniz?</p>
                            </div>
                            <div className="flex gap-2 pt-2 px-4">
                                <button onClick={() => setActionStep('initial')} className="flex-1 py-2.5 bg-slate-100 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Vazgeç</button>
                                <button onClick={() => onAction('cancelled')} className="flex-1 py-2.5 bg-red-600 text-xs font-bold text-white rounded-xl hover:bg-red-700 shadow-sm transition-colors">Evet, İptal Et</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {actionStep === 'initial' && (
                    <div className="bg-slate-50 border-t border-slate-100 p-5 mt-auto">
                        <div className="relative py-2 mb-3">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-50 px-2 text-slate-400 font-bold tracking-wider">Aksiyon Al</span></div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={handleRenewedUs} className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all group shadow-sm hover:shadow-md">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full group-hover:bg-emerald-200 transition-colors">
                                    <Check size={18} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-700 text-center leading-tight">Bizden<br />Yenilendi</span>
                            </button>

                            <button onClick={() => setActionStep('renewed_other')} className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all group shadow-sm hover:shadow-md">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-full group-hover:bg-amber-200 transition-colors">
                                    <RotateCw size={18} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 group-hover:text-amber-700 text-center leading-tight">Başka<br />Şirket</span>
                            </button>

                            <button onClick={() => setActionStep('confirm_cancel')} className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all group shadow-sm hover:shadow-md">
                                <div className="p-2 bg-red-100 text-red-600 rounded-full group-hover:bg-red-200 transition-colors">
                                    <XCircle size={18} strokeWidth={3} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 group-hover:text-red-700 text-center leading-tight">İptal /<br />Yenilenmedi</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
