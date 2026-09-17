import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "../lib/supabase";
import {
  TamamlananIsSuresi,
  sureFormatla,
  EkipBazliOrtalama,
  MerkezAnaliz,
  MarkaAnaliz,
} from "../lib/types";
import {
  downloadExcel,
  createReportPdf,
  addSectionTitle,
  addKpiRow,
  addTable,
  ensureSpace,
} from "../lib/export";

const RENKLER = ["#1a1464", "#12b8e8", "#9b51e0", "#27ae60", "#f2994a", "#eb5757"];

const EKIP_ETIKET: Record<string, string> = {
  rezervasyon: "Rezervasyon",
  grafik_tasarim: "Grafik Tasarım",
  metro_anadolu: "Metro — Anadolu",
  metro_avrupa: "Metro — Avrupa",
};

export default function Analytics() {
  const [isler, setIsler] = useState<TamamlananIsSuresi[]>([]);
  const [merkezler, setMerkezler] = useState<MerkezAnaliz[]>([]);
  const [markalar, setMarkalar] = useState<MarkaAnaliz[]>([]);
  const [ekipSureleri, setEkipSureleri] = useState<EkipBazliOrtalama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [islerRes, merkezRes, markaRes, ekipRes] = await Promise.all([
        supabase
          .from("tamamlanan_is_sureleri")
          .select("*")
          .order("tamamlanma_zamani", { ascending: false })
          .limit(500),
        supabase
          .from("baski_merkezi_analiz")
          .select("*")
          .order("is_sayisi", { ascending: false })
          .limit(8),
        supabase
          .from("marka_analiz")
          .select("*")
          .order("is_sayisi", { ascending: false })
          .limit(20),
        supabase.from("ekip_bazli_ortalama_sureleri").select("*"),
      ]);
      setIsler((islerRes.data as TamamlananIsSuresi[]) ?? []);
      setMerkezler((merkezRes.data as MerkezAnaliz[]) ?? []);
      setMarkalar((markaRes.data as MarkaAnaliz[]) ?? []);
      setEkipSureleri((ekipRes.data as EkipBazliOrtalama[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Baskı merkezi büyük/küçük harf farkını yok sayarak (norm_metin) tek
  // satırda toplanmış geliyor — burada sadece grafiğe uygun şekle sokuyoruz.
  const merkezDagilimi = merkezler.map((m) => ({
    name: m.goruntu_adi,
    value: m.is_sayisi,
  }));

  const ekipGrafikVeri = ekipSureleri.map((e) => ({
    ekip: EKIP_ETIKET[e.ekip] ?? e.ekip,
    saat: e.ortalama_sure ? intervalToHoursLocal(e.ortalama_sure) : 0,
  }));

  const teslimTuruDagilimi = Object.entries(
    isler.reduce((acc: Record<string, number>, i) => {
      const k = i.teslim_turu === "marka_teslim" ? "Marka Tarafından Teslim" : "Panoffect Gönderimi";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const revizeliIsSayisi = isler.filter((i) => i.revize_gecmisi_var).length;
  const revizeOrani = isler.length ? ((revizeliIsSayisi / isler.length) * 100).toFixed(1) : "0";

  if (loading) return <div className="text-texts">Yükleniyor…</div>;

  function excelIndir() {
    downloadExcel(`analitik-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "Ekip Süreleri",
        rows: ekipSureleri.map((e) => ({
          Ekip: EKIP_ETIKET[e.ekip] ?? e.ekip,
          "Tamamlanan İş": e.tamamlanan_sayisi,
          "Ortalama Süre": sureFormatla(e.ortalama_sure),
          "Min Süre": sureFormatla(e.min_sure),
          "Maks Süre": sureFormatla(e.max_sure),
        })),
      },
      {
        name: "Baskı Merkezleri",
        rows: merkezler.map((m) => ({
          "Baskı Merkezi": m.goruntu_adi,
          "İş Sayısı": m.is_sayisi,
          "Ortalama Süre": sureFormatla(m.ortalama_sure),
        })),
      },
      {
        name: "Markalar",
        rows: markalar.map((m) => ({
          Marka: m.goruntu_adi,
          "İş Sayısı": m.is_sayisi,
          "Ortalama Süre": sureFormatla(m.ortalama_sure),
        })),
      },
      {
        name: "İş Bazında Süre Dökümü",
        rows: isler.map((i) => ({
          "İş No": i.sayi,
          Marka: i.marka ?? "",
          "Baskı Merkezi": i.baski_merkezi ?? "",
          Rezervasyon: sureFormatla(i.rezervasyon_suresi),
          Grafik: sureFormatla(i.grafik_suresi),
          Metro: sureFormatla(i.metro_suresi),
          Toplam: sureFormatla(i.toplam_sure),
          "Revize Geçmişi": i.revize_gecmisi_var ? "Evet" : "Hayır",
        })),
      },
    ]);
  }

  async function pdfIndir() {
    const { doc, y } = await createReportPdf("Analitik Raporu");
    let cursor = y;
    cursor = addKpiRow(doc, cursor, [
      {
        label: "Ortalama Toplam Süre",
        value: sureFormatla(ortalamaInterval(isler.map((i) => i.toplam_sure))),
      },
      { label: "Revize Oranı", value: `%${revizeOrani}` },
      { label: "Tamamlanan İş", value: String(isler.length) },
    ]);
    cursor += 10;

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "Ekip Bazlı Ortalama Süre", cursor);
    cursor = addTable(
      doc,
      cursor,
      ["Ekip", "Tamamlanan İş", "Ortalama", "Min", "Maks"],
      ekipSureleri.map((e) => [
        EKIP_ETIKET[e.ekip] ?? e.ekip,
        e.tamamlanan_sayisi,
        sureFormatla(e.ortalama_sure),
        sureFormatla(e.min_sure),
        sureFormatla(e.max_sure),
      ])
    );

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "En Çok Kullanılan Baskı Merkezleri", cursor);
    cursor = addTable(
      doc,
      cursor,
      ["Baskı Merkezi", "İş Sayısı", "Ortalama Süre"],
      merkezler.map((m) => [m.goruntu_adi, m.is_sayisi, sureFormatla(m.ortalama_sure)])
    );

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "İş Bazında Süre Dökümü", cursor);
    addTable(
      doc,
      cursor,
      ["İş No", "Marka", "Rezervasyon", "Grafik", "Metro", "Toplam"],
      isler
        .slice(0, 150)
        .map((i) => [
          `#${i.sayi}`,
          i.marka ?? "—",
          sureFormatla(i.rezervasyon_suresi),
          sureFormatla(i.grafik_suresi),
          sureFormatla(i.metro_suresi),
          sureFormatla(i.toplam_sure),
        ])
    );

    doc.save(`analitik-raporu-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textp">Analitik</h1>
          <p className="text-texts text-sm mt-1">
            Tamamlanmış {isler.length} iş üzerinden detaylı analiz
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={excelIndir}
            className="text-sm bg-white border border-border rounded-lg px-4 py-2 hover:bg-bg"
          >
            ⬇ Excel'e Aktar
          </button>
          <button
            onClick={pdfIndir}
            className="text-sm bg-white border border-border rounded-lg px-4 py-2 hover:bg-bg"
          >
            ⬇ PDF Rapor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-sm text-texts">Ortalama Toplam Süre</div>
          <div className="text-2xl font-bold text-navy mt-1">
            {sureFormatla(ortalamaInterval(isler.map((i) => i.toplam_sure)))}
          </div>
          <div className="text-xs text-texts mt-1">Rezervasyondan tamamlanmaya kadar</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-sm text-texts">Revize Oranı</div>
          <div className="text-2xl font-bold text-red-600 mt-1">%{revizeOrani}</div>
          <div className="text-xs text-texts mt-1">{revizeliIsSayisi} iş en az bir kez revizeye gitti</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-sm text-texts">Toplam Tamamlanan İş</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{isler.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-semibold text-textp mb-1">
          Ekip Bazlı Ortalama Süre Karşılaştırması
        </h2>
        <p className="text-xs text-texts mb-4">
          Rezervasyon, Grafik Tasarım, Metro Anadolu ve Metro Avrupa ekiplerinin
          kendi aşamalarında ortalama ne kadar süre harcadığı
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ekipGrafikVeri}>
            <XAxis dataKey="ekip" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="s" />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)} saat`, "Ortalama"]} />
            <Bar dataKey="saat" fill="#9b51e0" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-4 gap-3 mt-4 text-center text-xs">
          {ekipSureleri.map((e) => (
            <div key={e.ekip}>
              <div className="text-texts">{EKIP_ETIKET[e.ekip] ?? e.ekip}</div>
              <div className="font-semibold text-textp">{sureFormatla(e.ortalama_sure)}</div>
              <div className="text-texts">
                {e.tamamlanan_sayisi} iş · min {sureFormatla(e.min_sure)} · maks{" "}
                {sureFormatla(e.max_sure)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-textp mb-1">En Çok Kullanılan Baskı Merkezleri</h2>
          <p className="text-xs text-texts mb-4">
            Büyük/küçük harf farkı yok sayılarak (örn. "ANADOLU REKLAM" ve
            "anadolu reklam" tek satırda) toplanmıştır
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={merkezDagilimi} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#12b8e8" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-textp mb-4">Teslim Türü Dağılımı</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={teslimTuruDagilimi} dataKey="value" nameKey="name" outerRadius={90} label>
                {teslimTuruDagilimi.map((_, idx) => (
                  <Cell key={idx} fill={RENKLER[idx % RENKLER.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-textp">Marka Bazında Dağılım</h2>
          <p className="text-xs text-texts mt-1">
            Büyük/küçük harf farkı yok sayılarak toplanmıştır
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-bg text-texts text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Marka</th>
              <th className="text-left px-4 py-3">İş Sayısı</th>
              <th className="text-left px-4 py-3">Ortalama Süre</th>
            </tr>
          </thead>
          <tbody>
            {markalar.map((m) => (
              <tr key={m.marka_anahtari} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{m.goruntu_adi}</td>
                <td className="px-4 py-2">{m.is_sayisi}</td>
                <td className="px-4 py-2">{sureFormatla(m.ortalama_sure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-textp">İş Bazında Süre Dökümü</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-bg text-texts text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">İş No</th>
              <th className="text-left px-4 py-3">Marka</th>
              <th className="text-left px-4 py-3">Rezervasyon</th>
              <th className="text-left px-4 py-3">Grafik</th>
              <th className="text-left px-4 py-3">Metro</th>
              <th className="text-left px-4 py-3">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {isler.slice(0, 50).map((i) => (
              <tr key={i.job_id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">#{i.sayi}</td>
                <td className="px-4 py-2">{i.marka ?? "—"}</td>
                <td className="px-4 py-2">{sureFormatla(i.rezervasyon_suresi)}</td>
                <td className="px-4 py-2">{sureFormatla(i.grafik_suresi)}</td>
                <td className="px-4 py-2">{sureFormatla(i.metro_suresi)}</td>
                <td className="px-4 py-2 font-semibold">{sureFormatla(i.toplam_sure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function intervalToHoursLocal(interval: string): number {
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
  return totalSeconds / 3600;
}

function ortalamaInterval(degerler: (string | null)[]): string | null {
  const saniyeler = degerler
    .filter((d): d is string => !!d)
    .map((d) => {
      let total = 0;
      const dayMatch = d.match(/(-?\d+)\s+days?/);
      const timeMatch = d.match(/(\d{1,3}):(\d{2}):(\d{2})/);
      if (dayMatch) total += parseInt(dayMatch[1], 10) * 86400;
      if (timeMatch)
        total +=
          parseInt(timeMatch[1], 10) * 3600 +
          parseInt(timeMatch[2], 10) * 60 +
          parseInt(timeMatch[3], 10);
      return total;
    });
  if (!saniyeler.length) return null;
  const ortalama = saniyeler.reduce((a, b) => a + b, 0) / saniyeler.length;
  const gun = Math.floor(ortalama / 86400);
  const kalanSaniye = ortalama % 86400;
  const saat = Math.floor(kalanSaniye / 3600);
  const dakika = Math.floor((kalanSaniye % 3600) / 60);
  return `${gun} days ${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:00`;
}
