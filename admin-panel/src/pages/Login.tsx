import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";
import logo from "../assets/panoffect-logo.png";

export default function Login() {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // hata zaten auth context'te gösteriliyor
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-border p-8"
      >
        <div className="mb-6 text-center">
          <img src={logo} alt="Panoffect" className="h-10 mx-auto mb-3" />
          <div className="text-texts text-sm mt-1">Baskı Süreç Yönetim Paneli</div>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <label className="block text-sm text-texts mb-1">E-posta</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-border px-3 py-2 outline-none focus:border-cyan"
          placeholder="ornek@panoffect.com"
        />
        <label className="block text-sm text-texts mb-1">Şifre</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 rounded-lg border border-border px-3 py-2 outline-none focus:border-cyan"
          placeholder="••••••••"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-navy text-white rounded-lg py-2.5 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
        <p className="text-xs text-texts text-center mt-4">
          Bu panele yalnızca admin yetkili kullanıcılar erişebilir.
        </p>
      </form>
    </div>
  );
}
