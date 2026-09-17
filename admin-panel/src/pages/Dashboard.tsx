import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { supabase } from "../lib/supabase";
import Kpi from "../components/Kpi";
import { AsamaOrtalamaSuresi, AylikOzet, sureFormatla } from "../lib/types";
import { createReportPdf, addSectionTitle, addKpiRow, addTable, ensureSpace } from "../lib/export";

interface DurumSayisi {
  durum: string;
  adet: number;
}

export default function Dashboard() {
  const [durumDagilimi, setDurumDagilimi] = useState<DurumSayisi[]>([]);
  const [gecikenSayisi, setGecikenSayisi] = useState(0);
  const [acilSayisi, setAcilSayisi] = useState(0);
  const [asamaSureleri, setAsamaSureleri] = useState<AsamaOrtalamaSuresi[]>([]);
  const [aylikOzet, setAylikOzet] = useState<AylikOzet[]>([]);
  const [buAyTamamlanan, setBuAyTamamlanan] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: jobs } = await supabase
        .from("jobs")
        .select("durum, oncelik")
        .eq("arsiv", false);

      const dagilim: Record<string, number> = {};
      let acil = 0;
      (jobs ?? []).forEach((j: any) => {
        dagilim[j.durum] = (dagilim[j.durum] ?? 0) + 1;
        if (j.oncelik === "acil" && j.durum !== "tamamlandi" && j.durum !== "iptal") acil++;
      });
      setDurumDagilimi(
        Object.entries(dagilim).map(([durum, adet]) => ({ durum, adet }))
      );
      setAcilSayisi(acil);

      const { count: geciken } = await supabase
        .from("gecikmis_isler")
        .select("*", { count: "exact", head: true });
      setGecikenSayisi(geciken ?? 0);

      const { data: asamalar } = await supabase
        .from("asama_ortalama_sureleri")
        .select("*");
      setAsamaSureleri((asamalar as AsamaOrtalamaSuresi[]) ?? []);

      const { data: aylik } = await supabase
        .from("aylik_ozet")
        .select("*")
        .order("ay", { ascending: true })
        .limit(12);
      setAylikOzet((aylik as AylikOzet[]) ?? []);

      const buAyBaslangic = new Date();
      buAyBaslangic.setDate(1);
      buAyBaslangic.setHours(0, 0, 0, 0);
      const { count: tamamlanan } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("durum", "tamamlandi")
        .gte("updated_at", buAyBaslangic.toISOString());
      setBuAyTamamlanan(tamamlanan ?? 0);

      setLoading(false);
    })();
  }, []);

  const asamaGrafikVeri = asamaSureleri.map((a) => ({
    asama:
      a.asama === "rezervasyon_bekliyor"
        ? "Rezervasyon"
        : a.asama === "grafik_bekliyor"
        ? "Grafik Tasarım"
        : "Metro",
    saat: a.ortalama_sure ? intervalToHours(a.ortalama_sure) : 0,
  }));

  const trendVeri = aylikOzet.map((a) => ({
    ay: new Date(a.ay).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
    Açılan: a.acilan_is_sayisi,
    Tamamlanan: a.tamamlanan_is_sayisi,
  }));

  const aktifIsSayisi = durumDagilimi
    .filter((d) => d.durum !== "tamamlandi" && d.durum !== "iptal")
    .reduce((acc, d) => acc + d.adet, 0);

  if (loading) return <div className="text-texts">Yükleniyor…</div>;

  async function pdfIndir() {
    const { doc, y } = await createReportPdf("Dashboard Raporu");
    let cursor = y;
    cursor = addKpiRow(doc, cursor, [
      { label: "Aktif İş", value: String(aktifIsSayisi) },
      { label: "Geciken İş", value: String(gecikenSayisi) },
      { label: "Acil İş", value: String(acilSayisi) },
      { label: "Bu Ay Tamamlanan", value: String(buAyTamamlanan) },
    ]);
    cursor += 10;

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "Aşama Bazında Ortalama Süre", cursor);
    cursor = addTable(
      doc,
      cursor,
      ["Aşama", "Tamamlanan İş", "Ortalama", "Medyan", "Min", "Maks"],
      asamaSureleri.map((a) => [
        a.asama === "rezervasyon_bekliyor"
          ? "Rezervasyon"
          : a.asama === "grafik_bekliyor"
          ? "Grafik Tasarım"
          : "Metro",
        a.tamamlanan_sayisi,
        sureFormatla(a.ortalama_sure),
        sureFormatla(a.medyan_sure),
        sureFormatla(a.min_sure),
        sureFormatla(a.max_sure),
      ])
    );

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "Durum Dağılımı (Aktif İşler)", cursor);
    cursor = addTable(
      doc,
      cursor,
      ["Durum", "Adet"],
      durumDagilimi.map((d) => [d.durum, d.adet])
    );

    cursor = ensureSpace(doc, cursor, 100);
    cursor = addSectionTitle(doc, "Aylık İş Hacmi", cursor);
    addTable(
      doc,
      cursor,
      ["Ay", "Açılan", "Tamamlanan", "İptal", "Acil", "Ort. Toplam Süre"],
      aylikOzet.map((a) => [
        new Date(a.ay).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        a.acilan_is_sayisi,
        a.tamamlanan_is_sayisi,
        a.iptal_is_sayisi,
        a.acil_is_sayisi,
        sureFormatla(a.ortalama_toplam_sure),
      ])
    );

    doc.save(`dashboard-raporu-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textp">Dashboard</h1>
          <p className="text-texts text-sm mt-1">
            Tüm baskı süreçlerinin genel durumu
          </p>
        </div>
        <button
          onClick={pdfIndir}
          className="text-sm bg-white border border-border rounded-lg px-4 py-2 hover:bg-bg"
        >
          ⬇ PDF Rapor
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Aktif İş" value={aktifIsSayisi} accent="navy" />
        <Kpi
          label="Geciken İş"
          value={gecikenSayisi}
          accent={gecikenSayisi > 0 ? "danger" : "success"}
          sub="SLA süresini aşan işler"
        />
        <Kpi label="Acil İş" value={acilSayisi} accent="danger" />
        <Kpi
          label="Bu Ay Tamamlanan"
          value={buAyTamamlanan}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold text-textp mb-1">
            Aşama Bazında Ortalama Süre
          </h2>
          <p className="text-xs text-texts mb-4">
            Bir işin her aşamada ortalama ne kadar beklediği (saat)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={asamaGrafikVeri}>
              <XAxis dataKey="asama" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="s" />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} saat`, "Ortalama"]} />
              <Bar dataKey="saat" fill="#1a1464" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center text-xs">
            {asamaSureleri.map((a) => (
              <div key={a.asama}>
                <div className="text-texts">
                  {a.asama === "rezervasyon_bekliyor"
                    ? "Rezervasyon"
                    : a.asama === "grafik_bekliyor"
                    ? "Grafik"
                    : "Metro"}
                </div>
                <div className="font-semibold text-textp">
                  {sureFormatla(a.ortalama_sure)}
                </div>
                <div className="text-texts">{a.tamamlanan_sayisi} iş</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold text-textp mb-1">Aylık İş Hacmi</h2>
          <p className="text-xs text-texts mb-4">Açılan vs. tamamlanan iş sayısı</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendVeri}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e8f0" />
              <XAxis dataKey="ay" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Açılan" stroke="#12b8e8" strokeWidth={2} />
              <Line type="monotone" dataKey="Tamamlanan" stroke="#27ae60" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="font-semibold text-textp mb-4">Durum Dağılımı (Aktif İşler)</h2>
        <div className="flex gap-6 flex-wrap">
          {durumDagilimi.map((d) => (
            <div key={d.durum} className="text-center">
              <div className="text-2xl font-bold text-navy">{d.adet}</div>
              <div className="text-xs text-texts">{d.durum}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function intervalToHours(interval: string): number {
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
