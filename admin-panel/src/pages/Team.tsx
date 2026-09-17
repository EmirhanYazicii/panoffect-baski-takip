import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { EkipPerformans, sureFormatla } from "../lib/types";
import { downloadExcel } from "../lib/export";

const ASAMA_ETIKET: Record<string, string> = {
  rezervasyon: "Rezervasyon",
  grafik_tasarim: "Grafik Tasarım",
  metro: "Metro",
};

export default function Team() {
  const [veri, setVeri] = useState<EkipPerformans[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("ekip_performans")
        .select("*")
        .order("doldurulan_sayisi", { ascending: false });
      setVeri((data as EkipPerformans[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-texts">Yükleniyor…</div>;

  function exportExcel() {
    const rows = veri.map((v) => ({
      Kişi: v.isim,
      Ekip: v.ekip,
      Aşama: ASAMA_ETIKET[v.asama] ?? v.asama,
      "Doldurulan İş": v.doldurulan_sayisi,
      "Ortalama Süre": sureFormatla(v.ortalama_sure),
    }));
    downloadExcel(`ekip-performansi-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: "Ekip Performansı", rows },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textp">Ekip Performansı</h1>
          <p className="text-texts text-sm mt-1">
            Her ekip üyesinin doldurduğu form sayısı ve ortalama işlem süresi
          </p>
        </div>
        <button
          onClick={exportExcel}
          className="text-sm bg-white border border-border rounded-lg px-4 py-2 hover:bg-bg"
        >
          ⬇ Excel'e Aktar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg text-texts text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Kişi</th>
              <th className="text-left px-4 py-3">Ekip</th>
              <th className="text-left px-4 py-3">Aşama</th>
              <th className="text-left px-4 py-3">Doldurulan İş</th>
              <th className="text-left px-4 py-3">Ortalama Süre</th>
            </tr>
          </thead>
          <tbody>
            {veri.map((v, idx) => (
              <tr key={`${v.kullanici_id}-${v.asama}-${idx}`} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{v.isim}</td>
                <td className="px-4 py-3 text-texts">{v.ekip}</td>
                <td className="px-4 py-3">{ASAMA_ETIKET[v.asama] ?? v.asama}</td>
                <td className="px-4 py-3">{v.doldurulan_sayisi}</td>
                <td className="px-4 py-3">{sureFormatla(v.ortalama_sure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
