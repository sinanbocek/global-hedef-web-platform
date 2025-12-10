/**
 * Custom hook for CSV export functionality
 */

import { CommissionDistribution } from '../../../types';
import { formatDate, formatCurrency } from '../utils/formatting';

export const useExportCSV = () => {
    const exportCSV = (
        distributions: CommissionDistribution[],
        salespersonId?: string,
        salespersonName?: string
    ): { success: boolean; error?: string } => {
        try {
            // Filter data
            let dataToExport;

            if (salespersonId) {
                dataToExport = distributions
                    .filter(d => d.salespersonId === salespersonId)
                    .map(d => ({
                        Tarih: formatDate(d.distributionDate),
                        'Poliçe No': d.policy?.policyNo || '-',
                        'Müşteri': d.policy?.customerName || '-',
                        'Branş/Ürün': d.policy?.type || '-',
                        'Prim': d.policy?.premium || 0,
                        'Toplam Komisyon': d.totalCommission,
                        'Satışçı Payı': d.salespersonAmount,
                        'Oran': `%${d.salespersonPercentage}`
                    }));
            } else {
                // Export all distributions
                dataToExport = distributions.map(d => ({
                    Tarih: formatDate(d.distributionDate),
                    'Poliçe No': d.policy?.policyNo || '-',
                    'Müşteri': d.policy?.customerName || '-',
                    'Sigorta Şirketi': d.policy?.company || '-',
                    'Branş/Ürün': d.policy?.type || '-',
                    'Prim': d.policy?.premium || 0,
                    'Toplam Komisyon': d.totalCommission,
                    'Satışçı Payı': d.salespersonAmount,
                    'Ortak Payı': d.partnersPoolAmount,
                    'Şirket Payı': d.companyPoolAmount,
                    'Durum': d.status === 'completed' || d.paymentId ? 'Ödendi' : 'Bekliyor'
                }));
            }

            if (dataToExport.length === 0) {
                return { success: false, error: 'İndirilecek veri bulunamadı' };
            }

            // Convert to CSV
            const headers = Object.keys(dataToExport[0]).join(',');
            const rows = dataToExport.map(row =>
                Object.values(row).map(val => `"${val}"`).join(',')
            );
            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');

            // Download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const filename = salespersonName
                ? `Komisyon_Raporu_${salespersonName.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
                : `Genel_Komisyon_Raporu_${new Date().toISOString().slice(0, 10)}.csv`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return { success: true };

        } catch (err: any) {
            console.error('CSV export error:', err);
            return { success: false, error: err.message || 'CSV oluşturulurken hata oluştu' };
        }
    };

    return { exportCSV };
};
