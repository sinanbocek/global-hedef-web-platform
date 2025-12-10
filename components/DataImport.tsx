import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, Database, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface ExcelRow {
    'MÜŞTERİ ADI': string;
    'POLİÇE TÜRÜ': string;
    'SİGORTA ŞİRKETİ': string;
    'POLİÇE NO': string;
    'PLAKA': string;
    'BAŞLANGIÇ TARİHİ': string | Date;
    'BİTİŞ TARİHİ': string | Date;
    'PRİM': number;
    'AÇIKLAMA': string;
    'TELEFON': string;
    'SATIŞ TEMSİLCİSİ': string;
    'TCKN': string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data: any;
}

export const DataImport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const [showErrorList, setShowErrorList] = useState(false);
    const { showSuccess, showError } = useToast();

    const normalizeColumn = (str: string): string => {
        if (!str) return '';
        return str.toString()
            .trim()
            .toUpperCase()
            .replace(/[İ]/g, 'I')
            .replace(/[Ş]/g, 'S')
            .replace(/[Ğ]/g, 'G')
            .replace(/[Ü]/g, 'U')
            .replace(/[Ö]/g, 'O')
            .replace(/[Ç]/g, 'C');
    };

    const handleFileUpload = async (uploadedFile: File) => {
        try {
            setFile(uploadedFile);
            setImportResults(null);
            setProgress(0);
            setShowErrorList(false);

            const data = await uploadedFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

            const normalizedData = rawData.map(row => {
                const normalized: any = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = normalizeColumn(key);

                    if (cleanKey.includes('MUSTERI')) normalized['MÜŞTERİ ADI'] = row[key];
                    else if (cleanKey.includes('TCKN') || cleanKey.includes('TC') || cleanKey.includes('VKN')) normalized['TCKN'] = row[key];
                    else if (cleanKey.includes('CEP') || cleanKey.includes('TEL')) normalized['TELEFON'] = row[key];
                    else if (cleanKey.includes('POLICE TURU') || cleanKey.includes('BRANS')) normalized['POLİÇE TÜRÜ'] = row[key];
                    else if (cleanKey.includes('POLICE NUMARASI') || cleanKey.includes('POLICE NO')) normalized['POLİÇE NO'] = row[key];
                    else if (cleanKey.includes('KESIM TARIHI') || cleanKey.includes('BASLANGIC')) normalized['BAŞLANGIÇ TARİHİ'] = row[key];
                    else if (cleanKey.includes('POLICE VADESI') || cleanKey.includes('BITIS')) normalized['BİTİŞ TARİHİ'] = row[key];
                    else if (cleanKey.includes('PLAKA')) normalized['PLAKA'] = row[key];
                    else if (cleanKey.includes('PRIM')) normalized['PRİM'] = row[key];
                    else if (cleanKey.includes('SATIS') || cleanKey.includes('SATISCI')) normalized['SATIŞ TEMSİLCİSİ'] = row[key];
                    else if (cleanKey.includes('SIGORTA SIRKETI')) normalized['SİGORTA ŞİRKETİ'] = row[key];
                    else if (cleanKey.includes('NOT') || cleanKey.includes('ACIKLAMA')) normalized['AÇIKLAMA'] = row[key];
                });
                return normalized;
            });

            setPreview(normalizedData.slice(0, 10));
            const results = await Promise.all(normalizedData.map(validateRow));
            setValidationResults(results);
            showSuccess('Başarılı', `${normalizedData.length} satır yüklendi`);
        } catch (error: any) {
            showError('Hata', error.message || 'Excel dosyası okunamadı');
        }
    };

    // Helper date parser (needs to be available for validation)
    const parseDate = (val: any) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];
        if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            // Excel date parsing can result in invalid dates if number is weird
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        }
        if (typeof val === 'string') {
            const v = val.trim();
            if (v.includes('.')) {
                const p = v.split('.');
                if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
            }
            if (v.includes('/')) {
                const p = v.split('/');
                if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
            }
            // Try standard parsing
            const d = new Date(v);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        return null;
    };

    const validateRow = async (row: ExcelRow): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!row['MÜŞTERİ ADI']) errors.push('Müşteri adı boş');
        if (!row['POLİÇE TÜRÜ']) warnings.push('Poliçe Türü boş');

        // VALIDATE DATES strictly
        if (!row['BAŞLANGIÇ TARİHİ']) {
            errors.push('Başlangıç Tarihi eksik');
        } else if (!parseDate(row['BAŞLANGIÇ TARİHİ'])) {
            errors.push('Başlangıç Tarihi formatı hatalı');
        }

        if (!row['BİTİŞ TARİHİ']) {
            errors.push('Bitiş Tarihi eksik');
        } else if (!parseDate(row['BİTİŞ TARİHİ'])) {
            errors.push('Bitiş Tarihi formatı hatalı');
        }

        if (row['TCKN']) {
            const val = row['TCKN'].toString();
            if (val.length !== 10 && val.length !== 11) warnings.push('TCKN/VKN 10 veya 11 hane olmalı');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            data: row
        };
    };

    const handleImport = async () => {
        try {
            setImporting(true);
            setProgress(0);
            const validRows = validationResults.filter(r => r.valid);

            if (validRows.length === 0) {
                showError('Hata', 'Import edilecek geçerli satır yok');
                return;
            }

            const { data: companies } = await supabase.from('settings_companies').select('id, name');
            const { data: products } = await supabase.from('insurance_products').select(`
        id, 
        name_tr, 
        code, 
        aliases, 
        category:insurance_categories(id, name_tr)
      `);
            const { data: users } = await supabase.from('user_profiles').select('id, full_name');

            let successCount = 0;
            let failedCount = 0;
            const errorLog: string[] = [];

            const processRow = async (result: ValidationResult) => {
                try {
                    const row = result.data;

                    let companyId = null;
                    if (row['SİGORTA ŞİRKETİ']) {
                        const cName = row['SİGORTA ŞİRKETİ'].toString().trim().toLowerCase();
                        const comp = companies?.find(c =>
                            c.name.toLowerCase().includes(cName) || cName.includes(c.name.toLowerCase())
                        );
                        companyId = comp?.id;
                    }

                    let productId = null;
                    let categoryName = 'Diğer';
                    if (row['POLİÇE TÜRÜ']) {
                        const rawType = row['POLİÇE TÜRÜ'].toString().trim().toLowerCase();
                        const matchedProduct = products?.find(p => {
                            const pName = p.name_tr.toLowerCase();
                            const pCode = p.code.toLowerCase();
                            const aliases = p.aliases || [];
                            return pName === rawType ||
                                rawType.includes(pName) ||
                                pCode === rawType ||
                                aliases.some((a: string) => a.toLowerCase().includes(rawType));
                        });

                        if (matchedProduct) {
                            productId = matchedProduct.id;
                            if (matchedProduct.category) {
                                // @ts-ignore
                                categoryName = matchedProduct.category.name_tr;
                            }
                        }
                    }

                    let salespersonId = null;
                    if (row['SATIŞ TEMSİLCİSİ']) {
                        const sName = row['SATIŞ TEMSİLCİSİ'].toString().trim().toLowerCase();
                        const u = users?.find(user => user.full_name.toLowerCase().includes(sName));
                        salespersonId = u?.id;
                    }

                    let tckn = null;
                    let vkn = null;
                    let custType = 'Bireysel';

                    if (row['TCKN']) {
                        const val = row['TCKN'].toString().trim();
                        // Unified Strategy: Store both in same variable based on length
                        if (val.length === 10) {
                            custType = 'Kurumsal';
                            vkn = val;
                        } else if (val.length === 11) {
                            custType = 'Bireysel';
                            tckn = val;
                        } else {
                            tckn = val; // Fallback
                        }
                    }

                    const phoneClean = row['TELEFON']?.toString().replace(/\D/g, '') || '';
                    const phone = phoneClean.length >= 10
                        ? `0 (${phoneClean.slice(-10, -7)}) ${phoneClean.slice(-7, -4)} ${phoneClean.slice(-4, -2)} ${phoneClean.slice(-2)}`
                        : phoneClean;

                    let existingCustomer = null;
                    // Unified Search Key: TCKN or VKN
                    const searchKey = tckn || vkn;

                    if (searchKey) {
                        const { data } = await supabase.from('customers').select('id').eq('tc_no', searchKey).single();
                        existingCustomer = data;
                    }

                    if (!existingCustomer) {
                        const { data } = await supabase.from('customers').select('id').ilike('full_name', row['MÜŞTERİ ADI']).single();
                        existingCustomer = data;
                    }

                    let customerId = existingCustomer?.id;

                    if (!customerId) {
                        const { data: newCust, error: custErr } = await supabase
                            .from('customers')
                            .insert({
                                customer_no: `GH-${Math.floor(10000 + Math.random() * 90000)}`,
                                full_name: row['MÜŞTERİ ADI'],
                                phone: phone || null,
                                tc_no: searchKey, // Unified storage
                                type: custType,
                                risk_score: 10
                            })
                            .select('id')
                            .single();

                        if (custErr) throw custErr;
                        customerId = newCust.id;
                    }

                    let desc = row['AÇIKLAMA'] || '';
                    if (row['PLAKA']) desc = `Plaka: ${row['PLAKA']} - ${desc}`;

                    const { error: polErr } = await supabase
                        .from('policies')
                        .insert({
                            customer_id: customerId,
                            company_id: companyId,
                            product_id: productId,
                            policy_no: row['POLİÇE NO'] || `DRAFT-${Date.now()}`,
                            type: categoryName,
                            start_date: parseDate(row['BAŞLANGIÇ TARİHİ']),
                            end_date: parseDate(row['BİTİŞ TARİHİ']),
                            premium: Number(row['PRİM']) || 0,
                            commission_amount: 0,
                            status: 'Active',
                            description: desc,
                            salesperson_id: salespersonId
                        });

                    if (polErr) throw polErr;
                    return { success: true };
                } catch (error: any) {
                    let msg = error.message;
                    if (msg.includes('end_date') && msg.includes('null')) msg = 'Bitiş Tarihi geçersiz veya boş';
                    if (msg.includes('start_date') && msg.includes('null')) msg = 'Başlangıç Tarihi geçersiz veya boş';
                    // We removed tax_number insert so this shouldn't happen, but keeping for safety
                    if (msg.includes('tax_number')) msg = 'Veritabanı şema hatası';
                    return { success: false, error: `${result.data['MÜŞTERİ ADI']}: ${msg}` };
                }
            };

            const CHUNK_SIZE = 10;
            for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
                const chunk = validRows.slice(i, i + CHUNK_SIZE);
                const results = await Promise.all(chunk.map(processRow));

                results.forEach(res => {
                    if (res.success) successCount++;
                    else {
                        failedCount++;
                        if (res.error) errorLog.push(res.error);
                    }
                });

                setProgress(Math.round(((i + chunk.length) / validRows.length) * 100));
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setImportResults({ success: successCount, failed: failedCount, errors: errorLog });
            showSuccess('İşlem Tamamlandı', `${successCount} başarılı, ${failedCount} hatalı`);

        } catch (error: any) {
            showError('Kritik Hata', error.message);
        } finally {
            setImporting(false);
            setProgress(0);
        }
    };

    const downloadErrorLog = () => {
        if (!importResults?.errors.length) return;
        const blob = new Blob([importResults.errors.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import-errors.txt';
        a.click();
    };

    const validCount = validationResults.filter(r => r.valid).length;
    const errorCount = validationResults.filter(r => !r.valid).length;

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Veri Aktar</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Excel ile akıllı veri yükleme</p>
                </div>
            </div>

            {/* Upload Area... (same) */}
            <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12">
                <div className="text-center">
                    <FileSpreadsheet className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Excel Dosyası Yükle</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">.xlsx veya .xls formatında</p>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors cursor-pointer">
                        <Upload className="w-5 h-5" />
                        Dosya Seç
                    </label>
                    {file && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">📄 {file.name}</p>}
                </div>
            </div>

            {/* Stats Summary... (same) */}
            {validationResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Database className="w-8 h-8 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-white">{validationResults.length}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Satır</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-green-200 dark:border-green-900 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Geçerli</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                            <div>
                                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">Engellenen</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {importing && (
                <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-lg animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Veriler İşleniyor...
                        </span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">%{progress}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                        Lütfen bekleyiniz, büyük dosyalar zaman alabilir. Sayfayı kapatmayın.
                    </p>
                </div>
            )}

            {/* Import Button */}
            {validCount > 0 && !importing && !importResults && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="px-8 py-4 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3 text-lg font-semibold disabled:opacity-50 disabled:scale-100"
                    >
                        <Database className="w-5 h-5" />
                        {validCount} Kaydı Analiz Et ve Aktar
                    </button>
                </div>
            )}

            {/* Results Section */}
            {importResults && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Sonuç Raporu</h3>
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="text-slate-800 dark:text-white font-medium">{importResults.success} kayıt başarıyla eklendi</span>
                        </div>
                        {importResults.failed > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                <span className="text-slate-800 dark:text-white font-medium">{importResults.failed} kayıt başarısız oldu</span>
                            </div>
                        )}
                    </div>

                    {importResults.errors.length > 0 && (
                        <div>
                            <div className="flex gap-4">
                                <button
                                    onClick={downloadErrorLog}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Hata Raporunu İndir (.txt)
                                </button>
                                <button
                                    onClick={() => setShowErrorList(!showErrorList)}
                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Info className="w-4 h-4" />
                                    {showErrorList ? 'Listeyi Gizle' : 'Hataları Ekranda Göster'}
                                </button>
                            </div>

                            {/* On Screen Error List */}
                            {showErrorList && (
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto font-mono text-xs text-red-600 dark:text-red-400">
                                    {importResults.errors.map((err, idx) => (
                                        <div key={idx} className="border-b border-slate-200 dark:border-slate-700 py-1 last:border-0">
                                            {idx + 1}. {err}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Preview Table only valid if no results yet */}
            {preview.length > 0 && !importing && !importResults && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 overflow-hidden">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Önizleme (İlk 10 Satır)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    {/* ... headers ... */}
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Müşteri</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Poliçe Türü</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">TCKN/VKN</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Poliçe No</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => {
                                    const validation = validationResults[i];
                                    const tckn = row['TCKN'] || '';
                                    const typeLabel = tckn.length === 10 ? 'VKN' : (tckn.length === 11 ? 'TC ' : '');
                                    return (
                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-3 font-medium text-slate-800 dark:text-white">{row['MÜŞTERİ ADI']}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row['POLİÇE TÜRÜ']}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">
                                                {tckn ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">{typeLabel}{tckn}</span> : '-'}
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row['POLİÇE NO']}</td>
                                            <td className="p-3">
                                                {validation?.valid ? (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {validation.warnings.length > 0 ? <span className="text-amber-500 text-xs">(!Uyarı)</span> : <span>OK</span>}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-600" title={validation?.errors.join(', ')}>
                                                        <X className="w-4 h-4" /> <span className="text-xs">Hata</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};
