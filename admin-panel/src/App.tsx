import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Analytics from "./pages/Analytics";
import Team from "./pages/Team";
import Users from "./pages/Users";

function Gated({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-texts">Yükleniyor…</div>;
  if (!user) return <Navigate to="/giris" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/giris" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Gated>
            <Layout />
          </Gated>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/isler" element={<Jobs />} />
        <Route path="/analitik" element={<Analytics />} />
        <Route path="/ekip" element={<Team />} />
        <Route path="/kullanicilar" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
