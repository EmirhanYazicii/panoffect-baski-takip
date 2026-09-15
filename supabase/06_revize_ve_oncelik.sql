-- ============================================================================
-- Panoffect Baskı Süreç Takip Uygulaması — Revize Düzeltmesi + Acil Öncelik
-- 05a + 05b'den SONRA çalıştırın (tek dosya, enum eklemesi içermiyor).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- is_revizeye_gonder — artık Rezervasyon ekibi de kendi girdiği veriyi
-- (data linki değişti, adet arttı/azaldı vb.) fark edip işi tekrar
-- revizeye alabilir; Grafik/Metro/admin yetkisi aynen duruyor.
-- ----------------------------------------------------------------------------

create or replace function public.is_revizeye_gonder(p_job_id uuid, p_not text)
returns public.jobs
language plpgsql
security invoker
as $$
declare
  mevcut public.jobs;
begin
  select * into mevcut from public.jobs where id = p_job_id for update;
  if mevcut is null then
    raise exception 'İş bulunamadı: %', p_job_id;
  end if;

  if not public.mevcut_kullanici_admin_mi()
     and public.mevcut_kullanici_ekip() not in ('grafik_tasarim','metro_anadolu','metro_avrupa','rezervasyon') then
    raise exception 'Yalnızca Rezervasyon, Grafik Tasarım, Metro veya admin revizeye gönderebilir';
  end if;

  if mevcut.durum in ('tamamlandi','iptal','baslatildi') then
    raise exception 'Bu durumda revizeye gönderilemez: %', mevcut.durum;
  end if;

  update public.jobs
  set durum = 'revize_gerekiyor', revize_notu = p_not
  where id = p_job_id
  returning * into mevcut;

  -- İş yeniden Rezervasyon'dan başlayacağı için önceki tüm aşama verileri
  -- silinir; her ekip formunu sıfırdan, tazeden doldurur.
  delete from public.metro_detay where job_id = p_job_id;
  delete from public.grafik_detay where job_id = p_job_id;
  delete from public.rezervasyon_detay where job_id = p_job_id;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (p_job_id, auth.uid(), mevcut.durum, 'revize_gerekiyor', p_not);

  return mevcut;
end;
$$;

-- ----------------------------------------------------------------------------
-- yeni_is_baslat — artık öncelik (normal/acil) da parametre.
-- ----------------------------------------------------------------------------

create or replace function public.yeni_is_baslat(
  p_teslim_turu teslim_turu_tipi,
  p_baski_merkezi text,
  p_oncelik oncelik_tipi default 'normal'
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

  insert into public.jobs (baslatan_kullanici_id, durum, teslim_turu, baski_merkezi, oncelik)
  values (auth.uid(), 'baslatildi', p_teslim_turu, btrim(p_baski_merkezi), p_oncelik)
  returning * into yeni_is;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (yeni_is.id, auth.uid(), null, 'baslatildi', 'İş başlatıldı');

  update public.jobs set durum = 'rezervasyon_bekliyor' where id = yeni_is.id
  returning * into yeni_is;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (yeni_is.id, auth.uid(), 'baslatildi', 'rezervasyon_bekliyor', 'Rezervasyon ekibi bekleniyor');

  return yeni_is;
end;
$$;
