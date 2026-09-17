import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DurumBadge from "../components/DurumBadge";
import { sureFormatla, durumEtiketleri, IsDurumu } from "../lib/types";

interface Gecis {
  id: string;
  asama: IsDurumu;
  eski_durum: IsDurumu | null;
  giris_zamani: string;
  cikis_zamani: string | null;
  gecen_sure: string | null;
}

export default function JobDetail({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const [job, setJob] = useState<any>(null);
  const [gecisler, setGecisler] = useState<Gecis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: jobData } = await supabase
        .from("jobs")
        .select(
          `*, rezervasyon_detay(*), grafik_detay(*), metro_detay(*)`
        )
        .eq("id", jobId)
        .single();
      setJob(jobData);

      const { data: gecisData } = await supabase
        .from("job_asama_gecisleri")
        .select("id, asama, eski_durum, giris_zamani, cikis_zamani, gecen_sure")
        .eq("job_id", jobId)
        .order("giris_zamani", { ascending: true });
      setGecisler((gecisData as Gecis[]) ?? []);
      setLoading(false);
    })();
  }, [jobId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-textp">
              İş #{job?.sayi ?? "…"}
            </h2>
            {job && <DurumBadge durum={job.durum} />}
          </div>
          <button onClick={onClose} className="text-texts hover:text-textp text-xl">
            ✕
          </button>
        </div>

        {loading || !job ? (
          <div className="p-6 text-texts">Yükleniyor…</div>
        ) : (
          <div className="p-6 space-y-6">
            <section className="grid grid-cols-2 gap-4 text-sm">
              <Bilgi etiket="Marka" deger={job.rezervasyon_detay?.marka} />
              <Bilgi etiket="Ürün / Ölçü" deger={job.rezervasyon_detay?.urun_olcu} />
              <Bilgi etiket="Toplam Adet" deger={job.rezervasyon_detay?.toplam_adet} />
              <Bilgi
                etiket="Teslim Türü"
                deger={job.teslim_turu === "marka_teslim" ? "Marka Tarafından Teslim" : "Panoffect Tarafından Gönderilen"}
              />
              <Bilgi etiket="Baskı Merkezi" deger={job.baski_merkezi} />
              <Bilgi etiket="Öncelik" deger={job.oncelik === "acil" ? "🔴 Acil" : "Normal"} />
            </section>

            {job.metro_detay?.length > 0 && (
              <section>
                <h3 className="font-semibold text-textp mb-2 text-sm">Metro Teslimleri</h3>
                <div className="space-y-2">
                  {job.metro_detay.map((m: any) => (
                    <div key={m.bolge} className="bg-bg rounded-lg px-3 py-2 text-sm flex justify-between">
                      <span>{m.bolge === "anadolu" ? "Anadolu" : "Avrupa"} — {m.teslim_yeri ?? "—"}</span>
                      <span className="text-texts">{m.teslim_alinan_adet ?? "—"} adet</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="font-semibold text-textp mb-3 text-sm">
                Süreç Zaman Çizelgesi
              </h3>
              <div className="space-y-3">
                {gecisler.map((g) => (
                  <div key={g.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan mt-1.5 shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-textp">
                          {durumEtiketleri[g.asama]}
                        </span>
                        <span className="text-texts text-xs">
                          {new Date(g.giris_zamani).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      {g.cikis_zamani ? (
                        <div className="text-xs text-texts">
                          Bu aşamada kaldı: <b>{sureFormatla(g.gecen_sure)}</b>
                        </div>
                      ) : (
                        <div className="text-xs text-cyan font-medium">Şu an bu aşamada</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {job.revize_notu && (
              <section className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                <b>Revize Notu:</b> {job.revize_notu}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: any }) {
  return (
    <div>
      <div className="text-xs text-texts">{etiket}</div>
      <div className="font-medium text-textp">{deger ?? "—"}</div>
    </div>
  );
}
