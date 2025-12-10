**PRODUCT MANAGEMENT TAB - Ekle bunu Settings.tsx'e satır 812'den önce:**

```tsx
{/* --- TAB: PRODUCTS --- */}
{activeTab === 'products' && (
  <div className="space-y-6">
    {/* Categories Section */}
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-primary" /> Sigorta Kategorileri
        </h3>
        <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Kategori Ekle
        </button>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        2 kategori: Hayat, Elementer
      </div>
    </div>

    {/* Products Section */}
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-primary" /> Sigorta Ürünleri
        </h3>
        <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ürün Ekle
        </button>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        21 ürün tanımlı (Database'de mevcut)
        <br />
        Detaylı yönetim ekranı yakında...
      </div>
    </div>
  </div>
)}
```

**TAB NAVIGATION FIX - Settings.tsx satır 532-538'i değiştir:**
```tsx
{[
  { id: 'companies', label: 'Sigorta Şirketleri', icon: Building2 },
  { id: 'products', label: 'Ürün Yönetimi', icon: Database },
  { id: 'banks', label: 'Banka Hesapları', icon: Landmark },
  { id: 'users', label: 'Ekip & Yetkiler', icon: Users },
  { id: 'partners', label: 'Ortaklık Yapısı', icon: Handshake },
  { id: 'brand', label: 'Yönetim & Marka', icon: Palette },
].map(tab => (
```
