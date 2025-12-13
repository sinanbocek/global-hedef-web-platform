import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, Database, Loader2, Info, Eye, Edit2, Check, ArrowRight, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

// ==================== INTERFACES ====================

interface ExcelRow {
    'Müşteri Türü': string;
    'MÜŞTERİ': string;
    'TCKN': string;
    'CEP TEL': string;
    'POLİÇE TÜRÜ': string;
    'POLİÇE NUMARASI': string;
    'POLİÇE BAŞLANGIÇ': string | Date;
    'POLİÇE BİTİŞ': string | Date;
    'PLAKA': string;
    'PRİM': number;
    'SATIŞÇI': string;
    'KOMİSYON': number;
    'ŞİRKET': string;
    'AÇIKLAMA': string;
}

interface MatchResult {
    excelValue: string;
    matchedId: string | null;
    matchedName: string | null;
    confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
    suggestions: Array<{ id: string; name: string; similarity: number }>;
}

interface MappingPreview {
    salespeople: Map<string, MatchResult>;
    companies: Map<string, MatchResult>;
    products: Map<string, MatchResult>;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data: any;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Convert text to Title Case with Turkish character support
 * "SİNAN İPEK" → "Sinan İpek"
 * "MİRALAY MADENCİLİK" → "Miralay Madencilik"
 */
function toTitleCase(text: string): string {
    if (!text) return '';

    const specialWords = ['VE', 'İLE', 'DAN', 'DEN', 'DE', 'DA'];

    return text
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index === 0 || !specialWords.includes(word.toUpperCase())) {
                return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
            }
            return word;
        })
        .join(' ');
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses improved algorithm with Turkish character normalization
 */
function calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    // Normalize Turkish characters for comparison
    // CRITICAL: Replace operations MUST come BEFORE toLowerCase()
    // because toLowerCase() converts İ to i̇ (dotted i) not regular i
    // ALSO: Use Unicode normalization to handle combining diacritics (e.g., İ̇ = İ + U+0307)
    const normalize = (s: string) => s
        .trim()
        .normalize('NFD')    // Decompose combined characters (İ̇ → İ + combining dot)
        .replace(/[\u0300-\u036f]/g, '') // Strip combining diacritics (U+0300-U+036F range)
        .replace(/İ/g, 'i')  // Büyük noktalı İ → i (ÖNCE!)
        .replace(/I/g, 'ı')  // Büyük noktasız I → ı (ÖNCE!)  
        .replace(/Ğ/g, 'g')  // Büyük Ğ
        .replace(/Ü/g, 'u')  // Büyük Ü
        .replace(/Ş/g, 's')  // Büyük Ş
        .replace(/Ö/g, 'o')  // Büyük Ö
        .replace(/Ç/g, 'c')  // Büyük Ç
        .toLowerCase()       // Sonra lowercase (artık güvenli)
        .replace(/ğ/g, 'g')  // Küçük ğ
        .replace(/ü/g, 'u')  // Küçük ü
        .replace(/ş/g, 's')  // Küçük ş
        .replace(/ı/g, 'i')  // Küçük ı
        .replace(/ö/g, 'o')  // Küçük ö
        .replace(/ç/g, 'c')  // Küçük ç
        .normalize('NFC');   // Recompose to canonical form

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // Debug normalization
    if (str1.includes("Emel") || str2.includes("Emel")) {
        console.log(`🔍 Comparing: "${str1}" (→"${s1}") vs "${str2}" (→"${s2}") | Match: ${s1 === s2}`);
    }


    // Exact match
    if (s1 === s2) return 1.0;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        const longer = Math.max(s1.length, s2.length);
        const shorter = Math.min(s1.length, s2.length);
        return 0.8 + (shorter / longer) * 0.15; // 0.8-0.95
    }

    // Word-by-word comparison
    const words1 = s1.split(/\s+/).filter(w => w.length > 0);
    const words2 = s2.split(/\s+/).filter(w => w.length > 0);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Count matching words
    const commonWords = words1.filter(w => words2.includes(w));

    if (commonWords.length > 0) {
        const ratio = commonWords.length / Math.max(words1.length, words2.length);
        return ratio * 0.85; // Up to 0.85
    }

    // Check for partial matches
    let partialMatches = 0;
    for (const w1 of words1) {
        for (const w2 of words2) {
            if (w1.includes(w2) || w2.includes(w1)) {
                partialMatches++;
                break;
            }
        }
    }

    if (partialMatches > 0) {
        return (partialMatches / Math.max(words1.length, words2.length)) * 0.6;
    }

    return 0;
}

/**
 * Smart matching for salespeople
 */
function matchSalesperson(
    excelName: string,
    dbUsers: Array<{ id: string; full_name: string }>
): MatchResult {
    if (!excelName || excelName.trim().toUpperCase() === 'ŞİRKET') {
        return {
            excelValue: excelName || '',
            matchedId: null,
            matchedName: null,
            confidence: 'none',
            suggestions: []
        };
    }

    const normalized = toTitleCase(excelName);
    const suggestions: Array<{ id: string; name: string; similarity: number }> = [];

    for (const user of dbUsers) {
        const similarity = calculateSimilarity(normalized, user.full_name);
        if (similarity > 0.3) {
            suggestions.push({ id: user.id, name: user.full_name, similarity });
        }
    }

    suggestions.sort((a, b) => b.similarity - a.similarity);

    // Debug: Show top suggestions
    if (suggestions.length > 0) {
        console.log(`  └─ Best match for "${excelName}": "${suggestions[0].name}" with score ${suggestions[0].similarity.toFixed(2)}`);
    }


    // Lowered threshold for better matching
    if (suggestions.length > 0 && suggestions[0].similarity >= 0.85) {
        return {
            excelValue: excelName,
            matchedId: suggestions[0].id,
            matchedName: suggestions[0].name,
            confidence: 'exact',
            suggestions
        };
    } else if (suggestions.length > 0 && suggestions[0].similarity >= 0.65) {
        return {
            excelValue: excelName,
            matchedId: suggestions[0].id,
            matchedName: suggestions[0].name,
            confidence: 'high',
            suggestions
        };
    } else if (suggestions.length > 0 && suggestions[0].similarity >= 0.45) {
        return {
            excelValue: excelName,
            matchedId: suggestions[0].id,
            matchedName: suggestions[0].name,
            confidence: 'medium',
            suggestions
        };
    } else {
        return {
            excelValue: excelName,
            matchedId: null,
            matchedName: null,
            confidence: suggestions.length > 0 ? 'low' : 'none',
            suggestions
        };
    }
}

/**
 * Company name normalization mapping
 */
const COMPANY_ALIASES: Record<string, string[]> = {
    'Allianz': ['ALLIANZ', 'ALLİANZ'],
    'Anadolu Sigorta': ['ANADOLU', 'ANADOLU SİGORTA'],
    'Türkiye Sigorta': ['TÜRKİYE', 'TÜRKİYE SİGORTA', 'TÜRKİYE SİGORTA VİZYON'],
    'Türkiye Katılım': ['TÜRKİYE KATILIM', 'TÜRKİYE KATILIM SİGORTA'],
    'Quick Sigorta': ['QUICK', 'OUICK'], // Includes typo
    'Ak Sigorta': ['AK', 'AK SİGORTA'],
    'Axa Sigorta': ['AXA'],
    'Bereket Sigorta': ['BEREKET'],
    'HDI Sigorta': ['HDI'],
    'Mapfre Sigorta': ['MAPFRE'],
    'Sompo Sigorta': ['SOMPO'],
    'Ankara Sigorta': ['ANKARA', 'ANKARA SİGORTA'],
    'Ray Sigorta': ['RAY'],
    'Neova Sigorta': ['NEOVA'],
    'Doğa Sigorta': ['DOĞA', 'DOGA'],
    'Corpus Sigorta': ['CORPUS'],
    'Unico Sigorta': ['UNICO'],
    'Koru Sigorta': ['KORU'],
    'Magdeburger Sigorta': ['MAGDEBURGER'],
    'Eureko Sigorta': ['EUREKO'],
    'Ana Sigorta': ['ANA'],
    'Acıbadem Sigorta': ['ACIBADEM', 'ACİBADEM'],
    'Ethica Sigorta': ['ETHICA', 'ETHİCA'],
    'Garanti Emeklilik': ['GARANTİ EMEKLİLİK', 'GARANTI EMEKLILIK', 'GARANTİ', 'GARANTI'],
    'Hepiyi Sigorta': ['HEPİYİ', 'HEPIYI'],
    'Emaa Sigorta': ['EMAA']
};

/**
 * Smart matching for companies
 */
function matchCompany(
    excelName: string,
    dbCompanies: Array<{ id: string; name: string }>
): MatchResult {
    if (!excelName) {
        return {
            excelValue: '',
            matchedId: null,
            matchedName: null,
            confidence: 'none',
            suggestions: []
        };
    }

    const normalized = excelName.trim().toUpperCase();

    // First, try alias matching
    for (const [canonicalName, aliases] of Object.entries(COMPANY_ALIASES)) {
        if (aliases.includes(normalized)) {
            const dbMatch = dbCompanies.find(c => c.name.toLowerCase().includes(canonicalName.toLowerCase()));
            if (dbMatch) {
                return {
                    excelValue: excelName,
                    matchedId: dbMatch.id,
                    matchedName: dbMatch.name,
                    confidence: 'exact',
                    suggestions: [{ id: dbMatch.id, name: dbMatch.name, similarity: 1.0 }]
                };
            }
        }
    }

    // Fallback to similarity matching
    const suggestions: Array<{ id: string; name: string; similarity: number }> = [];

    for (const company of dbCompanies) {
        const similarity = calculateSimilarity(normalized, company.name);
        if (similarity > 0.3) {
            suggestions.push({ id: company.id, name: company.name, similarity });
        }
    }

    suggestions.sort((a, b) => b.similarity - a.similarity);

    if (suggestions.length > 0 && suggestions[0].similarity >= 0.7) {
        return {
            excelValue: excelName,
            matchedId: suggestions[0].id,
            matchedName: suggestions[0].name,
            confidence: suggestions[0].similarity >= 0.9 ? 'exact' : 'high',
            suggestions
        };
    } else if (suggestions.length > 0 && suggestions[0].similarity >= 0.5) {
        return {
            excelValue: excelName,
            matchedId: null,
            matchedName: null,
            confidence: 'medium',
            suggestions
        };
    } else {
        return {
            excelValue: excelName,
            matchedId: null,
            matchedName: null,
            confidence: suggestions.length > 0 ? 'low' : 'none',
            suggestions
        };
    }
}

/**
 * Smart matching for products/policy types
 */
function matchProduct(
    excelType: string,
    dbProducts: Array<{ id: string; name_tr: string; code: string; aliases?: string[] }>
): MatchResult {
    if (!excelType) {
        return {
            excelValue: '',
            matchedId: null,
            matchedName: null,
            confidence: 'none',
            suggestions: []
        };
    }

    const normalized = excelType.trim().toLowerCase();
    const suggestions: Array<{ id: string; name: string; similarity: number }> = [];

    for (const product of dbProducts) {
        const productName = product.name_tr.toLowerCase();
        const productCode = product.code.toLowerCase();
        const aliases = (product.aliases || []).map(a => a.toLowerCase());

        // Exact match on aliases or code
        if (aliases.includes(normalized) || productCode === normalized) {
            return {
                excelValue: excelType,
                matchedId: product.id,
                matchedName: product.name_tr,
                confidence: 'exact',
                suggestions: [{ id: product.id, name: product.name_tr, similarity: 1.0 }]
            };
        }

        // Similarity matching
        const nameSimilarity = calculateSimilarity(normalized, productName);
        const codeSimilarity = calculateSimilarity(normalized, productCode);
        const aliasSimilarity = Math.max(...aliases.map(a => calculateSimilarity(normalized, a)), 0);

        const maxSimilarity = Math.max(nameSimilarity, codeSimilarity, aliasSimilarity);

        if (maxSimilarity > 0.3) {
            suggestions.push({ id: product.id, name: product.name_tr, similarity: maxSimilarity });
        }
    }

    suggestions.sort((a, b) => b.similarity - a.similarity);

    if (suggestions.length > 0 && suggestions[0].similarity >= 0.7) {
        return {
            excelValue: excelType,
            matchedId: suggestions[0].id,
            matchedName: suggestions[0].name,
            confidence: suggestions[0].similarity >= 0.9 ? 'exact' : 'high',
            suggestions
        };
    } else if (suggestions.length > 0 && suggestions[0].similarity >= 0.5) {
        return {
            excelValue: excelType,
            matchedId: null,
            matchedName: null,
            confidence: 'medium',
            suggestions
        };
    } else {
        return {
            excelValue: excelType,
            matchedId: null,
            matchedName: null,
            confidence: suggestions.length > 0 ? 'low' : 'none',
            suggestions
        };
    }
}

/**
 * Validate TCKN/VKN with support for 9, 10, and 11 digits
 */
function validateTcVkn(value: string, customerType: string): {
    valid: boolean;
    normalized: string;
    type: 'TC' | 'VKN' | 'UNKNOWN';
    error?: string;
} {
    if (!value) {
        return { valid: false, normalized: '', type: 'UNKNOWN', error: 'TCKN/VKN boş olamaz' };
    }

    const cleaned = value.toString().replace(/\D/g, ''); // Only digits

    if (customerType === 'Bireysel') {
        if (cleaned.length === 11) {
            return { valid: true, normalized: cleaned, type: 'TC' };
        } else {
            return { valid: false, normalized: cleaned, type: 'UNKNOWN', error: 'TC Kimlik 11 hane olmalı' };
        }
    } else { // Kurumsal
        if (cleaned.length === 10) {
            return { valid: true, normalized: cleaned, type: 'VKN' };
        } else if (cleaned.length === 9) {
            return { valid: true, normalized: '0' + cleaned, type: 'VKN' }; // Pad with 0
        } else {
            return { valid: false, normalized: cleaned, type: 'UNKNOWN', error: 'VKN 9 veya 10 hane olmalı' };
        }
    }
}

/**
 * Detect policy status based on policy number and dates
 */
function detectPolicyStatus(
    policyNo: string | number | null | undefined,
    startDate: Date | null,
    endDate: Date | null
): 'Active' | 'Potential' | 'Expired' | 'Cancelled' {
    const pNo = String(policyNo || '').trim();
    if (!pNo || pNo.toUpperCase().includes('POTANSİYEL')) {
        return 'Potential';
    }

    if (!endDate) return 'Active'; // Default if no end date

    const now = new Date();

    if (endDate < now) {
        return 'Expired';
    }

    return 'Active';
}

/**
 * Parse date from Excel (handles numbers, strings, Date objects)
 */
function parseDate(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
        const v = val.trim();
        if (v.includes('.')) {
            const p = v.split('.');
            if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        if (v.includes('/')) {
            const p = v.split('/');
            if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
}

// ==================== MAIN COMPONENT ====================

// HMR Trigger: Last Edit Check
export const DataImport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const [showErrorList, setShowErrorList] = useState(false);

    // Mapping preview state
    const [mappingPreview, setMappingPreview] = useState<MappingPreview | null>(null);
    const [showMappingPreview, setShowMappingPreview] = useState(false);
    const [normalizedData, setNormalizedData] = useState<any[]>([]);
    const [referenceData, setReferenceData] = useState<{
        users: Array<{ id: string; full_name: string }>;
        companies: Array<{ id: string; name: string }>;
        products: Array<{ id: string; name_tr: string; code: string; aliases?: string[]; category?: any }>;
    } | null>(null);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<any[]>([]);

    // Import Logs State
    const [importLogs, setImportLogs] = useState<Array<{ type: 'success' | 'error', message: string, customer: string }>>([]);

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
            setShowMappingPreview(false);

            const data = await uploadedFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

            // Normalize columns
            const normalized = rawData.map(row => {
                const norm: any = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = normalizeColumn(key);

                    // CRITICAL: Order matters! Check specific patterns first
                    if (cleanKey.includes('MUSTERI TURU') || cleanKey.includes('MUSTERI TUR')) norm['Müşteri Türü'] = row[key];
                    else if (cleanKey.includes('MUSTERI') && !cleanKey.includes('TUR')) norm['MÜŞTERİ'] = row[key];
                    else if (cleanKey.includes('TCKN') || cleanKey.includes('TC') || cleanKey.includes('VKN')) norm['TCKN'] = row[key];
                    else if (cleanKey.includes('CEP') || cleanKey.includes('TEL')) norm['CEP TEL'] = row[key];
                    // Policy type: accept "TÜR" (common in Excel), "POLICE TURU", "BRANS"
                    else if (cleanKey === 'TUR' || cleanKey.includes('POLICE TURU') || cleanKey.includes('BRANS')) norm['POLİÇE TÜRÜ'] = row[key];
                    else if (cleanKey.includes('POLICE NUMARASI') || cleanKey.includes('POLICE NO') || cleanKey.includes('NUMARASI')) norm['POLİÇE NUMARASI'] = row[key];
                    else if (cleanKey.includes('BASLANGIC') || cleanKey.includes('KESIM')) norm['POLİÇE BAŞLANGIÇ'] = row[key];
                    else if (cleanKey.includes('BITIS') || cleanKey.includes('VADESI')) norm['POLİÇE BİTİŞ'] = row[key];
                    else if (cleanKey.includes('PLAKA')) norm['PLAKA'] = row[key];
                    else if (cleanKey.includes('PRIM')) norm['PRİM'] = row[key];
                    else if (cleanKey.includes('SATIS') || cleanKey.includes('SATISCI')) norm['SATIŞÇI'] = row[key];
                    else if (cleanKey.includes('KOMISYON')) norm['KOMİSYON'] = row[key];
                    else if (cleanKey.includes('SIRKET') || cleanKey.includes('SIGORTA')) norm['ŞİRKET'] = row[key];
                    else if (cleanKey.includes('NOT') || cleanKey.includes('ACIKLAMA')) norm['AÇIKLAMA'] = row[key];
                });
                return norm;
            });

            setNormalizedData(normalized);
            setPreview(normalized.slice(0, 10));

            // Fetch reference data
            const { data: users, error: usersError } = await supabase.from('settings_users').select('id, full_name');
            const { data: companies, error: companiesError } = await supabase.from('settings_companies').select('id, name');
            const { data: products, error: productsError } = await supabase.from('insurance_products').select(`
                id,
                name_tr,
                code,
                aliases,
                category:insurance_categories(id, name_tr)
            `);

            // Debug logging
            console.log('📊 Reference Data Fetched:');
            console.log('  Users:', users?.length || 0, usersError ? `(Error: ${usersError.message})` : '');
            if (users && users.length > 0) {
                console.log('  DB Users:', users.map(u => `"${u.full_name}" (${u.id})`).join(', '));
            }
            console.log('  Companies:', companies?.length || 0, companiesError ? `(Error: ${companiesError.message})` : '');
            console.log('  Products:', products?.length || 0, productsError ? `(Error: ${productsError.message})` : '');

            const references = {
                users: users || [],
                companies: companies || [],
                products: products || []
            };

            setReferenceData(references);

            // Analyze data
            await analyzeAndSetData(normalized, references);

            showSuccess('Başarılı', `${normalized.length} satır yüklendi ve analiz edildi`);
        } catch (error: any) {
            showError('Hata', error.message || 'Excel dosyası okunamadı');
        }
    };

    const analyzeAndSetData = async (data: any[], refs: any) => {
        // Perform smart matching
        const salespeopleSet = new Set<string>();
        const companiesSet = new Set<string>();
        const productsSet = new Set<string>();

        data.forEach(row => {
            if (row['SATIŞÇI']) salespeopleSet.add(row['SATIŞÇI']);
            if (row['ŞİRKET']) companiesSet.add(row['ŞİRKET']);
            if (row['POLİÇE TÜRÜ']) productsSet.add(row['POLİÇE TÜRÜ']);
        });

        const salespeopleMap = new Map<string, MatchResult>();
        const companiesMap = new Map<string, MatchResult>();
        const productsMap = new Map<string, MatchResult>();

        salespeopleSet.forEach(sp => {
            const matchResult = matchSalesperson(sp, refs.users || []);
            salespeopleMap.set(sp, matchResult);
        });

        companiesSet.forEach(comp => {
            companiesMap.set(comp, matchCompany(comp, refs.companies || []));
        });

        productsSet.forEach(prod => {
            productsMap.set(prod, matchProduct(prod, refs.products || []));
        });

        setMappingPreview({
            salespeople: salespeopleMap,
            companies: companiesMap,
            products: productsMap
        });

        // Validate rows
        const results = await Promise.all(data.map(validateRow));
        setValidationResults(results);
        setShowMappingPreview(true);
    };



    const handleEditData = () => {
        setEditedData([...normalizedData]); // Clone data for editing
        setIsEditing(true);
        setShowMappingPreview(false); // Hide preview while editing
    };

    const handleSaveEdit = async () => {
        setNormalizedData(editedData);
        setIsEditing(false);
        // Re-analyze with new data
        if (referenceData) {
            await analyzeAndSetData(editedData, referenceData);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setShowMappingPreview(true); // Return to preview
    };

    const handleCellChange = (rowIndex: number, field: string, value: string) => {
        const newData = [...editedData];
        newData[rowIndex] = { ...newData[rowIndex], [field]: value };
        setEditedData(newData);
    };


    const validateRow = async (row: ExcelRow): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!row['MÜŞTERİ']) errors.push('Müşteri adı boş');
        if (!row['POLİÇE TÜRÜ']) warnings.push('Poliçe Türü boş');

        // Validate dates
        if (!row['POLİÇE BAŞLANGIÇ']) {
            errors.push('Başlangıç Tarihi eksik');
        } else if (!parseDate(row['POLİÇE BAŞLANGIÇ'])) {
            errors.push('Başlangıç Tarihi formatı hatalı');
        }

        if (!row['POLİÇE BİTİŞ']) {
            errors.push('Bitiş Tarihi eksik');
        } else if (!parseDate(row['POLİÇE BİTİŞ'])) {
            errors.push('Bitiş Tarihi formatı hatalı');
        }

        // Validate TCKN/VKN if present
        if (row['TCKN'] && row['Müşteri Türü']) {
            const validation = validateTcVkn(row['TCKN'].toString(), row['Müşteri Türü']);
            if (!validation.valid) {
                warnings.push(validation.error || 'TCKN/VKN geçersiz');
            }
        }

        // Log validation errors
        if (errors.length > 0) {
            const customerName = row['MÜŞTERİ'] || 'Bilinmeyen Müşteri';
            setImportLogs(prev => [...prev, {
                type: 'error',
                customer: customerName,
                message: `Validation Hatası: ${errors.join(', ')}`
            }]);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            data: row
        };
    };

    const handleMappingApproval = () => {
        setShowMappingPreview(false);
        showSuccess('Eşleştirmeler Onaylandı', 'Şimdi verileri import edebilirsiniz');
    };

    const handleImport = async () => {
        if (!mappingPreview || !referenceData) {
            showError('Hata', 'Önce dosya yükleyin ve eşleştirmeyi onaylayın');
            return;
        }

        try {
            setImporting(true);
            setProgress(0);
            setImportLogs([]); // Clear previous logs
            const validRows = validationResults.filter(r => r.valid);

            if (validRows.length === 0) {
                showError('Hata', 'Import edilecek geçerli satır yok');
                return;
            }

            let successCount = 0;
            let failedCount = 0;
            const errorLog: string[] = [];

            const processRow = async (result: ValidationResult) => {
                try {
                    const row = result.data;

                    // Get matched IDs from mapping
                    const companyMatch = row['ŞİRKET'] ? mappingPreview.companies.get(row['ŞİRKET']) : null;
                    const companyId = companyMatch?.matchedId || null;

                    const productMatch = row['POLİÇE TÜRÜ'] ? mappingPreview.products.get(row['POLİÇE TÜRÜ']) : null;
                    const productId = productMatch?.matchedId || null;
                    const categoryName = productMatch?.matchedId
                        ? (referenceData.products.find(p => p.id === productMatch.matchedId)?.category as any)?.name_tr || 'Diğer'
                        : 'Diğer';

                    const salespersonMatch = row['SATIŞÇI'] ? mappingPreview.salespeople.get(row['SATIŞÇI']) : null;
                    const salespersonId = salespersonMatch?.matchedId || null;

                    // Normalize customer name to Title Case
                    const customerName = toTitleCase(row['MÜŞTERİ']);

                    // Validate and normalize TCKN/VKN
                    let tckn = null;
                    let vkn = null;
                    let custType = row['Müşteri Türü'] || 'Bireysel';

                    if (row['TCKN']) {
                        const validation = validateTcVkn(row['TCKN'].toString(), custType);
                        if (validation.valid) {
                            if (validation.type === 'TC') {
                                tckn = validation.normalized;
                            } else {
                                vkn = validation.normalized;
                            }
                        }
                    }

                    // Format phone
                    const phoneClean = row['CEP TEL']?.toString().replace(/\D/g, '') || '';
                    const phone = phoneClean.length >= 10
                        ? `0 (${phoneClean.slice(-10, -7)}) ${phoneClean.slice(-7, -4)} ${phoneClean.slice(-4, -2)} ${phoneClean.slice(-2)}`
                        : phoneClean;

                    // Check for existing customer
                    // Fix: Use correct column based on type and handle potential duplicates gracefully
                    const isCorporate = custType === 'Kurumsal' || custType === 'corporate';
                    let existingCustomer = null;

                    // 1. Search by ID (TCKN or VKN)
                    if (isCorporate && vkn) {
                        const { data } = await supabase.from('customers').select('id').eq('vkn', vkn).limit(1).maybeSingle();
                        existingCustomer = data;
                    } else if (!isCorporate && tckn) {
                        const { data } = await supabase.from('customers').select('id').eq('tc_no', tckn).limit(1).maybeSingle();
                        existingCustomer = data;
                    }

                    // 2. Fallback: Search by Name if not found
                    if (!existingCustomer && customerName) {
                        const { data } = await supabase.from('customers').select('id').ilike('full_name', customerName).limit(1).maybeSingle();
                        existingCustomer = data;
                    }

                    let customerId = existingCustomer?.id;

                    // Create new customer if not found
                    if (!customerId) {
                        const customerTypeEnum = isCorporate ? 'KURUMSAL' : 'BIREYSEL';
                        const validContactPersonId = null; // Contact person can be set later via UI

                        const { data: newCust, error: custErr } = await supabase
                            .from('customers')
                            .insert({
                                customer_no: `GH-${Math.floor(10000 + Math.random() * 90000)}`,
                                full_name: customerName, // ✅ Title Case applied
                                phone: phone || null,
                                tc_no: isCorporate ? null : (tckn || null),
                                vkn: isCorporate ? (vkn || null) : null,
                                customer_type: customerTypeEnum,
                                contact_person_id: validContactPersonId,
                                risk_score: 10
                            })
                            .select('id')
                            .single();

                        if (custErr) throw custErr;
                        customerId = newCust.id;
                    }

                    // Prepare description
                    let desc = row['AÇIKLAMA'] || '';
                    if (row['PLAKA']) desc = `Plaka: ${row['PLAKA']} - ${desc}`;

                    // Parse dates
                    const startDate = parseDate(row['POLİÇE BAŞLANGIÇ']);
                    const endDate = parseDate(row['POLİÇE BİTİŞ']);

                    // Detect policy status
                    const status = detectPolicyStatus(
                        row['POLİÇE NUMARASI'],
                        startDate ? new Date(startDate) : null,
                        endDate ? new Date(endDate) : null
                    );

                    // Handle commission
                    let commissionAmount = 0;
                    if (row['KOMİSYON'] && row['KOMİSYON'] > 0) {
                        commissionAmount = Number(row['KOMİSYON']);
                    }
                    // Otherwise, leave as 0 (can be calculated later)

                    // Insert policy
                    const policyNumber = row['POLİÇE NUMARASI'] && row['POLİÇE NUMARASI'] !== ''
                        ? String(row['POLİÇE NUMARASI']).toUpperCase()
                        : `DRAFT-${Date.now()}`;

                    const { error: polErr } = await supabase
                        .from('policies')
                        .insert({
                            customer_id: customerId,
                            company_id: companyId,
                            product_id: productId,
                            policy_no: policyNumber,
                            type: categoryName,
                            start_date: startDate,
                            end_date: endDate,
                            premium: Number(row['PRİM']) || 0,
                            commission_amount: commissionAmount,
                            status: status,
                            description: desc,
                            salesperson_id: salespersonId
                        });

                    if (polErr) throw polErr;

                    setImportLogs(prev => [...prev, {
                        type: 'success',
                        customer: customerName,
                        message: `Poliçe ${policyNumber} başarıyla eklendi`
                    }]);

                    return { success: true };
                } catch (error: any) {
                    const row = result.data;
                    const customerName = row['MÜŞTERİ'] || 'Bilinmeyen';
                    let msg = error.message;
                    if (msg.includes('end_date') && msg.includes('null')) msg = 'Bitiş Tarihi geçersiz';
                    if (msg.includes('start_date') && msg.includes('null')) msg = 'Başlangıç Tarihi geçersiz';

                    setImportLogs(prev => [...prev, {
                        type: 'error',
                        customer: customerName,
                        message: msg
                    }]);

                    return { success: false, error: `${result.data['MÜŞTERİ']}: ${msg}` };
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

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'exact': return 'text-green-600 bg-green-50';
            case 'high': return 'text-blue-600 bg-blue-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'low': return 'text-orange-600 bg-orange-50';
            case 'none': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getConfidenceLabel = (confidence: string) => {
        switch (confidence) {
            case 'exact': return '✓ TAM';
            case 'high': return '⚡ YÜKSEK';
            case 'medium': return '⚠️ ORTA';
            case 'low': return '❌ DÜŞÜK';
            case 'none': return '⛔ YOK';
            default: return confidence;
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Veri Aktar</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Excel ile akıllı veri yükleme - İki aşamalı onay sistemi</p>
                </div>
            </div>

            {/* Upload Area */}
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

            {/* Mapping Preview Modal */}
            {showMappingPreview && mappingPreview && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Eye className="w-6 h-6" />
                                Eşleştirme Önizlemesi
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">Lütfen eşleştirmeleri kontrol edin ve onaylayın</p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Salespeople Mapping */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                                    👥 Satışçı Eşleştirmeleri ({mappingPreview.salespeople.size})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-700">
                                            <tr>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Excel'den</th>
                                                <th className="text-center p-3 text-slate-600 dark:text-slate-300">→</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Eşleşen Satışçı</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from(mappingPreview.salespeople.entries()).map(([key, match]) => (
                                                <tr key={key} className="border-b border-slate-100 dark:border-slate-700">
                                                    <td className="p-3 font-medium">{match.excelValue}</td>
                                                    <td className="p-3 text-center"><ArrowRight className="w-4 h-4 mx-auto" /></td>
                                                    <td className="p-3">{match.matchedName || <span className="text-slate-400">-</span>}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getConfidenceColor(match.confidence)}`}>
                                                            {getConfidenceLabel(match.confidence)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Companies Mapping */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                                    🏢 Şirket Eşleştirmeleri ({mappingPreview.companies.size})
                                </h3>
                                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                                            <tr>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Excel'den</th>
                                                <th className="text-center p-3 text-slate-600 dark:text-slate-300">→</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Eşleşen Şirket</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from(mappingPreview.companies.entries()).map(([key, match]) => (
                                                <tr key={key} className="border-b border-slate-100 dark:border-slate-700">
                                                    <td className="p-3 font-medium">{match.excelValue}</td>
                                                    <td className="p-3 text-center"><ArrowRight className="w-4 h-4 mx-auto" /></td>
                                                    <td className="p-3">{match.matchedName || <span className="text-slate-400">-</span>}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getConfidenceColor(match.confidence)}`}>
                                                            {getConfidenceLabel(match.confidence)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Products Mapping */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                                    📋 Poliçe Türü Eşleştirmeleri ({mappingPreview.products.size})
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-700">
                                            <tr>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Excel'den</th>
                                                <th className="text-center p-3 text-slate-600 dark:text-slate-300">→</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Eşleşen Tür</th>
                                                <th className="text-left p-3 text-slate-600 dark:text-slate-300">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from(mappingPreview.products.entries()).map(([key, match]) => (
                                                <tr key={key} className="border-b border-slate-100 dark:border-slate-700">
                                                    <td className="p-3 font-medium">{match.excelValue}</td>
                                                    <td className="p-3 text-center"><ArrowRight className="w-4 h-4 mx-auto" /></td>
                                                    <td className="p-3">{match.matchedName || <span className="text-slate-400">-</span>}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getConfidenceColor(match.confidence)}`}>
                                                            {getConfidenceLabel(match.confidence)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-4 justify-end">
                            <button
                                onClick={handleEditData}
                                className="px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="w-5 h-5" />
                                Verileri Düzenle
                            </button>
                            <button
                                onClick={handleMappingApproval}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                Onaylıyorum - Devam Et
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Editor Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Edit2 className="w-6 h-6 text-blue-600" />
                                    Verileri Düzenle
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {editedData.length} satır veriyi manuel olarak düzenliyorsunuz
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-900/20"
                                >
                                    <Check className="w-4 h-4" />
                                    Değişiklikleri Kaydet ve Analiz Et
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-12">#</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 min-w-[200px]">Müşteri Adı</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-32">TCKN/VKN</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-24">Tür</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 min-w-[150px]">Şirket</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 min-w-[150px]">Poliçe Türü</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-40">Poliçe No</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-32">Başlangıç</th>
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-32">Bitiş</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {editedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-2 text-slate-500 text-center border-r border-slate-100 dark:border-slate-800">{idx + 1}</td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="text"
                                                    value={row['MÜŞTERİ'] || ''}
                                                    onChange={(e) => handleCellChange(idx, 'MÜŞTERİ', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="text"
                                                    value={row['TCKN'] || ''}
                                                    onChange={(e) => handleCellChange(idx, 'TCKN', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all font-mono"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <select
                                                    value={row['Müşteri Türü'] || 'Bireysel'}
                                                    onChange={(e) => handleCellChange(idx, 'Müşteri Türü', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                >
                                                    <option value="Bireysel">Bireysel</option>
                                                    <option value="Kurumsal">Kurumsal</option>
                                                </select>
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="text"
                                                    value={row['ŞİRKET'] || ''}
                                                    onChange={(e) => handleCellChange(idx, 'ŞİRKET', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="text"
                                                    value={row['POLİÇE TÜRÜ'] || ''}
                                                    onChange={(e) => handleCellChange(idx, 'POLİÇE TÜRÜ', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="text"
                                                    value={row['POLİÇE NUMARASI'] || ''}
                                                    onChange={(e) => handleCellChange(idx, 'POLİÇE NUMARASI', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all font-mono"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="date"
                                                    value={row['POLİÇE BAŞLANGIÇ'] ? parseDate(row['POLİÇE BAŞLANGIÇ']) || '' : ''}
                                                    onChange={(e) => handleCellChange(idx, 'POLİÇE BAŞLANGIÇ', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                />
                                            </td>
                                            <td className="p-1 border-r border-slate-100 dark:border-slate-800">
                                                <input
                                                    type="date"
                                                    value={row['POLİÇE BİTİŞ'] ? parseDate(row['POLİÇE BİTİŞ']) || '' : ''}
                                                    onChange={(e) => handleCellChange(idx, 'POLİÇE BİTİŞ', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-transparent focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-blue-500 rounded outline-none transition-all"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
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
                <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-lg">
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
                        Lütfen bekleyiniz, sayfayı kapatmayın.
                    </p>
                </div>
            )}

            {/* Import Logs Panel */}
            {importLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import Logları</span>
                        <span className="text-xs text-slate-500">{importLogs.length} kayıt</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {importLogs.map((log, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border ${log.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    {log.type === 'success' ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{log.customer}</div>
                                        <div className={`text-xs ${log.type === 'success'
                                            ? 'text-green-700 dark:text-green-400'
                                            : 'text-red-700 dark:text-red-400'
                                            }`}>
                                            {log.message}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Import Button */}
            {validCount > 0 && !importing && !importResults && !showMappingPreview && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="px-8 py-4 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-3 text-lg font-semibold disabled:opacity-50 disabled:scale-100"
                    >
                        <Database className="w-5 h-5" />
                        {validCount} Kaydı Import Et
                    </button>
                </div>
            )}

            {/* Results Section */}
            {importResults && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
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
                                    Hata Raporunu İndir
                                </button>
                                <button
                                    onClick={() => setShowErrorList(!showErrorList)}
                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Info className="w-4 h-4" />
                                    {showErrorList ? 'Gizle' : 'Hataları Göster'}
                                </button>
                            </div>

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

            {/* Preview Table */}
            {preview.length > 0 && !importing && !importResults && !showMappingPreview && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 overflow-hidden">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Önizleme (İlk 10 Satır)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Müşteri</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Tür</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Poliçe Türü</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Şirket</th>
                                    <th className="text-left p-3 text-slate-600 dark:text-slate-400">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => {
                                    const validation = validationResults[i];
                                    return (
                                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-3 font-medium text-slate-800 dark:text-white">{toTitleCase(row['MÜŞTERİ'])}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row['Müşteri Türü']}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row['POLİÇE TÜRÜ']}</td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">{row['ŞİRKET']}</td>
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
