-- ============================================================================
-- Panoffect Baskı Süreç Takip Uygulaması — Faz 1C: Admin Analitik View'ları
-- 06'dan SONRA çalıştırın. Bu dosya sadece SELECT view'ları ekler,
-- mevcut tabloları/politikaları değiştirmez.
-- ============================================================================
-- Amaç: job_aktivite tablosundaki her durum geçişinin zaman damgasını
-- kullanarak "bir iş bir aşamada ne kadar kaldı" sorusunu cevaplamak.
-- Admin panelindeki tüm analitik ekranlar bu view'lardan beslenir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) job_asama_gecisleri
-- Her aktivite kaydını, aynı işin bir SONRAKİ aktivite kaydıyla eşleştirip
-- aradaki süreyi hesaplar. cikis_zamani NULL ise iş hâlâ o aşamadadır.
-- ----------------------------------------------------------------------------
create or replace view public.job_asama_gecisleri as
select
  ja.id,
  ja.job_id,
  j.sayi,
  j.teslim_turu,
  j.oncelik,
  j.baski_merkezi,
  ja.eski_durum,
  ja.yeni_durum as asama,
  ja.kullanici_id as asamayi_baslatan,
  ja.created_at as giris_zamani,
  lead(ja.created_at) over (partition by ja.job_id order by ja.created_at, ja.id) as cikis_zamani,
  lead(ja.created_at) over (partition by ja.job_id order by ja.created_at, ja.id) - ja.created_at as gecen_sure
from public.job_aktivite ja
join public.jobs j on j.id = ja.job_id;

comment on view public.job_asama_gecisleri is
  'Her durum geçişi için o durumda ne kadar kalındığı (gecen_sure). Admin panel analitiğinin temeli.';

-- ----------------------------------------------------------------------------
-- 2) asama_ortalama_sureleri
-- Aşama bazında (Rezervasyon / Grafik / Metro) ortalama, min, max bekleme
-- süresi — sadece TAMAMLANMIŞ geçişler (cikis_zamani dolu olanlar).
-- ----------------------------------------------------------------------------
create or replace view public.asama_ortalama_sureleri as
select
  asama,
  count(*) filter (where cikis_zamani is not null) as tamamlanan_sayisi,
  avg(gecen_sure) filter (where cikis_zamani is not null) as ortalama_sure,
  min(gecen_sure) filter (where cikis_zamani is not null) as min_sure,
  max(gecen_sure) filter (where cikis_zamani is not null) as max_sure,
  percentile_cont(0.5) within group (order by gecen_sure) filter (where cikis_zamani is not null) as medyan_sure
from public.job_asama_gecisleri
where asama in ('rezervasyon_bekliyor','grafik_bekliyor','metro_bekliyor')
group by asama;

comment on view public.asama_ortalama_sureleri is
  'Rezervasyon/Grafik/Metro aşamalarında ortalama/medyan/min/max bekleme süresi.';

-- ----------------------------------------------------------------------------
-- 3) tamamlanan_is_sureleri
-- Tamamlanmış her iş için: başlangıçtan bitişe toplam süre + her aşamanın
-- ayrı ayrı ne kadar sürdüğü (tek satırda, kolon kolon).
-- ----------------------------------------------------------------------------
create or replace view public.tamamlanan_is_sureleri as
select
  j.id as job_id,
  j.sayi,
  j.teslim_turu,
  j.oncelik,
  j.baski_merkezi,
  r.marka,
  r.toplam_adet,
  j.created_at as baslama_zamani,
  (
    select max(ja.created_at) from public.job_aktivite ja
    where ja.job_id = j.id and ja.yeni_durum = 'tamamlandi'
  ) as tamamlanma_zamani,
  (
    select max(ja.created_at) from public.job_aktivite ja
    where ja.job_id = j.id and ja.yeni_durum = 'tamamlandi'
  ) - j.created_at as toplam_sure,
  (
    select gecen_sure from public.job_asama_gecisleri g
    where g.job_id = j.id and g.asama = 'rezervasyon_bekliyor'
    order by g.giris_zamani desc limit 1
  ) as rezervasyon_suresi,
  (
    select gecen_sure from public.job_asama_gecisleri g
    where g.job_id = j.id and g.asama = 'grafik_bekliyor'
    order by g.giris_zamani desc limit 1
  ) as grafik_suresi,
  (
    select gecen_sure from public.job_asama_gecisleri g
    where g.job_id = j.id and g.asama = 'metro_bekliyor'
    order by g.giris_zamani desc limit 1
  ) as metro_suresi,
  exists (
    select 1 from public.job_aktivite ja
    where ja.job_id = j.id and ja.yeni_durum = 'revize_gerekiyor'
  ) as revize_gecmisi_var
from public.jobs j
left join public.rezervasyon_detay r on r.job_id = j.id
where j.durum = 'tamamlandi';

comment on view public.tamamlanan_is_sureleri is
  'Tamamlanmış her iş için toplam süre + aşama aşama süre dökümü. Dashboard ve rapor ekranlarının ana kaynağı.';

-- ----------------------------------------------------------------------------
-- 4) ekip_performans
-- Kullanıcı (ekip üyesi) bazında: kaç iş doldurmuş, ortalama ne kadar
-- sürede tamamlamış. Formu dolduran kişi (dolduran_kullanici_id) esas alınır.
-- ----------------------------------------------------------------------------
create or replace view public.ekip_performans as
select
  u.id as kullanici_id,
  u.isim,
  u.ekip,
  'rezervasyon'::text as asama,
  count(r.job_id) as doldurulan_sayisi,
  avg(g.gecen_sure) as ortalama_sure
from public.users u
join public.rezervasyon_detay r on r.dolduran_kullanici_id = u.id
left join public.job_asama_gecisleri g
  on g.job_id = r.job_id and g.asama = 'rezervasyon_bekliyor'
group by u.id, u.isim, u.ekip
union all
select
  u.id, u.isim, u.ekip, 'grafik_tasarim'::text,
  count(gd.job_id), avg(g.gecen_sure)
from public.users u
join public.grafik_detay gd on gd.dolduran_kullanici_id = u.id
left join public.job_asama_gecisleri g
  on g.job_id = gd.job_id and g.asama = 'grafik_bekliyor'
group by u.id, u.isim, u.ekip
union all
select
  u.id, u.isim, u.ekip, 'metro'::text,
  count(md.job_id), avg(g.gecen_sure)
from public.users u
join public.metro_detay md on md.dolduran_kullanici_id = u.id
left join public.job_asama_gecisleri g
  on g.job_id = md.job_id and g.asama = 'metro_bekliyor'
group by u.id, u.isim, u.ekip;

comment on view public.ekip_performans is
  'Her ekip üyesinin doldurduğu form sayısı ve o aşamadaki ortalama süresi.';

-- ----------------------------------------------------------------------------
-- 5) aylik_ozet
-- Ay bazında: kaç iş açıldı, kaç iş tamamlandı, kaç iş iptal/revize oldu,
-- ortalama toplam süre. Dashboard'daki trend grafiği için.
-- ----------------------------------------------------------------------------
create or replace view public.aylik_ozet as
select
  date_trunc('month', j.created_at) as ay,
  count(*) as acilan_is_sayisi,
  count(*) filter (where j.durum = 'tamamlandi') as tamamlanan_is_sayisi,
  count(*) filter (where j.durum = 'iptal') as iptal_is_sayisi,
  count(*) filter (where j.oncelik = 'acil') as acil_is_sayisi,
  avg(t.toplam_sure) as ortalama_toplam_sure
from public.jobs j
left join public.tamamlanan_is_sureleri t on t.job_id = j.id
group by date_trunc('month', j.created_at)
order by ay;

comment on view public.aylik_ozet is
  'Aylık iş hacmi ve ortalama tamamlanma süresi trendi.';

-- ----------------------------------------------------------------------------
-- Not: Bu view'lar "security invoker" (varsayılan) ile çalışır — yani
-- mevcut RLS politikaların geçerli olur. Admin panelin login olan kullanıcı
-- admin rolünde olmalı ki jobs/job_aktivite/rezervasyon_detay vb. üzerindeki
-- "admin her şeyi görür" politikaları bu view'lara da otomatik yansısın.
-- Ayrıca bilgisi: admin panel supabase-js ile ANON KEY + admin kullanıcının
-- kendi login'iyle bağlanmalı; service_role key tarayıcıda ASLA kullanılmamalı.
-- ============================================================================
