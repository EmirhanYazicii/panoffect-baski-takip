import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import logo from "../assets/panoffect-logo.png";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
    isActive ? "bg-navy text-white" : "text-texts hover:bg-bg"
  }`;

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-60 bg-white border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <img src={logo} alt="Panoffect" className="h-7 mb-1" />
          <div className="text-xs text-texts">Baskı Süreç Yönetim Paneli</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={linkClass}>
            📊 Dashboard
          </NavLink>
          <NavLink to="/isler" className={linkClass}>
            📋 Tüm İşler
          </NavLink>
          <NavLink to="/analitik" className={linkClass}>
            📈 Analitik
          </NavLink>
          <NavLink to="/ekip" className={linkClass}>
            👥 Ekip Performansı
          </NavLink>
          <NavLink to="/kullanicilar" className={linkClass}>
            🧑‍💼 Kullanıcılar
          </NavLink>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-sm font-medium text-textp">{user?.isim}</div>
          <div className="text-xs text-texts mb-2">{user?.e_posta}</div>
          <button
            onClick={signOut}
            className="text-xs text-red-600 hover:underline"
          >
            Çıkış yap
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
