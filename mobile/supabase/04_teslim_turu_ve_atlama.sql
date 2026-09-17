-- ============================================================================
-- Panoffect Baskı Süreç Takip Uygulaması — Teslim Türü Ayrımı
-- Faz 1B ek — SQL Editor'de 01/02/03'ten SONRA, tek seferde çalıştırın.
-- ============================================================================
-- Yeni kavram: teslim_turu
--   'marka_teslim' -> Baskı, marka tarafından zaten yapılıp teslim ediliyor.
--                     Grafik Tasarım aşaması tamamen ATLANIR:
--                     rezervasyon_bekliyor -> doğrudan metro_bekliyor.
--   'kendi_baski'  -> Mevcut akış aynen kalır:
--                     rezervasyon_bekliyor -> grafik_bekliyor -> metro_bekliyor.
-- Baskı merkezi/firma artık İş Başlatıcı tarafından, iş açılırken giriliyor
-- (jobs.baski_merkezi). Grafik ekibi bu bilgiyi bir daha girmiyor.
-- ============================================================================

create type teslim_turu_tipi as enum (
  'marka_teslim',
  'kendi_baski'
);

alter table public.jobs
  add column teslim_turu teslim_turu_tipi not null default 'kendi_baski',
  add column baski_merkezi text;

comment on column public.jobs.teslim_turu is 'İş başlatılırken seçilir. marka_teslim -> Grafik aşaması atlanır.';
comment on column public.jobs.baski_merkezi is 'Baskıyı yapan firma/merkez. İş Başlatıcı tarafından girilir; Grafik ekibi bu alanı artık doldurmaz.';

-- ----------------------------------------------------------------------------
-- yeni_is_baslat — artık teslim_turu ve baski_merkezi parametre olarak alınır
-- ----------------------------------------------------------------------------

create or replace function public.yeni_is_baslat(
  p_teslim_turu teslim_turu_tipi,
  p_baski_merkezi text
)
returns public.jobs
language plpgsql
security invoker
as $$
declare
  yeni_is public.jobs;
begin
  if p_baski_merkezi is null or btrim(p_baski_merkezi) = '' then
    raise exception 'Baskı merkezi/firma boş bırakılamaz';
  end if;

  insert into public.jobs (baslatan_kullanici_id, durum, teslim_turu, baski_merkezi)
  values (auth.uid(), 'baslatildi', p_teslim_turu, btrim(p_baski_merkezi))
  returning * into yeni_is;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (yeni_is.id, auth.uid(), null, 'baslatildi', 'İş başlatıldı');

  -- Başlatma ile aynı anda rezervasyon_bekliyor durumuna geçer (SLA sayacı başlar)
  update public.jobs set durum = 'rezervasyon_bekliyor' where id = yeni_is.id
  returning * into yeni_is;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (yeni_is.id, auth.uid(), 'baslatildi', 'rezervasyon_bekliyor', 'Rezervasyon ekibi bekleniyor');

  return yeni_is;
end;
$$;

-- ----------------------------------------------------------------------------
-- is_asama_ilerlet — teslim_turu = 'marka_teslim' olan işlerde Grafik
-- aşaması atlanır.
-- ----------------------------------------------------------------------------

create or replace function public.is_asama_ilerlet(p_job_id uuid)
returns public.jobs
language plpgsql
security invoker
as $$
declare
  mevcut public.jobs;
  yeni_durum is_durumu;
  cagiran_ekip ekip_tipi;
  is_admin boolean;
begin
  select * into mevcut from public.jobs where id = p_job_id for update;
  if mevcut is null then
    raise exception 'İş bulunamadı: %', p_job_id;
  end if;

  cagiran_ekip := public.mevcut_kullanici_ekip();
  is_admin := public.mevcut_kullanici_admin_mi();

  if mevcut.durum = 'rezervasyon_bekliyor' then
    if cagiran_ekip <> 'rezervasyon' and not is_admin then
      raise exception 'Bu aşamayı yalnızca Rezervasyon ekibi ilerletebilir';
    end if;
    if mevcut.teslim_turu = 'marka_teslim' then
      yeni_durum := 'metro_bekliyor';
    else
      yeni_durum := 'grafik_bekliyor';
    end if;
  elsif mevcut.durum = 'grafik_bekliyor' then
    if cagiran_ekip <> 'grafik_tasarim' and not is_admin then
      raise exception 'Bu aşamayı yalnızca Grafik Tasarım ekibi ilerletebilir';
    end if;
    yeni_durum := 'metro_bekliyor';
  elsif mevcut.durum = 'metro_bekliyor' then
    if cagiran_ekip <> 'metro' and not is_admin then
      raise exception 'Bu aşamayı yalnızca Metro ekibi ilerletebilir';
    end if;
    yeni_durum := 'tamamlandi';
  elsif mevcut.durum = 'revize_gerekiyor' then
    -- Revize her zaman Rezervasyon aşamasına döner (bkz. 03_functions_triggers.sql);
    -- Rezervasyon ekibi düzeltip ilerlettiğinde teslim_turu'na göre bir
    -- sonraki durak Grafik ya da doğrudan Metro'dur.
    if not is_admin and cagiran_ekip <> 'rezervasyon' then
      raise exception 'Revizeden çıkış yalnızca Rezervasyon ekibi tarafından yapılabilir';
    end if;
    if mevcut.teslim_turu = 'marka_teslim' then
      yeni_durum := 'metro_bekliyor';
    else
      yeni_durum := 'grafik_bekliyor';
    end if;
  else
    raise exception 'Bu durumdan ileri geçiş tanımlı değil: %', mevcut.durum;
  end if;

  update public.jobs set durum = yeni_durum where id = p_job_id returning * into mevcut;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum)
  values (p_job_id, auth.uid(), mevcut.durum, yeni_durum);

  return mevcut;
end;
$$;

-- ----------------------------------------------------------------------------
-- gecikmis_isler view — grafik_bekliyor referans zamanı marka_teslim
-- işlerinde artık hiç oluşmayacağı için değişmedi; metro_bekliyor referansı
-- marka_teslim işlerinde grafik_detay olmadığından NULL dönecektir — bunu
-- rezervasyon_detay.doldurulma_tarihi'ne düşürüyoruz.
-- ----------------------------------------------------------------------------

create or replace view public.gecikmis_isler as
select
  j.id as job_id,
  j.sayi,
  j.durum,
  case
    when j.durum = 'rezervasyon_bekliyor' then j.created_at
    when j.durum = 'grafik_bekliyor' then r.doldurulma_tarihi
    when j.durum = 'metro_bekliyor' and j.teslim_turu = 'marka_teslim' then r.doldurulma_tarihi
    when j.durum = 'metro_bekliyor' then
      (g.teslim_gereken_tarih + g.teslim_gereken_saat)::timestamptz
    else null
  end as referans_zaman,
  case
    when j.durum = 'rezervasyon_bekliyor' then 'rezervasyon'::ekip_tipi
    when j.durum = 'grafik_bekliyor' then 'grafik_tasarim'::ekip_tipi
    when j.durum = 'metro_bekliyor' then 'metro'::ekip_tipi
  end as sorumlu_ekip
from public.jobs j
left join public.rezervasyon_detay r on r.job_id = j.id
left join public.grafik_detay g on g.job_id = j.id
where j.durum in ('rezervasyon_bekliyor','grafik_bekliyor','metro_bekliyor')
  and j.arsiv = false;
