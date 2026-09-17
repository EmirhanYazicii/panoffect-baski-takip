-- ============================================================================
-- Panoffect Baskı Süreç Takip Uygulaması — Metro Anadolu / Avrupa Ayrımı
-- Faz 1B ek — 04'ten SONRA çalıştırın.
-- ============================================================================
-- Artık tek "metro" ekibi yok; iki bölge ekibi var: metro_anadolu, metro_avrupa.
-- Her iş için gereken bölge(ler), rezervasyon_detay.anadolu_adet /
-- avrupa_adet alanlarından belirlenir (adet > 0 ise o bölge de teslim
-- formu doldurmalı). Her ikisi de gerekliyse iş, İKİSİ de doldurana kadar
-- 'tamamlandi' olmaz. Teslim yeri artık bölgeye göre sabit: Anadolu ->
-- Ünalan Metro, Avrupa -> İTÜ Metro (manuel yazılmıyor).
-- ============================================================================

-- Ekip tipine yeni bölge değerleri (metro_anadolu, metro_avrupa) 05a
-- dosyasında ayrı bir adımda eklendi/committed edildi — burada tekrar
-- eklemeye çalışmıyoruz (Postgres aynı transaction'da hem enum değeri
-- ekleyip hem kullanmaya izin vermiyor).

create type bolge_tipi as enum ('anadolu', 'avrupa');

-- ----------------------------------------------------------------------------
-- metro_detay — artık job_id + bolge birleşik anahtar (her bölge kendi
-- satırını dolduruyor). Mevcut satırlar (varsa) Anadolu'ya taşınır; test
-- verisiyse önemi yok, gerekirse elle düzeltin.
-- ----------------------------------------------------------------------------

alter table public.metro_detay drop constraint metro_detay_pkey;
alter table public.metro_detay add column bolge bolge_tipi not null default 'anadolu';
alter table public.metro_detay alter column bolge drop default;
alter table public.metro_detay add primary key (job_id, bolge);

comment on column public.metro_detay.bolge is 'Bu teslim kaydının hangi bölge ekibine ait olduğu.';

-- ----------------------------------------------------------------------------
-- RLS — grafik/metro politikalarındaki 'metro' referansını iki bölgeye
-- genişlet.
-- ----------------------------------------------------------------------------

drop policy if exists "metro_insert_own_team" on public.metro_detay;
create policy "metro_insert_own_team"
  on public.metro_detay for insert
  with check (
    public.mevcut_kullanici_ekip() in ('metro_anadolu', 'metro_avrupa') or public.mevcut_kullanici_admin_mi()
  );

drop policy if exists "metro_update_own_team_or_admin" on public.metro_detay;
create policy "metro_update_own_team_or_admin"
  on public.metro_detay for update
  using (
    public.mevcut_kullanici_ekip() in ('metro_anadolu', 'metro_avrupa') or public.mevcut_kullanici_admin_mi()
  )
  with check (
    public.mevcut_kullanici_ekip() in ('metro_anadolu', 'metro_avrupa') or public.mevcut_kullanici_admin_mi()
  );

-- ----------------------------------------------------------------------------
-- is_asama_ilerlet — metro_bekliyor'dan çıkış artık gereken TÜM bölgeler
-- (rezervasyon_detay.anadolu_adet / avrupa_adet > 0 olanlar) doldurana
-- kadar gerçekleşmez. Bölge takımı kendi satırını yazıp bu fonksiyonu
-- çağırır; eksik bölge varsa durum metro_bekliyor'da kalır (sessizce,
-- hata vermeden — o bölge kendi payını tamamladı, diğerini bekliyor).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- is_revizeye_gonder — 'metro' yerine yeni bölge ekiplerini kabul etsin.
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
     and public.mevcut_kullanici_ekip() not in ('grafik_tasarim','metro_anadolu','metro_avrupa') then
    raise exception 'Yalnızca Grafik Tasarım, Metro veya admin revizeye gönderebilir';
  end if;

  update public.jobs
  set durum = 'revize_gerekiyor', revize_notu = p_not
  where id = p_job_id
  returning * into mevcut;

  insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
  values (p_job_id, auth.uid(), mevcut.durum, 'revize_gerekiyor', p_not);

  return mevcut;
end;
$$;

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
  rez public.rezervasyon_detay;
  anadolu_gerekli boolean;
  avrupa_gerekli boolean;
  anadolu_tamam boolean;
  avrupa_tamam boolean;
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
    if cagiran_ekip not in ('metro_anadolu', 'metro_avrupa') and not is_admin then
      raise exception 'Bu aşamayı yalnızca Metro (Anadolu/Avrupa) ekibi ilerletebilir';
    end if;

    select * into rez from public.rezervasyon_detay where job_id = p_job_id;
    anadolu_gerekli := coalesce(rez.anadolu_adet, 0) > 0;
    avrupa_gerekli := coalesce(rez.avrupa_adet, 0) > 0;
    -- Hiçbiri belirtilmemişse (bölge ayrımı yapılmamış eski/basit kayıt),
    -- tek bir bölge girişini yeterli say.
    if not anadolu_gerekli and not avrupa_gerekli then
      anadolu_gerekli := true;
    end if;

    anadolu_tamam := not anadolu_gerekli or exists (
      select 1 from public.metro_detay where job_id = p_job_id and bolge = 'anadolu'
    );
    avrupa_tamam := not avrupa_gerekli or exists (
      select 1 from public.metro_detay where job_id = p_job_id and bolge = 'avrupa'
    );

    if anadolu_tamam and avrupa_tamam then
      yeni_durum := 'tamamlandi';
    else
      -- Bir bölge kendi kısmını doldurdu ama diğeri bekleniyor; durumu
      -- değiştirmeden, sadece aktivite kaydı bırakıp geri dön.
      insert into public.job_aktivite (job_id, kullanici_id, eski_durum, yeni_durum, aciklama)
      values (p_job_id, auth.uid(), mevcut.durum, mevcut.durum, 'Bölge teslimi kaydedildi, diğer bölge bekleniyor');
      return mevcut;
    end if;

  elsif mevcut.durum = 'revize_gerekiyor' then
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
