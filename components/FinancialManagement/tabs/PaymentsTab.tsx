/**
 * Payments Tab - Commission Payment Management
 */

import React, { useState } from 'react';
import { CreditCard, Wallet, CheckCircle } from 'lucide-react';
import { CommissionDistribution, CommissionPayment } from '../../../types';
import { usePayments } from '../hooks/usePayments';
import { useToast } from '../../../contexts/ToastContext';
import { formatCurrency, formatDateTime } from '../utils/formatting';

interface PaymentsTabProps {
    distributions: CommissionDistribution[];
    unpaidItems: any[];
    paymentHistory: CommissionPayment[];
    onRefresh: () => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
    distributions,
    unpaidItems,
    paymentHistory,
    onRefresh
}) => {
    const { showSuccess, showError } = useToast();
    const [paymentRecipient, setPaymentRecipient] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDescription, setPaymentDescription] = useState('');

    const { processingPayment, createPayment } = usePayments(
        () => {
            showSuccess('Başarılı', 'Ödeme başarıyla oluşturuldu!');
            setPaymentRecipient(null);
            setPaymentAmount(0);
            setPaymentDescription('');
            onRefresh();
        },
        (error) => {
            showError('Hata', error);
        }
    );

    const handleCreatePayment = async () => {
        if (!paymentRecipient) return;

        await createPayment(
            {
                type: paymentRecipient.type,
                id: paymentRecipient.id,
                name: paymentRecipient.name,
                maxAmount: paymentRecipient.amount
            },
            paymentAmount,
            paymentDescription,
            distributions
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-brand-primary" />
                        Komisyon Ödemeleri ve Hak Edişler
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Biriken komisyonları görüntüleyin ve ödeme emri oluşturun.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Unpaid List */}
                <div className="lg:col-span-2 space-y-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme Bekleyenler</h4>
                    {unpaidItems.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                            Tüm ödemeler yapılmış. Bekleyen bakiye bulunmuyor.
                        </div>
                    ) : (
                        unpaidItems.map(item => (
                            <div
                                key={`${item.type}-${item.id}`}
                                className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 shadow-sm flex justify-between items-center ${paymentRecipient?.id === item.id
                                    ? 'border-brand-primary ring-2 ring-brand-primary/20'
                                    : 'border-slate-300 dark:border-slate-600'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'salesperson'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-purple-100 text-purple-700'
                                                }`}
                                        >
                                            {item.type === 'salesperson' ? 'Satış Temsilcisi' : 'Firma Ortağı'}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">{item.count} adet işlemden biriken</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                                            {formatCurrency(item.amount)}
                                        </div>
                                        <div className="text-xs text-amber-600 font-medium">Ödeme Bekliyor</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPaymentRecipient(item);
                                            setPaymentAmount(item.amount);
                                        }}
                                        className="btn-secondary px-3 py-2 text-sm"
                                        disabled={paymentRecipient?.id === item.id}
                                    >
                                        Seç
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Payment Action Panel */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme İşlemi</h4>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-6">
                        {!paymentRecipient ? (
                            <div className="text-center py-8 text-slate-400">
                                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Ödeme yapmak için soldaki listeden bir kişi seçin.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 uppercase">Ödeme Yapılacak Kişi</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white">
                                        {paymentRecipient.name}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400">Ödenecek Tutar</label>
                                    <div className="text-2xl font-bold text-brand-primary mt-1">
                                        {formatCurrency(paymentAmount)}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
                                        Açıklama (Opsiyonel)
                                    </label>
                                    <textarea
                                        className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
                                        rows={2}
                                        placeholder="Örn: Haziran ayı komisyon ödemesi..."
                                        value={paymentDescription}
                                        onChange={e => setPaymentDescription(e.target.value)}
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={handleCreatePayment}
                                        disabled={processingPayment}
                                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                                    >
                                        {processingPayment ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                İşleniyor...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Ödemeyi Onayla & Kapat
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-slate-400 text-center mt-3">
                                        Bu işlem geri alınamaz. İlgili komisyon kayıtları "Ödendi" olarak işaretlenecektir.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment History Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">Ödeme Geçmişi</h4>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                            <th className="px-6 py-4">Tarih</th>
                            <th className="px-6 py-4">Kişi / Kurum</th>
                            <th className="px-6 py-4">Tutar</th>
                            <th className="px-6 py-4">Açıklama</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {paymentHistory.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    Henüz ödeme kaydı bulunmuyor.
                                </td>
                            </tr>
                        ) : (
                            paymentHistory.map(payment => (
                                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {formatDateTime(payment.payment_date)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800 dark:text-white">
                                            {payment.recipient_name || 'Bilinmiyor'}
                                        </div>
                                        <div className="text-xs text-slate-500 capitalize">
                                            {payment.recipient_type === 'partner' ? 'Ortak' : 'Satış Temsilcisi'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(payment.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{payment.description || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
