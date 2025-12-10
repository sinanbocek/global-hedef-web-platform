# 🏢 Global Hedef Sigorta Web Platformu

Modern sigorta yönetim platformu - Poliçe takibi, finansal yönetim ve raporlama sistemi.

## 🚀 Özellikler

- 📋 **Poliçe Yönetimi**: Poliçe ekleme, düzenleme ve takibi
- 💰 **Finansal Yönetim**: Komisyon hesaplamaları, ödemeler ve hazine takibi
- 👥 **Müşteri Yönetimi**: Müşteri ve acente bilgileri
- 📊 **Raporlama**: Detaylı finansal ve operasyonel raporlar
- 🔒 **Güvenli**: Supabase tabanlı güvenli veri yönetimi

## 🛠️ Teknolojiler

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v6

## 📦 Kurulum

### Gereksinimler

- Node.js 16+ 
- npm veya yarn

### Adımlar

1. **Projeyi Klonlayın**
```bash
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
cd REPO_ADINIZ
```

2. **Bağımlılıkları Yükleyin**
```bash
npm install
```

3. **Environment Variables Ayarlayın**

`.env.example` dosyasını `.env.local` olarak kopyalayın ve değerleri doldurun:
```bash
cp .env.example .env.local
```

Gerekli değerler:
- `VITE_SUPABASE_URL`: Supabase proje URL'iniz
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key'iniz

4. **Development Server'ı Başlatın**
```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde açılacaktır.

## 🏗️ Build

Production build oluşturmak için:
```bash
npm run build
```

Build dosyaları `dist` klasöründe oluşturulacaktır.

Preview için:
```bash
npm run preview
```

## 📁 Proje Yapısı

```
├── components/          # React bileşenleri
│   ├── FinancialManagement/  # Finansal yönetim modülü
│   ├── PolicyTable/          # Poliçe tablosu
│   └── ...
├── context/            # React Context API
├── services/           # API servisleri
├── supabase/          # Supabase yapılandırması
├── types.ts           # TypeScript tip tanımları
├── constants.ts       # Sabit değerler
└── App.tsx            # Ana uygulama bileşeni
```

## 🗄️ Veritabanı

Supabase şemaları `supabase` klasöründe mevcuttur:
- `supabase_schema.sql` - Ana şema
- `financial_system_schema.sql` - Finansal sistem
- `data_quality_schema.sql` - Veri kalitesi kontrolleri

## 📝 Lisans

Tüm hakları saklıdır © Global Hedef Sigorta

## 🤝 Katkıda Bulunma

Bu proje şu anda özel bir proje olup, dış katkılara kapalıdır.
