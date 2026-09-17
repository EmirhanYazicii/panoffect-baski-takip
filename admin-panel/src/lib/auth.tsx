import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";

interface AdminUser {
  id: string;
  isim: string;
  e_posta: string;
  role: "employee" | "admin";
}

interface AuthCtx {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    const { data: sess } = await supabase.auth.getSession();
    const authUser = sess.session?.user;
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, isim, e_posta, role")
      .eq("id", authUser.id)
      .single();
    if (profileErr || !profile) {
      setError("Kullanıcı profili bulunamadı.");
      setUser(null);
    } else if (profile.role !== "admin") {
      setError("Bu panele sadece admin yetkisine sahip kullanıcılar girebilir.");
      await supabase.auth.signOut();
      setUser(null);
    } else {
      setUser(profile as AdminUser);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      setError("E-posta veya şifre hatalı.");
      throw signInErr;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}
