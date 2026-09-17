// Panoffect marka renkleri (logodan alınmıştır)
export const colors = {
  navy: "#1a1464",
  cyan: "#12b8e8",
  white: "#ffffff",
  black: "#1a1a1a",

  background: "#f7f8fb",
  card: "#ffffff",
  border: "#e6e8f0",
  textPrimary: "#1a1a2e",
  textSecondary: "#6b6f8a",

  // Durum renkleri (Ana Liste'deki etiketler için)
  durum: {
    baslatildi: "#8a8fa8",
    rezervasyon_bekliyor: "#f2994a",
    grafik_bekliyor: "#2f80ed",
    metro_bekliyor: "#9b51e0",
    tamamlandi: "#27ae60",
    revize_gerekiyor: "#eb5757",
    iptal: "#4b4b4b",
  },

  danger: "#eb5757",
  success: "#27ae60",
  warning: "#f2994a",
};

export const durumEtiketleri: Record<string, string> = {
  baslatildi: "Başlatıldı",
  rezervasyon_bekliyor: "Rezervasyon Bekliyor",
  grafik_bekliyor: "Grafik Bekliyor",
  metro_bekliyor: "Metro Bekliyor",
  tamamlandi: "Tamamlandı",
  revize_gerekiyor: "Revize Gerekiyor",
  iptal: "İptal",
};

export const ekipEtiketleri: Record<string, string> = {
  baslatma: "Başlatma",
  rezervasyon: "Rezervasyon",
  grafik_tasarim: "Grafik Tasarım",
  metro: "Metro",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};
