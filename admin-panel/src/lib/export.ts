import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import logoUrl from "../assets/panoffect-logo.png";
import fontRegularUrl from "../assets/fonts/LiberationSerif-Regular.ttf?url";
import fontBoldUrl from "../assets/fonts/LiberationSerif-Bold.ttf?url";

// ============================================================================
// PDF — Türkçe karakter desteği
// ============================================================================
// jsPDF'in yerleşik "times" fontu (PDF'in standart 14 fontundan biri) yalnızca
// WinAnsi kodlamasını destekler; ğ, ş, ı, İ gibi Türkçe karakterleri hiç
// içermez. Bunun yerine, Times New Roman ile ölçü uyumlu (aynı satır/sütun
// genişlikleri), tamamen açık kaynak ve Türkçe karakterleri eksiksiz
// destekleyen "Liberation Serif" fontunu PDF'e gömüyoruz. Görsel olarak
// Times Roman ile pratikte ayırt edilemez.
const FONT_NAME = "LiberationSerif";

let fontsPromise: Promise<{ regular: string; bold: string }> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadFontsBase64(): Promise<{ regular: string; bold: string }> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(fontRegularUrl).then((r) => r.arrayBuffer()),
      fetch(fontBoldUrl).then((r) => r.arrayBuffer()),
    ]).then(([reg, bold]) => ({
      regular: arrayBufferToBase64(reg),
      bold: arrayBufferToBase64(bold),
    }));
  }
  return fontsPromise;
}

async function registerTurkishFont(doc: jsPDF) {
  const { regular, bold } = await loadFontsBase64();
  doc.addFileToVFS("LiberationSerif-Regular.ttf", regular);
  doc.addFileToVFS("LiberationSerif-Bold.ttf", bold);
  doc.addFont("LiberationSerif-Regular.ttf", FONT_NAME, "normal");
  doc.addFont("LiberationSerif-Bold.ttf", FONT_NAME, "bold");
  doc.setFont(FONT_NAME, "normal");
}

let cachedLogo: string | null = null;
function getLogoDataUrl(): Promise<string> {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas context alınamadı"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      cachedLogo = canvas.toDataURL("image/png");
      resolve(cachedLogo);
    };
    img.onerror = () => reject(new Error("logo yüklenemedi"));
    img.src = logoUrl;
  });
}

/** Panoffect logolu, başlıklı ve tarihli, Türkçe karakterleri düzgün
 * gösteren bir PDF raporu başlatır. Dönen `y`, bir sonraki içeriğin
 * başlayabileceği dikey konumdur. */
export async function createReportPdf(
  title: string
): Promise<{ doc: jsPDF; y: number }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await registerTurkishFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();

  try {
    const logo = await getLogoDataUrl();
    const props = doc.getImageProperties(logo);
    const w = 120;
    const h = (props.height / props.width) * w;
    doc.addImage(logo, "PNG", 40, 28, w, h);
  } catch {
    // Logo yüklenemezse rapor metinle devam eder, kritik değil.
  }

  doc.setFont(FONT_NAME, "bold");
  doc.setTextColor(26, 20, 100);
  doc.setFontSize(16);
  doc.text(title, pageWidth - 40, 46, { align: "right" });

  doc.setFont(FONT_NAME, "normal");
  doc.setTextColor(107, 111, 138);
  doc.setFontSize(9);
  doc.text(
    `Oluşturulma: ${new Date().toLocaleString("tr-TR")}`,
    pageWidth - 40,
    62,
    { align: "right" }
  );

  doc.setDrawColor(230, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 82, pageWidth - 40, 82);

  return { doc, y: 108 };
}

export function addSectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont(FONT_NAME, "bold");
  doc.setTextColor(26, 20, 100);
  doc.setFontSize(12);
  doc.text(text, 40, y);
  doc.setFont(FONT_NAME, "normal");
  return y + 10;
}

export function addKpiRow(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - 80;
  const colW = usable / items.length;
  items.forEach((item, i) => {
    const x = 40 + i * colW;
    doc.setFont(FONT_NAME, "normal");
    doc.setTextColor(107, 111, 138);
    doc.setFontSize(8);
    doc.text(item.label, x, y);
    doc.setFont(FONT_NAME, "bold");
    doc.setTextColor(26, 20, 100);
    doc.setFontSize(14);
    doc.text(item.value, x, y + 18);
  });
  doc.setFont(FONT_NAME, "normal");
  return y + 38;
}

/** Bir tabloyu PDF'e ekler, gerekirse otomatik sayfa taşırır. Dönen değer,
 * bir sonraki elemanın başlayabileceği y konumudur. Türkçe karakterler
 * gömülü LiberationSerif fontuyla doğru gösterilir. */
export function addTable(
  doc: jsPDF,
  startY: number,
  head: string[],
  body: (string | number)[][]
): number {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: 40, right: 40 },
    styles: { font: FONT_NAME, fontStyle: "normal", fontSize: 9, textColor: [42, 46, 53] },
    headStyles: {
      font: FONT_NAME,
      fontStyle: "bold",
      fillColor: [26, 20, 100],
      textColor: 255,
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [247, 248, 251] },
    theme: "grid",
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY + 24;
}

export function ensureSpace(doc: jsPDF, y: number, needed = 60): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 40) {
    doc.addPage();
    return 50;
  }
  return y;
}

// ============================================================================
// EXCEL — gerçek biçimlendirme (başlık rengi, kenarlık, otomatik genişlik,
// alternatif satır rengi, dondurulmuş başlık, filtre) — sade/düz tablo değil.
// ============================================================================

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sayfa1";
}

const NAVY = "FF1A1464";
const HEADER_TEXT = "FFFFFFFF";
const ROW_TEXT = "FF2A2E35";
const ALT_ROW_BG = "FFF7F8FB";
const BORDER_COLOR = "FFE6E8F0";

export async function downloadExcel(
  fileName: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Panoffect Baskı Süreç Takip";
  wb.created = new Date();

  sheets.forEach((s) => {
    const ws = wb.addWorksheet(safeSheetName(s.name), {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    if (!s.rows.length) {
      ws.addRow(["Bu sekme için veri bulunamadı."]);
      return;
    }

    const headers = Object.keys(s.rows[0]);
    ws.columns = headers.map((h) => {
      const maxContentLen = s.rows.reduce(
        (max, r) => Math.max(max, String(r[h] ?? "").length),
        h.length
      );
      return {
        header: h,
        key: h,
        width: Math.min(42, Math.max(12, maxContentLen + 3)),
      };
    });

    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: HEADER_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: NAVY } },
        bottom: { style: "thin", color: { argb: NAVY } },
        left: { style: "thin", color: { argb: NAVY } },
        right: { style: "thin", color: { argb: NAVY } },
      };
    });

    s.rows.forEach((r, idx) => {
      const row = ws.addRow(r);
      row.height = 20;
      const isAlt = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 10, color: { argb: ROW_TEXT } };
        cell.alignment = { vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: BORDER_COLOR } },
          bottom: { style: "thin", color: { argb: BORDER_COLOR } },
          left: { style: "thin", color: { argb: BORDER_COLOR } },
          right: { style: "thin", color: { argb: BORDER_COLOR } },
        };
        if (isAlt) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
        }
      });
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
