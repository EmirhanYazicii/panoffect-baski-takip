import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { colors, radius, spacing } from "@/constants/theme";
import type { EkipTipi, IsDurumu, GrafikDetayRow } from "@/types/database";

interface Props {
  jobId: string;
  durum: IsDurumu;
  veri: GrafikDetayRow | null;
  kullaniciEkip?: EkipTipi;
  baskiMerkezi?: string | null;
  teslimTuru?: "marka_teslim" | "kendi_baski";
  acil?: boolean;
  onKaydedildi: () => void;
}

export function GrafikForm({ jobId, durum, veri, kullaniciEkip, baskiMerkezi, teslimTuru, acil, onKaydedildi }: Props) {
  // "Marka Tarafından Teslim Edilen" işlerde Grafik Tasarım aşaması hiç
  // yaşanmaz — bu kart tamamen gizlenir.
  if (teslimTuru === "marka_teslim" && !veri) return null;
  const kullanici = useAuthStore((s) => s.kullanici);
  const yetkiliMi = kullanici?.role === "admin" || kullaniciEkip === "grafik_tasarim";
  const duzenlenebilir = yetkiliMi && durum === "grafik_bekliyor" && !veri;
  const [acik, setAcik] = useState(duzenlenebilir);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const [teslimTarih, setTeslimTarih] = useState(veri?.teslim_gereken_tarih ?? "");
  const [teslimSaat, setTeslimSaat] = useState(veri?.teslim_gereken_saat ?? "");

  const kaydet = async () => {
    if (!teslimTarih) {
      Alert.alert("Eksik bilgi", "Teslim Edilmesi Gereken Tarih zorunludur.");
      return;
    }
    setGonderiliyor(true);
    const { error: upsertError } = await supabase.from("grafik_detay").upsert({
      job_id: jobId,
      // Baskıyı yapan şirket artık iş başlatılırken girilir (jobs.baski_merkezi);
      // Grafik ekibi bunu tekrar girmez, olduğu gibi kopyalanır.
      baskiyi_yapan_sirket: baskiMerkezi ?? null,
      siparis_tarihi: new Date().toISOString().slice(0, 10),
      siparis_saati: new Date().toTimeString().slice(0, 8),
      teslim_gereken_tarih: teslimTarih,
      teslim_gereken_saat: teslimSaat || null,
      dolduran_kullanici_id: kullanici?.id,
      doldurulma_tarihi: new Date().toISOString(),
    });

    if (upsertError) {
      Alert.alert("Hata", upsertError.message);
      setGonderiliyor(false);
      return;
    }
    const { error: ilerletError } = await supabase.rpc("is_asama_ilerlet", { p_job_id: jobId });
    setGonderiliyor(false);
    if (ilerletError) {
      Alert.alert("Hata", ilerletError.message);
      return;
    }
    setAcik(false);
    onKaydedildi();
  };

  const gorunurMu = durum !== "baslatildi" && durum !== "rezervasyon_bekliyor";
  if (!gorunurMu && !veri) return null;

  return (
    <View style={styles.kart}>
      <TouchableOpacity style={styles.baslikRow} onPress={() => setAcik(!acik)}>
        <View style={styles.baslikSolGrup}>
          <Text style={styles.kartBaslik}>2. Grafik Tasarım</Text>
          {acil && duzenlenebilir && (
            <View style={styles.acilRozet}>
              <Text style={styles.acilRozetMetni}>ACİL</Text>
            </View>
          )}
        </View>
        <Text style={styles.durumIkon}>{veri ? "✓ Dolduruldu" : "Bekliyor"}</Text>
      </TouchableOpacity>

      {acik && duzenlenebilir && (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.bilgiSatiri}>
            <Text style={styles.bilgiEtiket}>Baskıyı Yapan Şirket</Text>
            <Text style={styles.bilgiDeger}>{baskiMerkezi || "-"}</Text>
          </View>
          <Alan
            etiket="Teslim Edilmesi Gereken Tarih * (YYYY-AA-GG)"
            deger={teslimTarih}
            onChangeText={setTeslimTarih}
            placeholder="2026-08-30"
          />
          <Alan
            etiket="Teslim Edilmesi Gereken Saat (SS:DD)"
            deger={teslimSaat}
            onChangeText={setTeslimSaat}
            placeholder="14:00"
          />
          <TouchableOpacity style={styles.kaydetButon} onPress={kaydet} disabled={gonderiliyor}>
            {gonderiliyor ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kaydetMetni}>Kaydet ve Metro'ya Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {acik && veri && (
        <View style={{ gap: 6 }}>
          <SatirGoster etiket="Baskıyı Yapan Şirket" deger={veri.baskiyi_yapan_sirket} />
          <SatirGoster etiket="Teslim Gereken" deger={`${veri.teslim_gereken_tarih ?? "-"} ${veri.teslim_gereken_saat ?? ""}`} />
        </View>
      )}
    </View>
  );
}

function Alan(props: { etiket: string; deger: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View>
      <Text style={styles.alanEtiket}>{props.etiket}</Text>
      <TextInput
        style={styles.input}
        value={props.deger}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

function SatirGoster({ etiket, deger }: { etiket: string; deger?: string | null }) {
  return (
    <View style={styles.gosterSatiri}>
      <Text style={styles.gosterEtiket}>{etiket}</Text>
      <Text style={styles.gosterDeger}>{deger || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  baslikRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  baslikSolGrup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  acilRozet: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  acilRozetMetni: { color: colors.white, fontSize: 10, fontWeight: "700" },
  kartBaslik: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  durumIkon: { fontSize: 12, color: colors.textSecondary },
  alanEtiket: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  bilgiSatiri: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  bilgiEtiket: { fontSize: 12, color: colors.textSecondary },
  bilgiDeger: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  kaydetButon: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center", marginTop: spacing.xs },
  kaydetMetni: { color: colors.white, fontWeight: "600", fontSize: 14 },
  gosterSatiri: { flexDirection: "row", justifyContent: "space-between" },
  gosterEtiket: { fontSize: 12, color: colors.textSecondary },
  gosterDeger: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
});
