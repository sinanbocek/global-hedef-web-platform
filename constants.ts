
import { InsuranceType, Policy, CompanySettings, UserProfile, FinancialTransaction, ProfitDistribution, BankSettings, PolicyTypeConfig, Customer, FamilyGroup } from './types';

export const COMPANY_DETAILS = {
  name: "GLOBAL HEDEF SİGORTA ARACILIK HİZMETLERİ A.Ş.",
  shortName: "Global Hedef",
  domain: "globalhedefsigorta.com",
  address: "Semerciler Mah. Parlak Sok. No:37/C, Adapazarı - SAKARYA",
  phone: "+90 530 377 10 54",
  email: "info@globalhedef.com",
  colors: {
    primary: "#003087",
    secondary: "#00C2FF",
    accent: "#FF6B00"
  }
};

export const DEFAULT_PROFIT_DISTRIBUTION: ProfitDistribution = {
  agentShare: 20,
  companyShare: 50,
  partnerShare: 30
};

export const RAW_BANKS = [
  { id: 'isbank', name: 'Türkiye İş Bankası', domain: 'isbank.com.tr' },
  { id: 'ziraat', name: 'Ziraat Bankası', domain: 'ziraatbank.com.tr' },
  { id: 'garanti', name: 'Garanti BBVA', domain: 'garantibbva.com.tr' },
  { id: 'akbank', name: 'Akbank', domain: 'akbank.com' },
  { id: 'vakif', name: 'VakıfBank', domain: 'vakifbank.com.tr' },
  { id: 'ykb', name: 'Yapı Kredi', domain: 'yapikredi.com.tr' },
  { id: 'qnb', name: 'QNB Finansbank', domain: 'qnbfinansbank.com' },
  { id: 'deniz', name: 'DenizBank', domain: 'denizbank.com' },
  { id: 'halk', name: 'Halkbank', domain: 'halkbank.com.tr' },
  { id: 'teb', name: 'TEB', domain: 'teb.com.tr' },
  { id: 'kuveyt', name: 'Kuveyt Türk', domain: 'kuveytturk.com.tr' },
];

// Initial empty state, data will be loaded from Supabase
export const INITIAL_COMPANY_SETTINGS: CompanySettings[] = [];

export const INITIAL_BANK_SETTINGS: BankSettings[] = RAW_BANKS.map(bank => ({
  id: bank.id,
  name: bank.name,
  logo: `https://logo.clearbit.com/${bank.domain}`,
  isActive: false,
  accounts: []
}));

export const INITIAL_POLICY_TYPES: PolicyTypeConfig[] = [
  // Elementer
  { id: 'trafik', name: 'Trafik Sigortası', category: 'Elementer', isActive: true, supportingCompanyIds: [] },
  { id: 'kasko', name: 'Kasko', category: 'Elementer', isActive: true, supportingCompanyIds: [] },
  { id: 'konut', name: 'Konut & DASK', category: 'Elementer', isActive: true, supportingCompanyIds: [] },
  { id: 'isyeri', name: 'İşyeri Sigortası', category: 'Elementer', isActive: true, supportingCompanyIds: [] },
  { id: 'insaat', name: 'İnşaat All-Risk', category: 'Elementer', isActive: true, supportingCompanyIds: [] },
  { id: 'nakliyat', name: 'Nakliyat', category: 'Elementer', isActive: true, supportingCompanyIds: [] },

  // Sağlık
  { id: 'tss', name: 'Tamamlayıcı Sağlık', category: 'Sağlık', isActive: true, supportingCompanyIds: [] },
  { id: 'oss', name: 'Özel Sağlık', category: 'Sağlık', isActive: true, supportingCompanyIds: [] },
  { id: 'seyahat', name: 'Seyahat Sağlık', category: 'Sağlık', isActive: true, supportingCompanyIds: [] },

  // Hayat & Emeklilik
  { id: 'bes', name: 'Bireysel Emeklilik (BES)', category: 'Hayat & Emeklilik', isActive: true, supportingCompanyIds: [] },
  { id: 'hayat_birikimli', name: 'Birikimli Hayat', category: 'Hayat & Emeklilik', isActive: true, supportingCompanyIds: [] },
  { id: 'hayat_prim', name: 'Prim İadeli Hayat', category: 'Hayat & Emeklilik', isActive: true, supportingCompanyIds: [] },
];

export const INSURANCE_COMPANIES = INITIAL_COMPANY_SETTINGS; // Backward compatibility

export const MOCK_POLICIES: Policy[] = [
  { id: '1', customerId: 'c1', policyNo: 'POL-2023-001', type: InsuranceType.TRAFIK, customerName: 'Ahmet Yılmaz', company: 'Allianz', startDate: '2023-05-12', endDate: '2024-05-12', premium: 4500, status: 'Active', commissionAmount: 225 },
  { id: '2', customerId: 'c2', policyNo: 'POL-2023-089', type: InsuranceType.KASKO, customerName: 'Ayşe Demir', company: 'Axa Sigorta', startDate: '2023-08-01', endDate: '2024-08-01', premium: 12400, status: 'Active', commissionAmount: 1488 },
  { id: '3', customerId: 'c3', policyNo: 'POL-2023-112', type: InsuranceType.SAGLIK, customerName: 'Mehmet Kaya', company: 'Anadolu Sigorta', startDate: '2023-11-15', endDate: '2024-11-15', premium: 8900, status: 'Active', commissionAmount: 890 },
  { id: '4', customerId: 'c1', policyNo: 'POL-2022-990', type: InsuranceType.KONUT, customerName: 'Ahmet Yılmaz', company: 'Sompo Japan', startDate: '2022-10-01', endDate: '2023-10-01', premium: 450, status: 'Expired', commissionAmount: 67.5 },
  { id: '5', customerId: 'c4', policyNo: 'POL-2024-022', type: InsuranceType.TRAFIK, customerName: 'Caner Erkin', company: 'Türkiye Sigorta', startDate: '2024-01-20', endDate: '2025-01-20', premium: 5200, status: 'Active', commissionAmount: 260 },
  { id: '6', customerId: 'c5', policyNo: 'POL-2024-033', type: InsuranceType.ISYERI, customerName: 'ABC Lojistik Ltd. Şti.', company: 'Mapfre', startDate: '2024-02-01', endDate: '2025-02-01', premium: 25000, status: 'Active', commissionAmount: 3750 },
];

export const MOCK_FAMILY_GROUPS: FamilyGroup[] = [
  { id: 'f1', name: 'Genel Müşteriler', description: 'Bağımsız bireysel müşteriler' },
  { id: 'f2', name: 'Yılmaz Ailesi', description: 'Ahmet ve Mert Yılmaz grubu' },
  { id: 'f3', name: 'ABC Lojistik Grubu', description: 'Kurumsal filo grubu' }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1', customerNo: 'GH-1001', type: 'Bireysel', tcKn: '12345678901', fullName: 'Ahmet Yılmaz', email: 'ahmet@gmail.com', phone: '0532 123 45 67',
    riskScore: 20, tags: ['Sadık Müşteri', 'Ödeme Düzenli'], createdAt: '2022-01-15', familyGroupId: 'f2',
    assets: [
      { id: 'a1', type: 'Araç', description: '34 ABC 12', details: '2020 BMW 320i', value: 2500000 },
      { id: 'a2', type: 'Konut', description: 'Serdivan Ev', details: 'Yazlık Mah. 12. Cadde', value: 4000000 }
    ],
    notes: [
      { id: 'n1', date: '2024-01-10', type: 'Görüşme', content: 'Kasko yenilemesi için arandı, fiyat bekleniyor.', createdBy: 'Mert Yılmaz' },
      { id: 'n2', date: '2023-05-12', type: 'WhatsApp', content: 'Poliçe PDF gönderildi.', createdBy: 'Ayşe Kaya' }
    ]
  },
  {
    id: 'c2', customerNo: 'GH-1002', type: 'Bireysel', tcKn: '23456789012', fullName: 'Ayşe Demir', email: 'ayse.demir@hotmail.com', phone: '0544 234 56 78',
    riskScore: 45, tags: ['Yeni Evli'], createdAt: '2023-06-20', familyGroupId: 'f1',
    assets: [{ id: 'a3', type: 'Araç', description: '54 ZZ 999', details: '2018 Fiat Egea', value: 800000 }],
    notes: []
  },
  {
    id: 'c3', customerNo: 'GH-1003', type: 'Bireysel', tcKn: '34567890123', fullName: 'Mehmet Kaya', email: 'mkaya@yahoo.com', phone: '0555 345 67 89',
    riskScore: 80, tags: ['Hasarlı', 'Geç Ödeme'], createdAt: '2023-11-01', familyGroupId: 'f1',
    assets: [],
    notes: [{ id: 'n3', date: '2023-12-01', type: 'Not', content: 'Ödeme için 3 kere arandı, ulaşılmadı.', createdBy: 'Operasyon' }]
  },
  {
    id: 'c4', customerNo: 'GH-1004', type: 'Bireysel', tcKn: '45678901234', fullName: 'Caner Erkin', email: 'caner@futbol.com', phone: '0533 456 78 90',
    riskScore: 10, tags: [], createdAt: '2024-01-10', familyGroupId: 'f1',
    assets: [{ id: 'a4', type: 'Araç', description: '34 FB 1907', details: '2023 Mercedes G-Wagon', value: 12000000 }],
    notes: []
  },
  {
    id: 'c5', customerNo: 'GH-2001', type: 'Kurumsal', tcKn: '9876543210', fullName: 'ABC Lojistik Ltd. Şti.', contactPerson: 'Hasan Yılmaz', email: 'info@abclojistik.com', phone: '0264 222 33 44',
    taxOffice: 'Ali Fuat Cebesoy', riskScore: 30, tags: ['Filo', 'Yüksek Ciro'], createdAt: '2020-05-15', familyGroupId: 'f3',
    assets: [
      { id: 'a5', type: 'İşyeri', description: 'Merkez Depo', details: 'Hanlı OSB', value: 25000000 },
      { id: 'a6', type: 'Araç', description: '54 AA 100', details: 'Filo - 10 Çekici', value: 50000000 }
    ],
    notes: [{ id: 'n4', date: '2024-02-01', type: 'Görüşme', content: 'Yıllık filo poliçesi yenilendi.', createdBy: 'Mert Yılmaz' }]
  }
];

export const MOCK_USERS: UserProfile[] = [
  { id: '1', fullName: 'Mert Yılmaz', email: 'mert@globalhedef.com', phone: '0532 100 20 30', roles: ['Admin'], isActive: true, lastLogin: '2023-10-25 09:00' },
  { id: '2', fullName: 'Ayşe Kaya', email: 'ayse@globalhedef.com', phone: '0544 200 30 40', roles: ['Acente Yetkilisi'], isActive: true, lastLogin: '2023-10-24 14:30' },
  { id: '3', fullName: 'Mehmet Demir', email: 'mehmet@globalhedef.com', phone: '0555 300 40 50', roles: ['Operasyon'], isActive: false, lastLogin: '2023-09-10 11:20' },
];

export const MOCK_TRANSACTIONS: FinancialTransaction[] = [
  { id: 't1', date: '2024-01-15', type: 'Expense', category: 'Rent', amount: 15000, description: 'Ofis Kirası - Ocak 2024', paymentMethod: 'Bank', bankAccountId: 'isbank_1' },
  { id: 't2', date: '2024-01-20', type: 'Expense', category: 'Utilities', amount: 3200, description: 'Elektrik & İnternet Faturası', paymentMethod: 'Cash' },
  { id: 't3', date: '2024-01-30', type: 'Income', category: 'Commission', amount: 45000, description: 'Allianz Ocak Ayı Hakediş', relatedCompanyId: 'allianz', paymentMethod: 'Bank', bankAccountId: 'garanti_1' },
];
