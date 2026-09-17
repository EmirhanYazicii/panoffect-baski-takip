import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { UserRow } from "@/types/database";

interface AuthState {
  yukleniyor: boolean;
  kullanici: UserRow | null;
  girisYap: (ePosta: string, sifre: string) => Promise<{ hata: string | null }>;
  cikisYap: () => Promise<void>;
  oturumuYukle: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  yukleniyor: true,
  kullanici: null,

  girisYap: async (ePosta, sifre) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: ePosta,
      password: sifre,
    });
    if (error) return { hata: error.message };

    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData.user) {
      const { data: profil } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionData.user.id)
        .single();
      if (profil && !profil.aktif) {
        await supabase.auth.signOut();
        return { hata: "Hesabınız pasif durumda. Yöneticinizle iletişime geçin." };
      }
      set({ kullanici: profil as UserRow });
    }
    return { hata: null };
  },

  cikisYap: async () => {
    await supabase.auth.signOut();
    set({ kullanici: null });
  },

  oturumuYukle: async () => {
    set({ yukleniyor: true });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { data: profil } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      set({ kullanici: (profil as UserRow) ?? null });
    }
    set({ yukleniyor: false });
  },
}));
