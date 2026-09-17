# Panoffect Baskı Takip — Admin Paneli (Faz 1C)

Bu, yöneticinin bilgisayardan açıp tüm işleri, süreleri ve ekip
performansını görebileceği web tabanlı yönetim panelidir. Mobil
uygulamayla aynı Supabase veritabanını kullanır — ayrı bir veri girişi
gerekmez, mobil uygulamada girilen her şey burada otomatik görünür.

## Neler Var

- **Dashboard**: Aktif iş sayısı, geciken işler, acil işler, bu ay
  tamamlanan işler, aşama bazında ortalama süre grafiği, aylık iş hacmi
  trendi.
- **Tüm İşler**: Filtrelenebilir (durum, öncelik) ve aranabilir tam
  liste. Bir işe tıklayınca o işin **tüm süreç geçmişi** (hangi aşamada
  ne kadar kaldığı, saat saat) açılır. CSV olarak dışa aktarılabilir.
- **Analitik**: Ortalama toplam süre, revize oranı, en çok kullanılan
  baskı merkezleri, teslim türü dağılımı, iş bazında süre dökümü tablosu.
- **Ekip Performansı**: Her ekip üyesinin kaç iş doldurduğu ve ortalama
  ne kadar sürede tamamladığı; ayrıca Analitik ekranında Rezervasyon /
  Grafik Tasarım / Metro Anadolu / Metro Avrupa ekiplerinin kendi
  aşamalarındaki ortalama, min ve maks süresi ayrı ayrı karşılaştırılır.
- **Kullanıcılar**: Admin panelinden yeni ekip üyesi (örn. yeni bir
  rezervasyoncu) ekleyebilir, mevcut kullanıcıları aktif/pasif yapabilirsin.
- **Dışa Aktarma**: Dashboard ve Analitik ekranlarında **PDF Rapor**
  butonu — Panoffect logolu, tarihli, düzenli sayfalı, Times Roman
  görünümlü ve Türkçe karakterleri (ğ, ş, ı, ö, ç, İ) doğru gösteren
  profesyonel bir rapor indirir. İşler, Analitik ve Ekip Performansı
  ekranlarında **Excel'e Aktar** butonu — renkli başlık satırı, alternatif
  satır renklendirmesi, kenarlıklar, otomatik sütun genişliği ve filtre
  ile biçimlendirilmiş gerçek bir `.xlsx` dosyası indirir (düz/biçimsiz
  tablo değil).
- Baskı merkezi ve marka analizlerinde büyük/küçük harf farkı yok sayılır
  ("ANADOLU REKLAM" ve "anadolu reklam" tek satırda toplanır).

Sadece `role = 'admin'` olan kullanıcılar giriş yapabilir (mobil
uygulamadaki aynı hesapla).

## Kurulum (adım adım)

### 1) Supabase'de yeni SQL dosyalarını çalıştır

Supabase panelinde **SQL Editor**'ü aç, sırayla:

1. `supabase/07_admin_analitik.sql`
2. `supabase/08_normallesme_ve_ekip_analiz.sql`

İçeriklerini yapıştır ve çalıştır (RUN). Bu dosyalar sadece yeni
görünümler (view) ve bir güncelleme yetkisi ekler, mevcut hiçbir şeyi
bozmaz.

### 1b) "Yeni Kullanıcı Ekle" özelliği için Edge Function'ı yayınla (opsiyonel)

Kullanıcılar ekranından yeni ekip üyesi ekleyebilmek için, bir Supabase
Edge Function'ı yayınlaman (deploy) gerekiyor — bu, tarayıcıya asla
konulmaması gereken "service_role" anahtarını güvenli şekilde sunucu
tarafında kullanmak için gerekli. Bunu yapmak istemiyorsan panelin geri
kalanı (Dashboard, İşler, Analitik, Ekip Performansı) bu adım olmadan
da tam çalışır — sadece "Yeni Kullanıcı Ekle" formu çalışmaz.

Supabase CLI kurulu değilse:

```bash
npm install -g supabase
supabase login
```

Sonra proje klasöründe (bir kere):

```bash
supabase link --project-ref <supabase-proje-referansın>
```

(Proje referansını Supabase panelinde Project Settings → General'da
"Reference ID" olarak bulabilirsin.)

Fonksiyonu yayınla:

```bash
supabase functions deploy create-team-member
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` ve `SUPABASE_SERVICE_ROLE_KEY`
değerlerini Supabase otomatik sağlar — elle bir şey tanımlamana gerek
yok.

### 2) Node.js kurulu değilse kur

Mobil uygulama için zaten kurmuştun (Node LTS) — aynısı yeterli.

### 3) Proje klasörünü aç

Bu klasörü (`admin-panel`) masaüstüne, örneğin
`C:\Users\emiry\Desktop\admin-panel` konumuna çıkar.

MINGW64 terminalinde:

```bash
cd Desktop/admin-panel
npm install
```

Bu komut birkaç dakika sürebilir, internet bağlantısına göre değişir.

### 4) .env dosyasını oluştur

`admin-panel` klasöründe `.env.example` dosyasının bir kopyasını
`.env` adıyla oluştur, içindeki iki satırı mobil uygulamadaki
`.env` dosyandan **aynen kopyala** (aynı Supabase projesi):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

(Mobil uygulamada `EXPO_PUBLIC_` ön eki vardı, burada `VITE_` — sadece
ön ek değişiyor, değerler aynı.)

### 5) Çalıştır

```bash
npm run dev
```

Terminalde çıkan `http://localhost:5173` linkine tıkla / tarayıcıda aç.
Admin hesabınla giriş yap.

### 6) Yöneticinin her açması için

Geliştirme sırasında her seferinde `npm run dev` çalıştırman gerekir.
Yönetici için kalıcı bir çözüm istersen (bilgisayar kapanınca da erişim,
her zaman açık bir link), bunu **Vercel** veya **Netlify**'a ücretsiz
deploy edebiliriz — istersen bir sonraki adımda bunu birlikte yaparız.

## Font notu

PDF raporlarında Times New Roman'ın kendisi yerine, onunla ölçü olarak
tamamen uyumlu (aynı satır/sayfa yapısı), tamamen ücretsiz ve Türkçe
karakterleri (ğ, ş, ı, İ, ö, ç) eksiksiz destekleyen **Liberation
Serif** fontu kullanılır. Adobe/Microsoft'un Times New Roman fontu
lisanslı olduğu için uygulamalara gömülemez; Liberation Serif tam
olarak bu amaçla (Times New Roman'ın açık kaynaklı, metrik uyumlu
karşılığı) tasarlanmıştır — gözle fark edilmez.

## Güvenlik notu

`.env` dosyasını asla GitHub'a yükleme (mobil projede olduğu gibi
`.gitignore`'da zaten hariç tutulacak şekilde ayarlandı). Panelde sadece
`anon key` kullanılır — bu anahtar herkese açık olabilir çünkü gerçek
yetkilendirme Supabase'deki RLS politikalarıyla ve admin rol kontrolüyle
yapılıyor.
