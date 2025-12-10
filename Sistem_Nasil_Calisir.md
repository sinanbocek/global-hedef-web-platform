# 🚀 Web Geliştirme Workflow Eğitim Kiti

**Proje:** Global Hedef Sigorta Web Platformu  
**Tarih:** 10 Aralık 2024  
**Yazar:** Sinan Bocek

---

## 📚 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Günlük Workflow](#günlük-workflow)
3. [Komut Referansı](#komut-referansı)
4. [Git & GitHub](#git--github)
5. [Firebase Deployment](#firebase-deployment)
6. [Sorun Giderme](#sorun-giderme)
7. [İpuçları & Best Practices](#ipuçları--best-practices)

---

## 🎯 Genel Bakış

### Proje Yapısı

```
📁 Local (Bilgisayarınız)
   └─ c:\Users\SNN\Documents\SNN\Yapay Zeka Çalışmaları\Global Hedef Web Platform
      ├─ package.json (Bağımlılıklar)
      ├─ .env.local (Gizli bilgiler - GitHub'a yüklenmez)
      ├─ firebase.json (Firebase ayarları)
      └─ dist/ (Build çıktısı)

📦 GitHub (Yedek & Versiyon Kontrolü)
   └─ https://github.com/sinanbocek/global-hedef-web-platform

🌐 Firebase (Canlı Site)
   └─ https://gen-lang-client-0722061818.web.app
```

### Teknolojiler

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** Firebase Hosting
- **Version Control:** Git + GitHub

---

## 🔄 Günlük Workflow

### Sabah: Projeyi Başlatma

```powershell
# 1. Proje klasörüne git
cd "c:\Users\SNN\Documents\SNN\Yapay Zeka Çalışmaları\Global Hedef Web Platform"

# 2. Eğer GitHub'da yeni değişiklik varsa çek
git pull

# 3. Development server'ı başlat
npm run dev

# ✅ Tarayıcıda http://localhost:3000 açılacak
```

### Gün İçi: Kodlama

```powershell
# Server zaten çalışıyor (npm run dev)
# Kod yazıyorsunuz
# Tarayıcıda otomatik yenileniyor (hot reload)
# Test ediyorsunuz
```

### Öğle/Akşam: Değişiklikleri Kaydetme

```powershell
# 1. Ne değişti görmek için
git status

# 2. Tüm değişiklikleri ekle
git add .

# 3. Değişiklikleri kaydet (commit)
git commit -m "Satış raporu özelliği eklendi"

# 4. GitHub'a yükle
git push
```

### Canlıya Alma (İsteğe Bağlı)

```powershell
# 1. Production build oluştur
npm run build

# 2. Firebase'e deploy et
firebase deploy

# ✅ Değişiklikler canlıda!
```

---

## 📖 Komut Referansı

### Development Komutları

```powershell
# Development server başlat
npm run dev

# Production build oluştur
npm run build

# Build'i preview et
npm run preview

# Bağımlılıkları yükle
npm install

# Yeni paket ekle
npm install paket-adi
```

### Git Komutları

```powershell
# Durum kontrolü (ne değişti?)
git status

# Tüm değişiklikleri ekle
git add .

# Belirli bir dosyayı ekle
git add dosya-adi.tsx

# Commit oluştur
git commit -m "Açıklayıcı mesaj"

# GitHub'a yükle
git push

# GitHub'dan çek
git pull

# Commit geçmişi
git log --oneline -10

# Değişiklikleri gör
git diff
```

### Firebase Komutları

```powershell
# Deploy et
firebase deploy

# Sadece hosting deploy et
firebase deploy --only hosting

# Firebase'e giriş
firebase login

# Proje listesi
firebase projects:list

# Farklı projeye geç
firebase use proje-adi
```

---

## 🐙 Git & GitHub

### Git Nedir?

**Git** = Zaman makinesi! Her değişikliği kaydeder, istediğiniz zaman geriye dönebilirsiniz.

### Commit Mesajları

**Açıklayıcı olun!**

```powershell
# ❌ Kötü
git commit -m "değişiklikler"
git commit -m "fix"

# ✅ İyi
git commit -m "Satış raporu tablosu eklendi"
git commit -m "Bug düzeltildi: ödeme hesaplama hatası"
git commit -m "UI iyileştirmesi: dark mode renkleri güncellendi"
```

### Temel Git Workflow

```
1. Değişiklik yaptınız
   ↓
2. git add .        (Değişiklikleri hazırla)
   ↓
3. git commit -m    (Değişiklikleri kaydet)
   ↓
4. git push         (GitHub'a yükle)
```

### Git Kavramları

- **Repository (Repo):** Proje klasörünüz
- **Commit:** Kaydedilmiş bir değişiklik seti
- **Push:** Local'den GitHub'a yükleme
- **Pull:** GitHub'dan local'e indirme
- **Branch:** Ayrı bir geliştirme dalı (şimdilik main branch kullanıyorsunuz)

---

## 🔥 Firebase Deployment

### İlk Kurulum (Bir Kez Yapılır)

```powershell
# 1. Firebase CLI kur
npm install -g firebase-tools

# 2. Firebase'e giriş yap
firebase login

# 3. Projeyi yapılandır
firebase init hosting

# Sorular:
# - Public directory: dist
# - Single-page app: Yes
# - GitHub: No
# - Overwrite: No
```

### Her Deploy'da

```powershell
# 1. Build oluştur
npm run build

# 2. Deploy et
firebase deploy
```

### Deployment Sonrası

Deploy tamamlandığında çıktıda göreceksiniz:

```
Hosting URL: https://gen-lang-client-0722061818.web.app
```

Bu linki tarayıcıda açın → Değişiklikler canlıda!

---

## 🔧 Sorun Giderme

### Local'de Çalışmıyor

```powershell
# Node modules'ü yeniden yükle
rm -r node_modules
npm install

# Cache temizle
npm cache clean --force

# Dev server'ı yeniden başlat
npm run dev
```

### Build Hatası

```powershell
# TypeScript hataları varsa
npm run build  # Hataları göreceksiniz

# Lint kontrol
npm run lint
```

### Git Push Hatası

```powershell
# GitHub'da daha yeni kod var
git pull

# Çakışma varsa manuel çözün
# Sonra tekrar:
git add .
git commit -m "Merge edildi"
git push
```

### Firebase Deploy Hatası

```powershell
# Yeniden giriş yap
firebase logout
firebase login

# Doğru proje seçili mi?
firebase use --add

# Yeniden dene
firebase deploy
```

---

## 💡 İpuçları & Best Practices

### Günlük Çalışma

✅ **YAPIN:**
- Her gün commit yapın
- Anlamlı commit mesajları yazın
- Local'de test edin, sonra push edin
- Düzenli olarak `git pull` yapın

❌ **YAPMAYIN:**
- Çalışmayan kodu push etmeyin
- Gizli bilgileri (şifreler) GitHub'a yüklemeyin
- Çok uzun süre commit yapmayın (kayıp riski)

### Commit Sıklığı

**Önerilen:**
- Küçük özellik bitti → Commit
- Bug düzeltildi → Commit
- Gün sonu → Commit

**Örnek Günlük:**
```
09:00 - Kodlamaya başla
12:00 - git commit -m "Sabah çalışması: rapor tablosu"
15:00 - git commit -m "Grafik eklendi"
18:00 - git commit -m "Bug düzeltmeleri ve UI iyileştirmesi"
```

### Deploy Sıklığı

**Canlıya ne zaman almalı?**
- ✅ Önemli özellik tamamlandı
- ✅ Arkadaşlara göstermek istiyorsunuz
- ✅ Test için canlı URL gerekli
- ❌ Her küçük değişiklikte deploy etmeyin (gereksiz)

### Backup Stratejisi

**3 Kopya Kuralı:**
1. 💻 Local (Bilgisayarınız)
2. 🐙 GitHub (Yedek)
3. 🔥 Firebase (Canlı)

**Güvenlik:**
- `.env.local` dosyasını yedekleyin (özel bir yere)
- Supabase şifrelerini unutmayın

---

## 📋 Hızlı Referans

### Sabah Rutini

```powershell
cd "c:\Users\SNN\Documents\SNN\Yapay Zeka Çalışmaları\Global Hedef Web Platform"
git pull
npm run dev
```

### Akşam Rutini

```powershell
git add .
git commit -m "Bugün yapılanlar özeti"
git push
```

### Canlıya Alma

```powershell
npm run build
firebase deploy
```

### Acil Durum (Geri Alma)

```powershell
# Son commit'i geri al
git reset --soft HEAD~1

# Dosyayı eski haline döndür
git checkout -- dosya-adi.tsx
```

---

## 🎯 Örnek Senaryo: Yeni Özellik Ekleme

### Senaryo: "Müşteri Raporları" özelliği ekliyorsunuz

#### 1. Hazırlık
```powershell
cd "c:\Users\SNN\Documents\SNN\Yapay Zeka Çalışmaları\Global Hedef Web Platform"
git pull  # GitHub'dan son değişiklikleri al
npm run dev  # Dev server başlat
```

#### 2. Kodlama (Birlikte Çalışıyoruz)
```
- CustomerReports.tsx dosyası oluştur
- FinancialManagement.tsx'e ekle
- Stil ayarları yap
- Test et → localhost:3000
```

#### 3. GitHub'a Yükleme
```powershell
git status  # Ne değişti bak
git add .
git commit -m "Müşteri raporları özelliği eklendi"
git push
```

#### 4. Canlıya Alma
```powershell
npm run build  # Build oluştur
firebase deploy  # Firebase'e yükle
# → https://gen-lang-client-0722061818.web.app → Kontrol et
```

✅ **Tamamlandı!** Özellik hem GitHub'da hem de canlıda.

---

## 📞 Yardım

### Hatırlanması Gerekenler

1. **Git push olmadan → GitHub'da görünmez**
2. **Firebase deploy olmadan → Canlıda görünmez**
3. **npm run build olmadan → Deploy edilecek şey yok**
4. **Local'de çalışmazsa → Push/deploy etme!**

### Önemli Linkler

- **Local:** http://localhost:3000
- **GitHub Repo:** https://github.com/sinanbocek/global-hedef-web-platform
- **Canlı Site:** https://gen-lang-client-0722061818.web.app
- **Firebase Console:** https://console.firebase.google.com/project/gen-lang-client-0722061818

---

## 🎓 Sonuç

Bu rehberi her zaman yanınızda tutun. Unuttuğunuzda bakın. Zaman içinde workflow otomatikleşecek ve doğal hale gelecek.

**Başarılar!** 🚀

---

*Son Güncelleme: 10 Aralık 2024*
