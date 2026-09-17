// Panoffect Baskı Süreç Takip — Teslim Formu (PDF)
//
// Bir iş "Tamamlandı" durumuna geçtiğinde, teslim eden (Metro ekibi) ile
// teslim alan kişinin imzalayacağı fiziksel formun dijital karşılığını
// üretir. Şirketin kullandığı iki Excel şablonuyla birebir aynı alanları
// içerir:
//   - "kendi_baski" (Panoffect Tarafından Gönderilen): Rezervasyon +
//     Grafik Tasarım + Metro bölümleri.
//   - "marka_teslim" (Marka Tarafından Teslim Edilen): Rezervasyon +
//     Metro bölümleri (Grafik Tasarım atlanır).
// Bir iş hem Anadolu hem Avrupa'ya teslim gerektiriyorsa, HER BÖLGE İÇİN
// AYRI, BAĞIMSIZ BİR FORM üretilir (aynı PDF'te iki bölüm değil) — böylece
// her bölge ekibi kendi kâğıdını ayrı ayrı bastırıp imzalatabilir.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PANOFFECT_LOGO_BASE64 } from "@/assets/logoBase64";
import type { JobRow, RezervasyonDetayRow, GrafikDetayRow, MetroDetayRow } from "@/types/database";

function tarihFormatla(deger?: string | null): string {
  if (!deger) return "—";
  const d = new Date(deger);
  if (isNaN(d.getTime())) return deger;
  return d.toLocaleDateString("tr-TR");
}

function saatFormatla(deger?: string | null): string {
  if (!deger) return "—";
  // "14:30:00" -> "14:30"
  return deger.slice(0, 5);
}

function esc(v: unknown): string {
  const s = v === null || v === undefined || v === "" ? "—" : String(v);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function satir(etiket: string, deger: string): string {
  return `<tr><td class="etiket">${esc(etiket)}</td><td class="deger">${esc(deger)}</td></tr>`;
}

function bolgeEtiket(b: "anadolu" | "avrupa"): string {
  return b === "anadolu" ? "Anadolu" : "Avrupa";
}

const STIL = `
  @page { margin: 36px 40px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a2e; font-size: 12px; }
  .ust { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .logo { height: 34px; }
  .sayi { font-size: 13px; font-weight: 700; color: #1a1464; }
  h1 { font-size: 19px; color: #1a1464; margin: 0 0 2px 0; }
  .alt-baslik { font-size: 12px; color: #6b6f8a; margin: 0 0 16px 0; }
  h2 { font-size: 13px; color: #1a1464; border-bottom: 2px solid #1a1464; padding-bottom: 3px; margin: 18px 0 8px 0; }
  table.veri-tablo { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.veri-tablo td { border: 1px solid #d8dce3; padding: 6px 10px; font-size: 12px; }
  table.veri-tablo td.etiket { width: 46%; font-weight: 600; background: #f7f8fb; }
  table.veri-tablo td.deger { width: 54%; }
  table.imza-tablo { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.imza-tablo td { border: 1px solid #d8dce3; padding: 14px 10px; font-size: 12px; }
  table.imza-tablo td.etiket { width: 22%; font-weight: 600; background: #f7f8fb; }
  table.imza-tablo td.deger { width: 38%; }
  table.imza-tablo td.imza-alan { width: 40%; color: #6b6f8a; }
  .hata-notu { margin-top: 8px; padding: 8px 10px; border: 1px solid #eb5757; background: #fdecea; border-radius: 4px; font-size: 11px; }
  .acil-rozet { display: inline-block; background: #eb5757; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
  .bolge-rozet { display: inline-block; background: #1a1464; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
  .alt-bilgi { margin-top: 24px; font-size: 10px; color: #6b6f8a; text-align: center; }
`;

/** Tek bir iş + tek bir bölgenin (Anadolu YA DA Avrupa) Metro teslim
 * bilgisiyle, baştan sona TAMAMEN BAĞIMSIZ bir "Baskı Teslim Formu" HTML'i
 * üretir. İki bölge de gerekiyorsa bu fonksiyon iki kere çağrılır — her
 * seferinde ayrı bir form (ayrı imza satırlarıyla) ortaya çıkar.
 */
export function teslimFormuHtmlUret(
  job: JobRow,
  rezervasyon: RezervasyonDetayRow | null,
  grafik: GrafikDetayRow | null,
  metro: MetroDetayRow | null
): string {
  const markaTeslim = job.teslim_turu === "marka_teslim";
  const acilRozet = job.oncelik === "acil" ? `<span class="acil-rozet">ACİL</span>` : "";
  const bolgeRozet = metro ? `<span class="bolge-rozet">${bolgeEtiket(metro.bolge).toUpperCase()}</span>` : "";

  const rezervasyonBolumu = markaTeslim
    ? `
      <h2>1. REZERVASYON</h2>
      <table class="veri-tablo">
        ${satir("Marka", rezervasyon?.marka ?? "—")}
        ${satir("Ürün / Ölçü", rezervasyon?.urun_olcu ?? "—")}
        ${satir("Toplam Adet Sayısı", rezervasyon?.toplam_adet != null ? String(rezervasyon.toplam_adet) : "—")}
        ${satir("Anadolu Adet Sayısı", rezervasyon?.anadolu_adet != null ? String(rezervasyon.anadolu_adet) : "—")}
        ${satir("Avrupa Adet Sayısı", rezervasyon?.avrupa_adet != null ? String(rezervasyon.avrupa_adet) : "—")}
      </table>
    `
    : `
      <h2>1. REZERVASYON</h2>
      <table class="veri-tablo">
        ${satir("Marka", rezervasyon?.marka ?? "—")}
        ${satir("Basılan Ürün / Ölçü", rezervasyon?.urun_olcu ?? "—")}
        ${satir("Datanın İletim Tarihi", tarihFormatla(rezervasyon?.data_iletim_tarihi))}
        ${satir("Datanın İletim Saati", saatFormatla(rezervasyon?.data_iletim_saati))}
        ${satir("Data Linki", rezervasyon?.data_linki ?? "—")}
        ${satir("Onaylı Ton", rezervasyon?.onayli_ton ?? "—")}
        ${satir("Basılacak Toplam Adet Sayısı", rezervasyon?.toplam_adet != null ? String(rezervasyon.toplam_adet) : "—")}
        ${satir("Anadolu Adet Sayısı", rezervasyon?.anadolu_adet != null ? String(rezervasyon.anadolu_adet) : "—")}
        ${satir("Avrupa Adet Sayısı", rezervasyon?.avrupa_adet != null ? String(rezervasyon.avrupa_adet) : "—")}
      </table>
    `;

  const grafikBolumu = markaTeslim
    ? ""
    : `
      <h2>2. GRAFİK TASARIM</h2>
      <table class="veri-tablo">
        ${satir("Baskıyı Yapan Şirket", grafik?.baskiyi_yapan_sirket ?? job.baski_merkezi ?? "—")}
        ${satir("Baskı Sipariş Tarihi", tarihFormatla(grafik?.siparis_tarihi))}
        ${satir("Baskı Sipariş Saati", saatFormatla(grafik?.siparis_saati))}
        ${satir("Baskının Teslim Edilmesi Gereken Tarih", tarihFormatla(grafik?.teslim_gereken_tarih))}
        ${satir("Baskının Teslim Edilmesi Gereken Saat", saatFormatla(grafik?.teslim_gereken_saat))}
      </table>
    `;

  // marka_teslim işlerde Grafik aşaması atlandığı için "Baskı Yapan Şirket"
  // bilgisi Metro bölümünün başında (iş açılırken girilen baski_merkezi'nden) gösterilir.
  const metroUstBilgi = markaTeslim
    ? `<table class="veri-tablo">${satir("Baskı Yapan Şirket", job.baski_merkezi ?? "—")}</table>`
    : "";

  const bolumNo = markaTeslim ? 2 : 3;
  const bolgeAdi = metro ? bolgeEtiket(metro.bolge) : "";

  const metroBolumu = `
    <h2>${bolumNo}. METRO${bolgeAdi ? ` — ${bolgeAdi.toUpperCase()}` : ""}</h2>
    <table class="veri-tablo">
      ${satir("Baskının Teslim Alındığı Tarih", tarihFormatla(metro?.teslim_alinan_tarih))}
      ${satir("Baskının Teslim Alındığı Saat", saatFormatla(metro?.teslim_alinan_saat))}
      ${satir("Teslim Alınan Adet", metro?.teslim_alinan_adet != null ? String(metro.teslim_alinan_adet) : "—")}
      ${satir("Teslim Yeri", metro?.teslim_yeri ?? "—")}
    </table>
    <table class="imza-tablo">
      <tr>
        <td class="etiket">Teslim Alan</td>
        <td class="deger">${esc(metro?.teslim_alan)}</td>
        <td class="imza-alan">İmza:</td>
      </tr>
      <tr>
        <td class="etiket">Teslim Eden</td>
        <td class="deger">${esc(metro?.teslim_eden)}</td>
        <td class="imza-alan">İmza:</td>
      </tr>
    </table>
  `;

  const hataNotu = metro?.hata_notu;

  return `
    <html>
      <head><meta charset="utf-8" /><style>${STIL}</style></head>
      <body>
        <div class="ust">
          <img class="logo" src="${PANOFFECT_LOGO_BASE64}" />
          <div class="sayi">SAYI: ${esc(job.sayi)}</div>
        </div>
        <h1>BASKI TESLİM FORMU${acilRozet}${bolgeRozet}</h1>
        <div class="alt-baslik">
          ${markaTeslim ? "(Marka Tarafından Teslim Edilen)" : "(Panoffect Tarafından Gönderilen)"}
        </div>

        ${rezervasyonBolumu}
        ${grafikBolumu}
        ${metroUstBilgi}
        ${metroBolumu}

        <h2>TESLİMDE EKSİKLİK / HATA DURUMU</h2>
        <div class="veri-tablo" style="border:1px solid #d8dce3; padding:10px; min-height:40px; font-size:12px;">
          ${hataNotu ? esc(hataNotu) : '<i style="color:#6b6f8a">Eksiklik/hata bildirilmedi.</i>'}
        </div>

        <div class="alt-bilgi">Panoffect Medya A.Ş. — Bu form Baskı Süreç Takip sisteminden otomatik oluşturulmuştur.</div>
      </body>
    </html>
  `;
}

/** Bir işin, gerekli TÜM bölgeleri için ayrı ayrı form HTML'lerini üretir.
 * Tek bölge varsa tek form, iki bölge varsa (Anadolu + Avrupa) iki bağımsız
 * form döner. metro_detay hiç yoksa (olağan dışı durum) tek, boş bir form
 * döner. */
export function teslimFormulariniUret(
  job: JobRow,
  rezervasyon: RezervasyonDetayRow | null,
  grafik: GrafikDetayRow | null,
  metroKayitlari: MetroDetayRow[]
): { bolgeAdi: string | null; html: string }[] {
  if (metroKayitlari.length === 0) {
    return [{ bolgeAdi: null, html: teslimFormuHtmlUret(job, rezervasyon, grafik, null) }];
  }
  const siraliBolgeler: ("anadolu" | "avrupa")[] = ["anadolu", "avrupa"];
  return siraliBolgeler
    .map((b) => metroKayitlari.find((m) => m.bolge === b))
    .filter((m): m is MetroDetayRow => !!m)
    .map((m) => ({
      bolgeAdi: bolgeEtiket(m.bolge),
      html: teslimFormuHtmlUret(job, rezervasyon, grafik, m),
    }));
}

/** Tek bir formu, cihazın native yazdırma diyaloğuyla açar (yazdırabilir
 * veya "PDF olarak kaydet" ile dosya olarak kaydedebilir). */
export async function formuYazdir(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/** Her bölge için ayrı ayrı, cihazın native yazdırma diyaloğunu sırayla
 * açar. Kullanıcı her diyalogda doğrudan yazdırabilir veya "PDF olarak
 * kaydet" seçeneğiyle dosya olarak kaydedebilir. expo-print'in kendi geçici
 * dosyasını başka bir modüle (expo-sharing/expo-file-system) URI olarak
 * aktarmaya çalışmak Expo Go'da (özellikle Android'de) izin hatalarına yol
 * açtığı için, en güvenilir yol HTML'i doğrudan Print.printAsync'e
 * vermektir — ara dosya hiç oluşmaz, bu yüzden okunamama/paylaşılamama
 * sorunu da olmaz. */
export async function teslimFormunuOlusturVePaylas(
  job: JobRow,
  rezervasyon: RezervasyonDetayRow | null,
  grafik: GrafikDetayRow | null,
  metroKayitlari: MetroDetayRow[]
): Promise<void> {
  const formlar = teslimFormulariniUret(job, rezervasyon, grafik, metroKayitlari);
  for (const form of formlar) {
    await Print.printAsync({ html: form.html });
  }
}

/** Alternatif: PDF'i cihaza kaydetmek veya doğrudan bir uygulamayla
 * (WhatsApp, e-posta vb.) paylaşmak istersen bu fonksiyonu kullan. Not:
 * bazı Android/Expo Go sürümlerinde expo-print'in ürettiği geçici dosya
 * expo-sharing tarafından okunamayabiliyor ("Not allowed to read file" /
 * "isn't readable" hataları); sorun yaşarsan yukarıdaki
 * teslimFormunuOlusturVePaylas (native yazdırma diyaloğu) fonksiyonunu
 * kullan. */
export async function teslimFormunuPaylas(
  job: JobRow,
  rezervasyon: RezervasyonDetayRow | null,
  grafik: GrafikDetayRow | null,
  metroKayitlari: MetroDetayRow[]
): Promise<void> {
  const formlar = teslimFormulariniUret(job, rezervasyon, grafik, metroKayitlari);
  const paylasilabilirMi = await Sharing.isAvailableAsync();
  for (const form of formlar) {
    const { uri } = await Print.printToFileAsync({ html: form.html, base64: false });
    if (paylasilabilirMi) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Teslim Formu — İş #${job.sayi}${form.bolgeAdi ? ` (${form.bolgeAdi})` : ""}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      await Print.printAsync({ uri });
    }
  }
}
