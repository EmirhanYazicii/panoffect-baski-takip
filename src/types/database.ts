// Bu dosya supabase/01_schema.sql şeması ile birebir uyumlu tutulmalıdır.
// Faz 1A sonrası `supabase gen types typescript` ile otomatik üretime
// geçilmesi önerilir; şimdilik elle senkron tutulan sürüm.

export type EkipTipi = "baslatma" | "rezervasyon" | "grafik_tasarim" | "metro" | "metro_anadolu" | "metro_avrupa";
export type BolgeTipi = "anadolu" | "avrupa";
export type KullaniciRolu = "employee" | "admin";
export type IsDurumu =
  | "baslatildi"
  | "rezervasyon_bekliyor"
  | "grafik_bekliyor"
  | "metro_bekliyor"
  | "tamamlandi"
  | "revize_gerekiyor"
  | "iptal";
export type OncelikTipi = "normal" | "acil";
export type TeslimTuru = "marka_teslim" | "kendi_baski";

export interface UserRow {
  id: string;
  isim: string;
  e_posta: string;
  ekip: EkipTipi;
  role: KullaniciRolu;
  aktif: boolean;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRow {
  id: string;
  sayi: number;
  durum: IsDurumu;
  baslatan_kullanici_id: string | null;
  oncelik: OncelikTipi;
  arsiv: boolean;
  revize_notu: string | null;
  iptal_notu: string | null;
  teslim_turu: TeslimTuru;
  baski_merkezi: string | null;
  created_at: string;
  updated_at: string;
}

export interface RezervasyonDetayRow {
  job_id: string;
  marka: string | null;
  urun_olcu: string | null;
  data_iletim_tarihi: string | null;
  data_iletim_saati: string | null;
  data_linki: string | null;
  onayli_ton: string | null;
  toplam_adet: number | null;
  anadolu_adet: number | null;
  avrupa_adet: number | null;
  dolduran_kullanici_id: string | null;
  doldurulma_tarihi: string | null;
  updated_at: string;
}

export interface GrafikDetayRow {
  job_id: string;
  baskiyi_yapan_sirket: string | null;
  siparis_tarihi: string | null;
  siparis_saati: string | null;
  teslim_gereken_tarih: string | null;
  teslim_gereken_saat: string | null;
  dolduran_kullanici_id: string | null;
  doldurulma_tarihi: string | null;
  updated_at: string;
}

export interface MetroDetayRow {
  job_id: string;
  bolge: BolgeTipi;
  teslim_alinan_tarih: string | null;
  teslim_alinan_saat: string | null;
  teslim_alinan_adet: number | null;
  teslim_yeri: string | null;
  teslim_alan: string | null;
  teslim_eden: string | null;
  hata_notu: string | null;
  fotograf_url: string | null;
  dolduran_kullanici_id: string | null;
  doldurulma_tarihi: string | null;
  updated_at: string;
}

export interface JobAktiviteRow {
  id: string;
  job_id: string;
  kullanici_id: string | null;
  eski_durum: IsDurumu | null;
  yeni_durum: IsDurumu;
  aciklama: string | null;
  created_at: string;
}

/** Ana Liste ekranında kullanılan, join edilmiş görünüm. */
export interface JobListItem extends JobRow {
  rezervasyon_detay?: Pick<RezervasyonDetayRow, "marka" | "urun_olcu"> | null;
}

// Supabase JS istemcisinin generic tipini tatmin eden minimal Database şekli.
// Gerçek proje kurulumunda `supabase gen types typescript --local` çıktısıyla
// değiştirilmesi önerilir.
export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow> };
      jobs: { Row: JobRow; Insert: Partial<JobRow>; Update: Partial<JobRow> };
      rezervasyon_detay: {
        Row: RezervasyonDetayRow;
        Insert: Partial<RezervasyonDetayRow>;
        Update: Partial<RezervasyonDetayRow>;
      };
      grafik_detay: {
        Row: GrafikDetayRow;
        Insert: Partial<GrafikDetayRow>;
        Update: Partial<GrafikDetayRow>;
      };
      metro_detay: {
        Row: MetroDetayRow;
        Insert: Partial<MetroDetayRow>;
        Update: Partial<MetroDetayRow>;
      };
      job_aktivite: {
        Row: JobAktiviteRow;
        Insert: Partial<JobAktiviteRow>;
        Update: Partial<JobAktiviteRow>;
      };
    };
    Views: {
      gecikmis_isler: {
        Row: {
          job_id: string;
          sayi: number;
          durum: IsDurumu;
          referans_zaman: string | null;
          sorumlu_ekip: EkipTipi | null;
        };
      };
    };
  };
}
