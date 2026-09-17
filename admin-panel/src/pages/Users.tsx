import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { UserRow, EKIP_SECENEKLERI } from "../lib/types";

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  const [isim, setIsim] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ekip, setEkip] = useState("rezervasyon");

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id, isim, e_posta, ekip, role, aktif, created_at")
      .order("created_at", { ascending: false });
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    setGonderiliyor(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: { email, password, isim, ekip },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error || (data as any)?.error) {
        setHata((data as any)?.error ?? error?.message ?? "Bilinmeyen hata");
        return;
      }
      setBasari(`${isim} eklendi.`);
      setIsim("");
      setEmail("");
      setPassword("");
      setFormAcik(false);
      fetchUsers();
    } catch (err: any) {
      setHata(err?.message ?? "Bir şeyler ters gitti");
    } finally {
      setGonderiliyor(false);
    }
  }

  async function toggleAktif(u: UserRow) {
    const { error } = await supabase
      .from("users")
      .update({ aktif: !u.aktif })
      .eq("id", u.id);
    if (!error) fetchUsers();
  }

  const ekipLabel = (v: string) =>
    EKIP_SECENEKLERI.find((e) => e.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textp">Kullanıcılar</h1>
          <p className="text-texts text-sm mt-1">Ekip üyelerini yönet</p>
        </div>
        <button
          onClick={() => setFormAcik((v) => !v)}
          className="text-sm bg-navy text-white rounded-lg px-4 py-2 hover:opacity-90"
        >
          {formAcik ? "İptal" : "+ Yeni Kullanıcı"}
        </button>
      </div>

      {formAcik && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border p-6 space-y-4 max-w-md"
        >
          {hata && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {hata}
            </div>
          )}
          <div>
            <label className="block text-sm text-texts mb-1">Ad Soyad</label>
            <input
              required
              value={isim}
              onChange={(e) => setIsim(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-texts mb-1">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-texts mb-1">
              Geçici Şifre (en az 6 karakter)
            </label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-texts mb-1">Ekip</label>
            <select
              value={ekip}
              onChange={(e) => setEkip(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {EKIP_SECENEKLERI.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={gonderiliyor}
            className="w-full bg-navy text-white rounded-lg py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {gonderiliyor ? "Ekleniyor…" : "Kullanıcıyı Ekle"}
          </button>
        </form>
      )}

      {basari && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {basari}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg text-texts text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Ad Soyad</th>
              <th className="text-left px-4 py-3">E-posta</th>
              <th className="text-left px-4 py-3">Ekip</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Durum</th>
              <th className="text-left px-4 py-3"></th>
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
              users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{u.isim}</td>
                  <td className="px-4 py-3 text-texts">{u.e_posta}</td>
                  <td className="px-4 py-3">{ekipLabel(u.ekip)}</td>
                  <td className="px-4 py-3">{u.role === "admin" ? "Admin" : "Çalışan"}</td>
                  <td className="px-4 py-3">
                    {u.aktif ? (
                      <span className="text-green-600">Aktif</span>
                    ) : (
                      <span className="text-texts">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleAktif(u)}
                      className="text-xs text-navy hover:underline"
                    >
                      {u.aktif ? "Pasif Et" : "Aktif Et"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-texts">
        Yeni kullanıcı eklemek için Supabase projende{" "}
        <code className="bg-bg px-1 rounded">create-team-member</code> Edge
        Function&apos;ının yayınlanmış (deploy edilmiş) olması gerekir — bkz.
        README.
      </p>
    </div>
  );
}
