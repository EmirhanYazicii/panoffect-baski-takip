// Panoffect Baskı Süreç Takip — Admin Panelinden yeni ekip üyesi ekleme.
//
// Neden bir Edge Function? Tarayıcıda çalışan admin panel yalnızca
// "anon key" kullanır; yeni bir giriş hesabı (auth.users) oluşturmak için
// gereken "service_role" anahtarı tarayıcı koduna ASLA konulmaz (herkes
// görebilir, tüm veritabanına şifresiz erişim sağlar). Bu fonksiyon
// Supabase'in sunucusunda çalışır, service_role anahtarını yalnızca burada
// kullanır ve çağıranın gerçekten "admin" olduğunu kendisi doğrular.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY değerleri
// Supabase tarafından Edge Function'lara otomatik sağlanır — elle
// tanımlamanıza gerek yoktur.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const GECERLI_EKIPLER = [
  "baslatma",
  "rezervasyon",
  "grafik_tasarim",
  "metro_anadolu",
  "metro_avrupa",
];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Sadece POST" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Yetkisiz — oturum bulunamadı" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) İsteği yapan kişinin kimliğini KENDİ token'ıyla doğrula.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userRes.user) {
      return json({ error: "Geçersiz oturum" }, 401);
    }

    // 2) service_role ile bu kişinin gerçekten admin olduğunu kontrol et.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerProfile, error: profileErr } = await admin
      .from("users")
      .select("role")
      .eq("id", userRes.user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Bu işlem için admin yetkisi gerekiyor" }, 403);
    }

    // 3) Girdileri doğrula.
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Geçersiz istek gövdesi" }, 400);

    const { email, password, isim, ekip } = body as {
      email?: string;
      password?: string;
      isim?: string;
      ekip?: string;
    };

    if (!email || !password || !isim || !ekip) {
      return json(
        { error: "Eksik alan: email, password, isim, ekip gereklidir" },
        400
      );
    }
    if (password.length < 6) {
      return json({ error: "Şifre en az 6 karakter olmalı" }, 400);
    }
    if (!GECERLI_EKIPLER.includes(ekip)) {
      return json(
        { error: `Geçersiz ekip. Geçerli değerler: ${GECERLI_EKIPLER.join(", ")}` },
        400
      );
    }

    // 4) Auth kullanıcısını oluştur (e-posta doğrulaması istenmeden aktif).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return json(
        { error: createErr?.message ?? "Kullanıcı oluşturulamadı" },
        400
      );
    }

    // 5) public.users profil satırını ekle.
    const { error: insertErr } = await admin.from("users").insert({
      id: created.user.id,
      isim,
      e_posta: email,
      ekip,
      role: "employee",
      aktif: true,
    });

    if (insertErr) {
      // Profil eklenemediyse, yarım kalan auth kullanıcısını geri al.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertErr.message }, 400);
    }

    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
