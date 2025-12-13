
export enum InsuranceType {
  TRAFIK = 'Trafik Sigortası',
  KASKO = 'Kasko',
  SAGLIK = 'Tamamlayıcı Sağlık',
  KONUT = 'Konut & DASK',
  SEYAHAT = 'Seyahat Sağlık',
  ISYERI = 'İşyeri Sigortası'
}

export enum QuoteStatus {
  PENDING = 'Bekliyor',
  COMPLETED = 'Tamamlandı',
  PURCHASED = 'Satın Alındı',
  REJECTED = 'Reddedildi'
}

export type CustomerType = 'Bireysel' | 'Kurumsal';

export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
}

export interface CustomerAsset {
  id: string;
  type: 'Araç' | 'Konut' | 'İşyeri';
  description: string; // "34 ABC 12" or "Sakarya Ofis"
  details: string; // "2020 BMW 320i" or "Adapazarı Merkez..."
  value?: number;
  uavtCode?: string; // National Address Database Code (Optional)
}

export interface CustomerNote {
  id: string;
  date: string;
  type: 'Görüşme' | 'Not' | 'WhatsApp' | 'Email';
  content: string;
  createdBy: string;
}

export interface Customer {
  id: string;
  customerNo: string; // Unique CRM ID
  // Customer type - UPPERCASE only
  customerType: 'BIREYSEL' | 'KURUMSAL';

  // TC/VKN Fields - Mutually exclusive
  tcNo?: string; // Bireysel için TC Kimlik No (11 hane)
  vkn?: string;  // Kurumsal için Vergi No (10 hane)

  fullName: string; // Ad Soyad or Unvan
  name?: string; // Alias for fullName

  // Contact person - KURUMSAL only
  contactPersonId?: string; // Foreign key to customers(id)
  email: string;
  phone: string;
  address?: string;
  city?: string;
  taxOffice?: string; // For corporate
  plate?: string; // Primary plate
  riskScore: number; // 0-100 (High is bad)

  // Family/Group Logic
  familyGroupId?: string;
  familyGroup?: FamilyGroup;

  tags: string[];
  assets: CustomerAsset[];
  notes: CustomerNote[];
  createdAt: string;
  activePoliciesCount?: number;
  policies?: Policy[];

}

export interface QuoteOffer {
  companyName: string;
  companyLogo: string;
  price: number;
  coverageScore: number; // 1-100
  features: string[];
  isBestPrice?: boolean;
  isBestCoverage?: boolean;
}

export interface Policy {
  id: string;
  policyNo: string;
  customerId?: string;
  customerName: string;
  companyId?: string;
  company: string;
  companyLogo?: string;
  companyDomain?: string;
  type: InsuranceType;
  productName?: string; // Product name from insurance_products
  startDate: string;
  endDate: string;
  premium: number;
  commissionAmount?: number;
  status: 'Active' | 'Expired' | 'Cancelled' | 'Potential';
  description?: string;
  salespersonId?: string | null;
  categoryId?: string;
  productId?: string;
  daysLeft?: number; // Used for frontend sorting
  renewalDate?: string;
  tags?: string[];
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  activePolicies: number;
  pendingQuotes: number;
  conversionRate: number;
}

// New Types for Settings

export interface CompanyCollateral {
  id: string;
  companyId: string;
  type: 'Nakit' | 'Teminat Mektubu' | 'DBS';
  amount: number;
  currency: 'TL' | 'USD' | 'EUR';
}

export interface CompanySettings {
  id: string;
  name: string;
  domain?: string; // e.g. allianz.com.tr
  logo: string;
  isActive: boolean;
  agencyNo: string;
  apiKey?: string;
  apiSecret?: string;
  commissions: Record<string, number>;
  collaterals: CompanyCollateral[]; // Array for multi-collateral support
}

export interface BankAccount {
  id: string;
  branchName: string;
  accountNo: string;
  iban: string;
  currency: 'TL' | 'USD' | 'EUR' | 'GBP' | 'CHF';
  accountName?: string;

  accountType?: string;
}

export interface BankSettings {
  id: string;
  name: string;
  domain?: string;
  swiftCode?: string;
  logo: string;
  isActive: boolean;
  accounts: BankAccount[];
}

export type UserRole = 'Admin' | 'Acente Yetkilisi' | 'Operasyon' | 'Stajyer' | 'Satışçı' | 'Firma Ortağı';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roles: UserRole[];
  isActive: boolean;
  lastLogin?: string;
}

// Financial Analysis Types
export type TransactionType = 'Income' | 'Expense';
export type TransactionCategory = 'Commission' | 'Rent' | 'Utilities' | 'Salary' | 'Marketing' | 'Other';
export type PaymentMethod = 'Cash' | 'Bank';

export interface FinancialTransaction {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  relatedCompanyId?: string;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
}

export interface ProfitDistribution {
  agentShare: number;
  companyShare: number;
  partnerShare: number;
}

// New Types for Policy Configuration
export type PolicyCategory = 'Elementer' | 'Sağlık' | 'Hayat & Emeklilik' | 'Diğer';

export interface PolicyTypeConfig {
  id: string;
  name: string;
  category: PolicyCategory;
  isActive: boolean;
  supportingCompanyIds: string[];
}

export interface BrandSettings {
  id?: string;
  companyName: string;
  logoUrl?: string;
  address?: string;
  taxNo?: string;
  phone?: string;
  website?: string;
  themePreference: 'light' | 'dark';
  commissionSettings?: CommissionSettings;
}

// ==========================================
// DATA QUALITY & STANDARDIZATION TYPES
// ==========================================

export interface InsuranceCategory {
  id: string;
  code: string;
  nameTr: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceProduct {
  id: string;
  categoryId: string;
  code: string;
  nameTr: string;
  aliases?: string[];
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: InsuranceCategory;
}

export interface CompanyProduct {
  id: string;
  companyId: string;
  productId: string;
  isActive: boolean;
  commissionRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  company?: CompanySettings;
  product?: InsuranceProduct;
}

// ==========================================
// FINANCIAL MANAGEMENT TYPES
// ==========================================

export interface Partner {
  id: string;
  name: string;
  tcVkn?: string; // Turkish ID or Tax ID
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  currentShare?: PartnerShare; // Most recent active share
}

export interface PartnerShare {
  id: string;
  partnerId: string;
  sharePercentage: number; // 0-100
  effectiveFrom: string; // ISO date
  effectiveUntil?: string; // ISO date, null = currently active
  notes?: string;
  createdAt: string;
}

export interface CommissionDistribution {
  id: string;
  policyId: string;
  totalCommission: number;

  // Salesperson allocation
  salespersonId?: string;
  salespersonAmount: number;
  salespersonPercentage: number;

  // Partners pool allocation
  partnersPoolAmount: number;
  partnersPercentage: number;

  // Company treasury allocation
  companyPoolAmount: number;
  companyPercentage: number;

  distributionDate: string; // ISO date
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;

  // Relations (populated when needed)
  policy?: Policy;
  salesperson?: { id: string; name: string; };
  partnerAllocations?: PartnerCommissionAllocation[];
  paymentId?: string; // Links to commission_payments
}


export interface PartnerCommissionAllocation {
  id: string;
  distributionId: string;
  partnerId: string;
  allocatedAmount: number;
  sharePercentage: number; // Partner's share at that time

  // Payment tracking
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string; // ISO date
  paymentMethod?: string; // 'Banka Transferi', 'Nakit', etc.
  paymentReference?: string; // Receipt number, transaction ID
  paymentId?: string; // Links to commission_payments
  notes?: string;
  createdAt: string;

  // Relations
  partner?: Partner;
  distribution?: CommissionDistribution;
}

export interface CommissionSettings {
  salespersonPercentage: number; // Default 30
  partnersPercentage: number; // Default 30
  companyPercentage: number; // Default 40
}

export interface FinancialSummary {
  // Revenue metrics
  totalPremium: number; // Total policy premiums
  totalCommission: number; // Total commissions earned

  // Distribution breakdown
  salespersonTotal: number; // Total allocated to sales staff
  partnersTotal: number; // Total allocated to partners
  companyTotal: number; // Total to company treasury

  // Payment metrics
  pendingPayments: number; // Unpaid commission amount
  paidPayments: number; // Paid commission amount

  // Period-specific (if filtered)
  periodStart?: string;
  periodEnd?: string;
}

export interface PartnerFinancialDetail {
  partner: Partner;
  totalAllocated: number; // Lifetime allocated amount
  totalPaid: number; // Lifetime paid amount
  totalPending: number; // Pending payment amount
  recentAllocations: PartnerCommissionAllocation[]; // Last N allocations
  monthlyBreakdown?: Array<{
    month: string; // YYYY-MM
    allocated: number;
    paid: number;
  }>;
}

export interface CommissionPayment {
  id: string;
  payment_no: number;
  recipient_type: 'salesperson' | 'partner' | 'company';
  recipient_id: string;
  recipient_name: string;
  amount: number;
  payment_date: string; // ISO timestamp
  status: 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  payment_description?: string;
  description?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  customer_id?: string;
  title: string;
  description?: string;
  due_date: string;
  is_completed: boolean;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  customer?: {
    full_name: string;
  };
}