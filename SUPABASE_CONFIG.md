# Supabase Configuration

> **⚠️ NOT**: Bu dosya sadece referans içindir. Gerçek API anahtarları `.env.local` dosyasında saklanmalıdır.

## Proje Bilgileri

| Alan | Değer |
|------|-------|
| **Project ID** | `xeimgafswdfxmwxtwfmp` |
| **Project Name** | Global_Hedef_Sigorta_Web_Portal |
| **Project URL** | https://xeimgafswdfxmwxtwfmp.supabase.co |
| **Region** | ap-northeast-1 (Tokyo) |
| **Status** | ✅ ACTIVE_HEALTHY |
| **Database Host** | db.xeimgafswdfxmwxtwfmp.supabase.co |
| **Postgres Version** | 17.6.1 |
| **Organization ID** | edovtveiihnvrdbkfxiu |

## API Endpoints

```
API URL: https://xeimgafswdfxmwxtwfmp.supabase.co
REST API: https://xeimgafswdfxmwxtwfmp.supabase.co/rest/v1/
```

## Environment Variables (.env.local)

Aşağıdaki değişkenlerin `.env.local` dosyanızda olması gerekir:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xeimgafswdfxmwxtwfmp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_buraya>
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN

# Optional: Service Role Key (Sadece backend işlemler için)
# SUPABASE_SERVICE_ROLE_KEY=<service_role_key_buraya>
```

## Tamamlanmış Migration'lar

| Migration | Tarih | Durum |
|-----------|-------|--------|
| `fix_schema_mismatches` | 2025-12-06 | ✅ Başarılı |

### fix_schema_mismatches Detayları:
- ✅ `settings_users.roles` kolonu eklendi (text[])
- ✅ `settings_users.phone` kolonu eklendi (text)
- ✅ `policies.salesperson_id` kolonu eklendi (uuid)
- ✅ Eski `role` verisi `roles` array'ine migration edildi
- ✅ Index oluşturuldu: `idx_policies_salesperson_id`

## Antigravity Integration

Bu proje Antigravity AI ile entegre edilmiştir. Migration'lar otomatik olarak uygulanabilir.

**Kullanım:**
```
"Migration'ı otomatik çalıştır" dediğinizde Antigravity doğrudan Supabase'e bağlanıp migration'ı uygular.
```

## Yararlı Bağlantılar

- [Supabase Dashboard](https://app.supabase.com/project/xeimgafswdfxmwxtwfmp)
- [SQL Editor](https://app.supabase.com/project/xeimgafswdfxmwxtwfmp/sql)
- [Table Editor](https://app.supabase.com/project/xeimgafswdfxmwxtwfmp/editor)
- [API Docs](https://app.supabase.com/project/xeimgafswdfxmwxtwfmp/api)

## Veritabanı Şeması

### Temel Tablolar

1. **settings_users**
   - Kullanıcı yönetimi
   - Roller: Admin, Satışçı, Operasyon, Firma Ortağı
   - Telefon bilgileri

2. **settings_companies**
   - Sigorta şirketleri
   - Komisyon ayarları
   - Teminat takibi

3. **settings_banks**
   - Banka bilgileri
   - Hesap yönetimi

4. **policies**
   - Poliçe yönetimi
   - Satış danışmanı takibi
   - Müşteri ilişkileri

5. **customers**
   - Müşteri veritabanı
   - Risk skorları
   - Aile grupları

## Güvenlik Notları

🔒 **API Anahtarlarını ASLA versiyonlamayın!**
- `.env.local` dosyası `.gitignore`'da olmalı ✅
- Publishable key frontend'de kullanılabilir (güvenli)
- Service role key sadece backend'de kullanılmalı (hassas)

## Son Güncelleme

**Tarih:** 2025-12-06  
**Güncelleyen:** Antigravity AI  
**İşlem:** Database schema migration ve konfigürasyon dokümantasyonu
