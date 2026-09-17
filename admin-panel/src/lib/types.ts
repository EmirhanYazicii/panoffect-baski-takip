export type IsDurumu =
  | "baslatildi"
  | "rezervasyon_bekliyor"
  | "grafik_bekliyor"
  | "metro_bekliyor"
  | "tamamlandi"
  | "revize_gerekiyor"
  | "iptal";

export const durumEtiketleri: Record<IsDurumu, string> = {
  baslatildi: "Başlatıldı",
  rezervasyon_bekliyor: "Rezervasyon Bekliyor",
  grafik_bekliyor: "Grafik Bekliyor",
  metro_bekliyor: "Metro Bekliyor",
  tamamlandi: "Tamamlandı",
  revize_gerekiyor: "Revize Gerekiyor",
  iptal: "İptal",
};

export const durumRenkleri: Record<IsDurumu, string> = {
  baslatildi: "bg-durum-baslatildi",
  rezervasyon_bekliyor: "bg-durum-rezervasyon",
  grafik_bekliyor: "bg-durum-grafik",
  metro_bekliyor: "bg-durum-metro",
  tamamlandi: "bg-durum-tamamlandi",
  revize_gerekiyor: "bg-durum-revize",
  iptal: "bg-durum-iptal",
};

export interface JobRow {
  id: string;
  sayi: number;
  durum: IsDurumu;
  baslatan_kullanici_id: string | null;
  oncelik: "normal" | "acil";
  arsiv: boolean;
  revize_notu: string | null;
  iptal_notu: string | null;
  teslim_turu: "marka_teslim" | "kendi_baski";
  baski_merkezi: string | null;
  created_at: string;
  updated_at: string;
  rezervasyon_detay?: {
    marka: string | null;
    urun_olcu: string | null;
    toplam_adet: number | null;
    anadolu_adet: number | null;
    avrupa_adet: number | null;
    data_linki: string | null;
  } | null;
  grafik_detay?: {
    baskiyi_yapan_sirket: string | null;
    teslim_gereken_tarih: string | null;
  } | null;
  metro_detay?: Array<{
    bolge: "anadolu" | "avrupa";
    teslim_alinan_tarih: string | null;
    teslim_alinan_adet: number | null;
    teslim_yeri: string | null;
  }> | null;
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

export interface TamamlananIsSuresi {
  job_id: string;
  sayi: number;
  teslim_turu: string;
  oncelik: string;
  baski_merkezi: string | null;
  marka: string | null;
  toplam_adet: number | null;
  baslama_zamani: string;
  tamamlanma_zamani: string | null;
  toplam_sure: string | null; // Postgres interval -> string
  rezervasyon_suresi: string | null;
  grafik_suresi: string | null;
  metro_suresi: string | null;
  revize_gecmisi_var: boolean;
}

export interface AsamaOrtalamaSuresi {
  asama: IsDurumu;
  tamamlanan_sayisi: number;
  ortalama_sure: string | null;
  min_sure: string | null;
  max_sure: string | null;
  medyan_sure: string | null;
}

export interface AylikOzet {
  ay: string;
  acilan_is_sayisi: number;
  tamamlanan_is_sayisi: number;
  iptal_is_sayisi: number;
  acil_is_sayisi: number;
  ortalama_toplam_sure: string | null;
}

export const EKIP_SECENEKLERI = [
  { value: "baslatma", label: "Başlatma" },
  { value: "rezervasyon", label: "Rezervasyon" },
  { value: "grafik_tasarim", label: "Grafik Tasarım" },
  { value: "metro_anadolu", label: "Metro — Anadolu" },
  { value: "metro_avrupa", label: "Metro — Avrupa" },
];

export interface UserRow {
  id: string;
  isim: string;
  e_posta: string;
  ekip: string;
  role: "employee" | "admin";
  aktif: boolean;
  created_at: string;
}

export interface EkipBazliOrtalama {
  ekip: string;
  tamamlanan_sayisi: number;
  ortalama_sure: string | null;
  min_sure: string | null;
  max_sure: string | null;
}

export interface MerkezAnaliz {
  merkez_anahtari: string;
  goruntu_adi: string;
  is_sayisi: number;
  ortalama_sure: string | null;
}

export interface MarkaAnaliz {
  marka_anahtari: string;
  goruntu_adi: string;
  is_sayisi: number;
  ortalama_sure: string | null;
}

export interface EkipPerformans {
  kullanici_id: string;
  isim: string;
  ekip: string;
  asama: string;
  doldurulan_sayisi: number;
  ortalama_sure: string | null;
}

/** Postgres interval string'ini ("2 days 03:15:00" veya "03:15:00")
 * okunabilir Türkçe süreye çevirir. */
export function sureFormatla(interval: string | null): string {
  if (!interval) return "—";
  let totalSeconds = 0;
  const dayMatch = interval.match(/(-?\d+)\s+days?/);
  const timeMatch = interval.match(/(\d{1,3}):(\d{2}):(\d{2})/);
  if (dayMatch) totalSeconds += parseInt(dayMatch[1], 10) * 86400;
  if (timeMatch) {
    totalSeconds +=
      parseInt(timeMatch[1], 10) * 3600 +
      parseInt(timeMatch[2], 10) * 60 +
      parseInt(timeMatch[3], 10);
  }
  if (!dayMatch && !timeMatch) {
    const n = parseFloat(interval);
    if (!isNaN(n)) totalSeconds = n;
  }
  const gun = Math.floor(totalSeconds / 86400);
  const saat = Math.floor((totalSeconds % 86400) / 3600);
  const dakika = Math.floor((totalSeconds % 3600) / 60);
  if (gun > 0) return `${gun}g ${saat}s`;
  if (saat > 0) return `${saat}s ${dakika}dk`;
  return `${dakika}dk`;
}
