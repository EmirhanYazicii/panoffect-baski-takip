-- ============================================================================
-- Panoffect Baskı Süreç Takip Uygulaması — Faz 1C Ek: Büyük/Küçük Harf
-- Normalizasyonu + Ekip Bazlı Analiz + Kullanıcı Ekleme için RLS
-- 07'den SONRA çalıştırın.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) norm_metin — "ANADOLU REKLAM" ile "anadolu reklam"ı aynı kabul etmek için
-- kullanılan normalize fonksiyonu. Baskı merkezi / marka gruplamalarında
-- bu fonksiyon anahtar olarak kullanılır; ekranda gösterilen isim ise en
-- sık yazılan orijinal hali (mode()) olur.
-- ----------------------------------------------------------------------------
create or replace function public.norm_metin(p text)
returns text
language sql
immutable
as $$
  select upper(btrim(p));
$$;

comment on function public.norm_metin is
  'Karşılaştırma/gruplama için metni büyük harfe çevirir ve baş/son boşlukları temizler.';

-- ----------------------------------------------------------------------------
-- 2) baski_merkezi_analiz — aynı baskı merkezi farklı büyük/küçük harfle
-- yazılmış olsa da TEK satırda toplanır.
-- ----------------------------------------------------------------------------
create or replace view public.baski_merkezi_analiz as
select
  norm_metin(baski_merkezi) as merkez_anahtari,
  mode() within group (order by baski_merkezi) as goruntu_adi,
  count(*) as is_sayisi,
  avg(toplam_sure) as ortalama_sure
from public.tamamlanan_is_sureleri
where baski_merkezi is not null and btrim(baski_merkezi) <> ''
group by norm_metin(baski_merkezi)
order by is_sayisi desc;

comment on view public.baski_merkezi_analiz is
  'Baskı merkezlerini büyük/küçük harf farkını yok sayarak tek satırda toplar.';

-- ----------------------------------------------------------------------------
-- 3) marka_analiz — aynı normalizasyon marka için.
-- ----------------------------------------------------------------------------
create or replace view public.marka_analiz as
select
  norm_metin(marka) as marka_anahtari,
  mode() within group (order by marka) as goruntu_adi,
  count(*) as is_sayisi,
  avg(toplam_sure) as ortalama_sure
from public.tamamlanan_is_sureleri
where marka is not null and btrim(marka) <> ''
group by norm_metin(marka)
order by is_sayisi desc;

comment on view public.marka_analiz is
  'Markaları büyük/küçük harf farkını yok sayarak tek satırda toplar.';

-- ----------------------------------------------------------------------------
-- 4) metro_bolge_sureleri — her Metro teslimi için, işin Metro'ya GİRİŞ
-- zamanından o bölgenin teslimi TAMAMLANMA zamanına kadar geçen süre.
-- (job_asama_gecisleri'ndeki "metro_bekliyor" tek satır olduğu için
-- Anadolu/Avrupa ayrı ayrı görünmüyordu — bu view onu ayırıyor.)
-- ----------------------------------------------------------------------------
create or replace view public.metro_bolge_sureleri as
select
  md.job_id,
  j.sayi,
  md.bolge,
  md.doldurulma_tarihi as tamamlanma_zamani,
  (
    select max(ja.created_at) from public.job_aktivite ja
    where ja.job_id = md.job_id
      and ja.yeni_durum = 'metro_bekliyor'
      and ja.created_at <= md.doldurulma_tarihi
  ) as metroya_giris_zamani,
  md.doldurulma_tarihi - (
    select max(ja.created_at) from public.job_aktivite ja
    where ja.job_id = md.job_id
      and ja.yeni_durum = 'metro_bekliyor'
      and ja.created_at <= md.doldurulma_tarihi
  ) as metro_suresi
from public.metro_detay md
join public.jobs j on j.id = md.job_id
where md.doldurulma_tarihi is not null;

comment on view public.metro_bolge_sureleri is
  'Her Metro teslimi için Anadolu/Avrupa bölgesine göre ayrı ayrı geçen süre.';

-- ----------------------------------------------------------------------------
-- 5) ekip_bazli_ortalama_sureleri — "Rezervasyondan Metroya ne kadar sürede
-- geçmiş" sorusunun EKİP bazında (kişi bazında değil) cevabı. Metro artık
-- Anadolu / Avrupa olarak ayrı satırlar halinde.
-- ----------------------------------------------------------------------------
create or replace view public.ekip_bazli_ortalama_sureleri as
select
  'rezervasyon'::text as ekip,
  count(*) as tamamlanan_sayisi,
  avg(gecen_sure) as ortalama_sure,
  min(gecen_sure) as min_sure,
  max(gecen_sure) as max_sure
from public.job_asama_gecisleri
where asama = 'rezervasyon_bekliyor' and cikis_zamani is not null
union all
select
  'grafik_tasarim'::text,
  count(*),
  avg(gecen_sure),
  min(gecen_sure),
  max(gecen_sure)
from public.job_asama_gecisleri
where asama = 'grafik_bekliyor' and cikis_zamani is not null
union all
select
  'metro_anadolu'::text,
  count(*),
  avg(metro_suresi),
  min(metro_suresi),
  max(metro_suresi)
from public.metro_bolge_sureleri
where bolge = 'anadolu'
union all
select
  'metro_avrupa'::text,
  count(*),
  avg(metro_suresi),
  min(metro_suresi),
  max(metro_suresi)
from public.metro_bolge_sureleri
where bolge = 'avrupa';

comment on view public.ekip_bazli_ortalama_sureleri is
  'Rezervasyon / Grafik Tasarım / Metro Anadolu / Metro Avrupa ekiplerinin her birinin ortalama, min ve max işlem süresi.';

-- ----------------------------------------------------------------------------
-- 6) Admin Panelinden yeni ekip üyesi ekleyebilmek (Kullanıcılar ekranı) için
-- admin'in public.users tablosunda GÜNCELLEME yapabilmesi de gerekiyor
-- (ekip/rol değiştirme, pasif etme). Zaten "admin her şeyi görebilir" (select)
-- politikası olması gerekiyordu (Faz 1A); burada sadece UPDATE politikasını
-- garantiye alıyoruz. Zaten varsa bu, aynısıyla değiştirir (hata vermez).
-- ----------------------------------------------------------------------------
drop policy if exists "users_admin_update_all" on public.users;
create policy "users_admin_update_all"
  on public.users for update
  using (public.mevcut_kullanici_admin_mi())
  with check (public.mevcut_kullanici_admin_mi());

-- Not: Yeni kullanıcı OLUŞTURMA (auth.users + public.users satırı) işlemi
-- admin panelinden bir Edge Function (create-team-member) üzerinden yapılır
-- — tarayıcıdan asla service_role key kullanılmaz. Bkz.
-- mobile/supabase/functions/create-team-member/index.ts
-- ============================================================================
