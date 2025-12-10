-- ============================================
-- VERİ KALİTESİ VE STANDARTLAŞMA SİSTEMİ
-- ============================================
-- Bu script sigorta ürünlerinin standardizasyonu,
-- veri validasyonu ve kalite kontrolü için gerekli
-- tablolar ve fonksiyonları oluşturur.

-- ============================================
-- 1. SİGORTA KATEGORİLERİ TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS public.insurance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name_tr VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_insurance_categories_active 
  ON public.insurance_categories(is_active, display_order);

-- RLS
ALTER TABLE public.insurance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.insurance_categories FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated" ON public.insurance_categories FOR ALL USING (true);

-- ============================================
-- 2. SİGORTA ÜRÜNLERİ TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS public.insurance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.insurance_categories(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  name_tr VARCHAR(200) NOT NULL,
  aliases TEXT[],  -- Alternatif isimler (fuzzy matching için)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_products_category 
  ON public.insurance_products(category_id);
CREATE INDEX IF NOT EXISTS idx_insurance_products_active 
  ON public.insurance_products(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_insurance_products_aliases 
  ON public.insurance_products USING gin(aliases);

-- RLS
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.insurance_products FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated" ON public.insurance_products FOR ALL USING (true);

-- ============================================
-- 3. ŞİRKET-ÜRÜN İLİŞKİSİ TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.insurance_products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(5,2),  -- Özel komisyon oranı (opsiyonel)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_products_company 
  ON public.company_products(company_id);
CREATE INDEX IF NOT EXISTS idx_company_products_product 
  ON public.company_products(product_id);
CREATE INDEX IF NOT EXISTS idx_company_products_active 
  ON public.company_products(is_active);

-- RLS
ALTER TABLE public.company_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.company_products FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated" ON public.company_products FOR ALL USING (true);

-- ============================================
-- 4. MEVCUT POLICIES TABLOSUNU GÜNCELLE
-- ============================================
ALTER TABLE public.policies 
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.insurance_products(id),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.insurance_categories(id);

CREATE INDEX IF NOT EXISTS idx_policies_product ON public.policies(product_id);
CREATE INDEX IF NOT EXISTS idx_policies_category ON public.policies(category_id);

-- ============================================
-- 5. CUSTOMERS TABLOSUNU GÜNCELLE
-- ============================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) CHECK (customer_type IN ('BIREYSEL', 'KURUMSAL')),
  ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11),
  ADD COLUMN IF NOT EXISTS vkn VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tax_office VARCHAR(200);

-- TC veya VKN constraint (birisi olmalı)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_tc_or_vkn'
  ) THEN
    ALTER TABLE public.customers 
    ADD CONSTRAINT check_tc_or_vkn CHECK (
      (customer_type = 'BIREYSEL' AND tc_no IS NOT NULL) OR
      (customer_type = 'KURUMSAL' AND vkn IS NOT NULL) OR
      (tc_no IS NULL AND vkn IS NULL)  -- Mevcut veriler için geçici olarak izin ver
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_tc ON public.customers(tc_no);
CREATE INDEX IF NOT EXISTS idx_customers_vkn ON public.customers(vkn);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);

-- ============================================
-- 6. VALIDASYON FONKSİYONLARI
-- ============================================

-- TC Kimlik No Doğrulama
CREATE OR REPLACE FUNCTION public.validate_tc_no(tc TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  -- Null kontrolü
  IF tc IS NULL THEN RETURN FALSE; END IF;
  
  -- 11 haneli olmalı
  IF LENGTH(tc) != 11 THEN RETURN FALSE; END IF;
  
  -- Tamamı rakam olmalı
  IF tc !~ '^\d{11}$' THEN RETURN FALSE; END IF;
  
  -- İlk hane 0 olamaz
  IF SUBSTRING(tc, 1, 1) = '0' THEN RETURN FALSE; END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- VKN Doğrulama
CREATE OR REPLACE FUNCTION public.validate_vkn(vkn TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  IF vkn IS NULL THEN RETURN FALSE; END IF;
  RETURN LENGTH(vkn) = 10 AND vkn ~ '^\d{10}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Email Validasyonu
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  IF email IS NULL THEN RETURN TRUE; END IF;  -- Email opsiyonel
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Telefon Validasyonu (Türkiye formatı)
CREATE OR REPLACE FUNCTION public.validate_phone_tr(phone TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  IF phone IS NULL THEN RETURN TRUE; END IF;  -- Telefon opsiyonel
  -- Sadece rakam, boşluk, tire, parantez
  RETURN phone ~ '^[0-9\s\-\(\)]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. FUZZY MATCHING FONKSİYONU
-- ============================================
-- Ürün bulmak için (Excel import'ta kullanılacak)
CREATE OR REPLACE FUNCTION public.find_product_by_name(search_name TEXT)
RETURNS UUID AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Önce exact match
  SELECT id INTO v_product_id
  FROM public.insurance_products
  WHERE UPPER(name_tr) = UPPER(search_name)
    AND is_active = true
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RETURN v_product_id;
  END IF;
  
  -- Aliases'ta ara
  SELECT id INTO v_product_id
  FROM public.insurance_products
  WHERE UPPER(search_name) = ANY(
    SELECT UPPER(unnest(aliases))
  )
  AND is_active = true
  LIMIT 1;
  
  IF v_product_id IS NOT NULL THEN
    RETURN v_product_id;
  END IF;
  
  -- Partial match (LIKE)
  SELECT id INTO v_product_id
  FROM public.insurance_products
  WHERE UPPER(name_tr) LIKE '%' || UPPER(search_name) || '%'
    AND is_active = true
  ORDER BY LENGTH(name_tr)  -- En kısa eşleşmeyi al
  LIMIT 1;
  
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. SEED DATA - SİGORTA KATEGORİLERİ
-- ============================================
INSERT INTO public.insurance_categories (code, name_tr, description, display_order) VALUES
  ('HAYAT', 'Hayat Sigortası', 'Hayat branşı ürünleri', 1),
  ('ELEMENTER', 'Elementer Sigorta', 'Elementer branşı ürünleri', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 9. SEED DATA - SİGORTA ÜRÜNLERİ
-- ============================================

-- HAYAT BRANŞI ÜRÜNLERİ
INSERT INTO public.insurance_products (category_id, code, name_tr, aliases, display_order) VALUES
  (
    (SELECT id FROM public.insurance_categories WHERE code='HAYAT'),
    'BES',
    'Bireysel Emeklilik',
    ARRAY['BES', 'EMEKLILIK', 'BIREYSEL EMEKLILIK'],
    1
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='HAYAT'),
    'OSS_HAYAT',
    'Özel Sağlık Sigortası (Hayat)',
    ARRAY['ÖSS', 'ÖZEL SAĞLIK', 'OSS'],
    2
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='HAYAT'),
    'PRIM_IADELI_HAYAT',
    'Prim İadeli Hayat Sigortası',
    ARRAY['PRIM IADELI', 'PRIM İADELİ HAYAT', 'PRİM İADELİ'],
    3
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='HAYAT'),
    'HAYAT',
    'Hayat Sigortası',
    ARRAY['HAYAT', 'HAYAT SIGORTASI'],
    4
  )
ON CONFLICT (code) DO NOTHING;

-- ELEMENTER BRANŞI ÜRÜNLERİ
INSERT INTO public.insurance_products (category_id, code, name_tr, aliases, display_order) VALUES
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'KASKO',
    'Kasko Sigortası',
    ARRAY['KASKO', 'MOT.ARAÇ.KASKO', 'MOTORİZE ARAÇ KASKO'],
    1
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'ZTS',
    'Zorunlu Trafik Sigortası',
    ARRAY['TRAFİK', 'TRAFIK SIGORTASI', 'ZORUNLU TRAFIK', 'ZTS', 'TRAFİK SİGORTASI'],
    2
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'DASK',
    'DASK (Deprem Sigortası)',
    ARRAY['DASK', 'ZORUNLU DEPREM', 'DEPREM'],
    3
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'TSS',
    'Tamamlayıcı Sağlık Sigortası',
    ARRAY['TSS', 'TAMAMLAYICI SAĞLIK', 'TAMAMLAYICI SAGLIK'],
    4
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'KONUT',
    'Konut Sigortası',
    ARRAY['KONUT', 'EV SIGORTASI', 'EV SİGORTASI', 'KONUT SIGORTASI'],
    5
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'OSS_ELEMENTER',
    'Özel Sağlık Sigortası (Elementer)',
    ARRAY['ÖSS ELEMENTER', 'ÖZEL SAĞLIK ELEMENTER'],
    6
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'FKS',
    'Ferdi Kaza Sigortası',
    ARRAY['FKS', 'FERDI KAZA', 'FERDİ KAZA', 'FHS'],
    7
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'ISYERI',
    'İşyeri Sigortası',
    ARRAY['IŞYERI', 'İŞYERİ', 'ISYERI SIGORTASI', 'İŞYERİ SİGORTASI'],
    8
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'INSAAT_ALL_RISK',
    'İnşaat All Risk',
    ARRAY['INŞAAT', 'İNŞAAT ALL RISK', 'INSAAT ALL RISK'],
    9
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'TEHLIKELI_MADDE',
    'Tehlikeli Madde Sigortası',
    ARRAY['TEHLIKELI MADDE', 'TEHLİKELİ MADDE'],
    10
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'NAKLIYE',
    'Nakliyat Sigortası',
    ARRAY['NAKLIYE', 'NAKLİYE', 'NAKLIYAT', 'NAKLİYAT'],
    11
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'IMM',
    'İşveren Mali Mesuliyet Sigortası',
    ARRAY['IMM', 'İMM', 'IŞVEREN MALI MESULIYET', 'İŞVEREN MALİ MESULİYET'],
    12
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'DOGUM',
    'Doğum Sigortası',
    ARRAY['DOĞUM', 'DOGUM', 'DOĞUM SIGORTASI'],
    13
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'HEKIM_SORUMLULUK',
    'Hekim Sorumluluk Sigortası',
    ARRAY['HEKIM', 'HEKIM SORUMLULUK', 'HEKİM SORUMLULUK'],
    14
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'ROMORK',
    'Römork Sigortası',
    ARRAY['ROMORK', 'RÖMORK', 'ROMORK SIGORTASI'],
    15
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'FILO',
    'Filo Sigortası',
    ARRAY['FILO', 'FİLO', 'FILO SIGORTASI'],
    16
  ),
  (
    (SELECT id FROM public.insurance_categories WHERE code='ELEMENTER'),
    'EVCIL_HAYVAN',
    'Evcil Hayvan Sigortası',
    ARRAY['EVCIL HAYVAN', 'EVCİL HAYVAN', 'HAYVAN SIGORTASI'],
    17
  )
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 10. YARDIMCI VIEW'LAR
-- ============================================

-- Ürünleri kategorileriyle birlikte göster
CREATE OR REPLACE VIEW public.v_products_with_categories AS
SELECT 
  p.id,
  p.code,
  p.name_tr,
  p.aliases,
  p.is_active,
  c.id as category_id,
  c.code as category_code,
  c.name_tr as category_name
FROM public.insurance_products p
JOIN public.insurance_categories c ON c.id = p.category_id
ORDER BY c.display_order, p.display_order;

-- Şirket-ürün ilişkilerini göster
CREATE OR REPLACE VIEW public.v_company_product_list AS
SELECT 
  cp.id,
  c.name as company_name,
  p.code as product_code,
  p.name_tr as product_name,
  pc.name_tr as category_name,
  cp.is_active,
  cp.commission_rate
FROM public.company_products cp
JOIN public.settings_companies c ON c.id = cp.company_id
JOIN public.insurance_products p ON p.id = cp.product_id
JOIN public.insurance_categories pc ON pc.id = p.category_id
ORDER BY c.name, pc.display_order, p.display_order;

-- ============================================
-- TAMAMLANDI!
-- ============================================
-- Şimdi:
-- 1. Customers tablosunda müşteri tipi belirtin
-- 2. Policies tablosunda product_id kullanın
-- 3. Company Products'a şirketlerin hangi ürünleri sattığını ekleyin
