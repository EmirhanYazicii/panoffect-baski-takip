import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { colors, radius, spacing } from "@/constants/theme";
import type { EkipTipi, IsDurumu, MetroDetayRow, BolgeTipi } from "@/types/database";

const TESLIM_YERI: Record<BolgeTipi, string> = {
  anadolu: "Ünalan Metro",
  avrupa: "İTÜ Metro",
};
const BOLGE_ETIKET: Record<BolgeTipi, string> = { anadolu: "Anadolu", avrupa: "Avrupa" };
const BOLGE_EKIP: Record<BolgeTipi, EkipTipi> = { anadolu: "metro_anadolu", avrupa: "metro_avrupa" };

interface Props {
  jobId: string;
  durum: IsDurumu;
  metroKayitlari: MetroDetayRow[];
  anadoluGerekli: boolean;
  avrupaGerekli: boolean;
  kullaniciEkip?: EkipTipi;
  acil?: boolean;
  onKaydedildi: () => void;
}

export function MetroForm({ jobId, durum, metroKayitlari, anadoluGerekli, avrupaGerekli, kullaniciEkip, acil, onKaydedildi }: Props) {
  // Bölge ayrımı hiç belirtilmemişse (eski/basit kayıt), eski davranış: tek bölge yeterli.
  const bolgeler: BolgeTipi[] = anadoluGerekli || avrupaGerekli
    ? ([anadoluGerekli ? "anadolu" : null, avrupaGerekli ? "avrupa" : null].filter(Boolean) as BolgeTipi[])
    : ["anadolu"];

  const gorunurMu = durum === "metro_bekliyor" || durum === "tamamlandi" || metroKayitlari.length > 0;
  if (!gorunurMu) return null;

  return (
    <View style={styles.disKart}>
      <View style={styles.disBaslikRow}>
        <Text style={styles.disBaslik}>3. Metro</Text>
        {acil && durum === "metro_bekliyor" && (
          <View style={styles.acilRozet}>
            <Text style={styles.acilRozetMetni}>ACİL</Text>
          </View>
        )}
      </View>
      {bolgeler.map((bolge) => (
        <BolgeKarti
          key={bolge}
          bolge={bolge}
          jobId={jobId}
          durum={durum}
          veri={metroKayitlari.find((m) => m.bolge === bolge) ?? null}
          kullaniciEkip={kullaniciEkip}
          acil={acil}
          onKaydedildi={onKaydedildi}
        />
      ))}
    </View>
  );
}

function BolgeKarti({
  bolge,
  jobId,
  durum,
  veri,
  kullaniciEkip,
  acil,
  onKaydedildi,
}: {
  bolge: BolgeTipi;
  jobId: string;
  durum: IsDurumu;
  veri: MetroDetayRow | null;
  kullaniciEkip?: EkipTipi;
  acil?: boolean;
  onKaydedildi: () => void;
}) {
  const kullanici = useAuthStore((s) => s.kullanici);
  const yetkiliMi = kullanici?.role === "admin" || kullaniciEkip === BOLGE_EKIP[bolge];
  const duzenlenebilir = yetkiliMi && durum === "metro_bekliyor" && !veri;
  const [acik, setAcik] = useState(duzenlenebilir);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const [adet, setAdet] = useState(veri?.teslim_alinan_adet?.toString() ?? "");
  const [alan, setAlan] = useState(veri?.teslim_alan ?? "");
  const [eden, setEden] = useState(veri?.teslim_eden ?? "");
  const [notMetni, setNotMetni] = useState(veri?.hata_notu ?? "");

  const kaydet = async () => {
    if (!adet) {
      Alert.alert("Eksik bilgi", "Teslim Alınan Adet zorunludur.");
      return;
    }
    setGonderiliyor(true);
    const { error: upsertError } = await supabase.from("metro_detay").upsert({
      job_id: jobId,
      bolge,
      teslim_alinan_tarih: new Date().toISOString().slice(0, 10),
      teslim_alinan_saat: new Date().toTimeString().slice(0, 8),
      teslim_alinan_adet: Number(adet) || null,
      teslim_yeri: TESLIM_YERI[bolge],
      teslim_alan: alan || null,
      teslim_eden: eden || null,
      hata_notu: notMetni || null,
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

  return (
    <View style={styles.kart}>
      <TouchableOpacity style={styles.baslikRow} onPress={() => setAcik(!acik)}>
        <View style={styles.baslikSolGrup}>
          <Text style={styles.kartBaslik}>{BOLGE_ETIKET[bolge]} — {TESLIM_YERI[bolge]}</Text>
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
          <Alan etiket="Teslim Alınan Adet *" deger={adet} onChangeText={setAdet} keyboardType="numeric" />
          <Alan etiket="Teslim Alan" deger={alan} onChangeText={setAlan} />
          <Alan etiket="Teslim Eden" deger={eden} onChangeText={setEden} />
          <Alan etiket="Eksiklik/Hata Notu" deger={notMetni} onChangeText={setNotMetni} />
          <TouchableOpacity style={styles.kaydetButon} onPress={kaydet} disabled={gonderiliyor}>
            {gonderiliyor ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kaydetMetni}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {acik && veri && (
        <View style={{ gap: 6 }}>
          <SatirGoster etiket="Teslim Alınan Adet" deger={veri.teslim_alinan_adet?.toString()} />
          <SatirGoster etiket="Teslim Yeri" deger={veri.teslim_yeri} />
          {veri.hata_notu && <SatirGoster etiket="Hata Notu" deger={veri.hata_notu} />}
        </View>
      )}
    </View>
  );
}

function Alan(props: {
  etiket: string;
  deger: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View>
      <Text style={styles.alanEtiket}>{props.etiket}</Text>
      <TextInput
        style={styles.input}
        value={props.deger}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType ?? "default"}
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
  disKart: { gap: spacing.sm },
  disBaslikRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disBaslik: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  acilRozet: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  acilRozetMetni: { color: colors.white, fontSize: 10, fontWeight: "700" },
  kart: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  baslikRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  baslikSolGrup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  kartBaslik: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
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
  kaydetButon: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center", marginTop: spacing.xs },
  kaydetMetni: { color: colors.white, fontWeight: "600", fontSize: 14 },
  gosterSatiri: { flexDirection: "row", justifyContent: "space-between" },
  gosterEtiket: { fontSize: 12, color: colors.textSecondary },
  gosterDeger: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
});
