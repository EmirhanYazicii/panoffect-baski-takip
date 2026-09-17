import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DurumBadge from "../components/DurumBadge";
import { JobRow, IsDurumu } from "../lib/types";
import { downloadExcel } from "../lib/export";
import JobDetail from "./JobDetail";

const DURUM_SECENEKLERI: (IsDurumu | "hepsi")[] = [
  "hepsi",
  "rezervasyon_bekliyor",
  "grafik_bekliyor",
  "metro_bekliyor",
  "tamamlandi",
  "revize_gerekiyor",
  "iptal",
];

export default function Jobs() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [durumFiltre, setDurumFiltre] = useState<string>("hepsi");
  const [oncelikFiltre, setOncelikFiltre] = useState<string>("hepsi");
  const [arama, setArama] = useState("");
  const [seciliJobId, setSeciliJobId] = useState<string | null>(null);

  async function fetchJobs() {
    setLoading(true);
    let query = supabase
      .from("jobs")
      .select(
        `id, sayi, durum, oncelik, teslim_turu, baski_merkezi, created_at, updated_at,
         rezervasyon_detay ( marka, urun_olcu, toplam_adet )`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (durumFiltre !== "hepsi") query = query.eq("durum", durumFiltre);
    if (oncelikFiltre !== "hepsi") query = query.eq("oncelik", oncelikFiltre);

    const { data } = await query;
    setJobs((data as any as JobRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durumFiltre, oncelikFiltre]);

  const filtreliJobs = jobs.filter((j) => {
    if (!arama) return true;
    const q = arama.toLowerCase();
    return (
      String(j.sayi).includes(q) ||
      j.rezervasyon_detay?.marka?.toLowerCase().includes(q) ||
      j.baski_merkezi?.toLowerCase().includes(q)
    );
  });

  function exportExcel() {
    const rows = filtreliJobs.map((j) => ({
      "İş No": j.sayi,
      Durum: j.durum,
      Öncelik: j.oncelik === "acil" ? "Acil" : "Normal",
      Marka: j.rezervasyon_detay?.marka ?? "",
      "Ürün / Ölçü": j.rezervasyon_detay?.urun_olcu ?? "",
      "Toplam Adet": j.rezervasyon_detay?.toplam_adet ?? "",
      "Baskı Merkezi": j.baski_merkezi ?? "",
      "Teslim Türü":
        j.teslim_turu === "marka_teslim"
          ? "Marka Tarafından Teslim"
          : "Panoffect Tarafından Gönderilen",
      Oluşturulma: new Date(j.created_at).toLocaleString("tr-TR"),
      "Son Güncelleme": new Date(j.updated_at).toLocaleString("tr-TR"),
    }));
    downloadExcel(`isler-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: "İşler", rows },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textp">Tüm İşler</h1>
          <p className="text-texts text-sm mt-1">{filtreliJobs.length} iş listeleniyor</p>
        </div>
        <button
          onClick={exportExcel}
          className="text-sm bg-white border border-border rounded-lg px-4 py-2 hover:bg-bg"
        >
          ⬇ Excel'e Aktar
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="İş no, marka veya baskı merkezi ara…"
          className="flex-1 min-w-[220px] rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-cyan"
        />
        <select
          value={durumFiltre}
          onChange={(e) => setDurumFiltre(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          {DURUM_SECENEKLERI.map((d) => (
            <option key={d} value={d}>
              {d === "hepsi" ? "Tüm Durumlar" : d}
            </option>
          ))}
        </select>
        <select
          value={oncelikFiltre}
          onChange={(e) => setOncelikFiltre(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="hepsi">Tüm Öncelikler</option>
          <option value="acil">Sadece Acil</option>
          <option value="normal">Sadece Normal</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg text-texts text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">İş No</th>
              <th className="text-left px-4 py-3">Marka</th>
              <th className="text-left px-4 py-3">Baskı Merkezi</th>
              <th className="text-left px-4 py-3">Durum</th>
              <th className="text-left px-4 py-3">Öncelik</th>
              <th className="text-left px-4 py-3">Oluşturulma</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-texts">
                  Yükleniyor…
                </td>
              </tr>
            ) : (
              filtreliJobs.map((j) => (
                <tr
                  key={j.id}
                  onClick={() => setSeciliJobId(j.id)}
                  className="border-t border-border hover:bg-bg cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">#{j.sayi}</td>
                  <td className="px-4 py-3">{j.rezervasyon_detay?.marka ?? "—"}</td>
                  <td className="px-4 py-3">{j.baski_merkezi ?? "—"}</td>
                  <td className="px-4 py-3">
                    <DurumBadge durum={j.durum} />
                  </td>
                  <td className="px-4 py-3">
                    {j.oncelik === "acil" ? (
                      <span className="text-red-600 font-semibold">ACİL</span>
                    ) : (
                      "Normal"
                    )}
                  </td>
                  <td className="px-4 py-3 text-texts">
                    {new Date(j.created_at).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {seciliJobId && (
        <JobDetail jobId={seciliJobId} onClose={() => setSeciliJobId(null)} />
      )}
    </div>
  );
}
