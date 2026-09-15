import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { colors, radius, spacing } from "@/constants/theme";
import type { EkipTipi, IsDurumu, RezervasyonDetayRow } from "@/types/database";

interface Props {
  jobId: string;
  durum: IsDurumu;
  veri: RezervasyonDetayRow | null;
  kullaniciEkip?: EkipTipi;
  teslimTuru?: "marka_teslim" | "kendi_baski";
  acil?: boolean;
  onKaydedildi: () => void;
}

export function RezervasyonForm({ jobId, durum, veri, kullaniciEkip, teslimTuru, acil, onKaydedildi }: Props) {
  const kullanici = useAuthStore((s) => s.kullanici);
  const yetkiliMi = kullanici?.role === "admin" || kullaniciEkip === "rezervasyon";
  const duzenlenebilir =
    yetkiliMi && (durum === "rezervasyon_bekliyor" || durum === "revize_gerekiyor");
  const [acik, setAcik] = useState(duzenlenebilir);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const [marka, setMarka] = useState(veri?.marka ?? "");
  const [urunOlcu, setUrunOlcu] = useState(veri?.urun_olcu ?? "");
  const [dataLinki, setDataLinki] = useState(veri?.data_linki ?? "");
  const [onayliTon, setOnayliTon] = useState(veri?.onayli_ton ?? "");
  const [toplamAdet, setToplamAdet] = useState(veri?.toplam_adet?.toString() ?? "");
  const [anadoluAdet, setAnadoluAdet] = useState(veri?.anadolu_adet?.toString() ?? "");
  const [avrupaAdet, setAvrupaAdet] = useState(veri?.avrupa_adet?.toString() ?? "");

  const kaydet = async () => {
    if (!marka || !urunOlcu || !toplamAdet) {
      Alert.alert("Eksik bilgi", "Marka, Ürün/Ölçü ve Toplam Adet zorunludur.");
      return;
    }
    setGonderiliyor(true);
    const { error: upsertError } = await supabase.from("rezervasyon_detay").upsert({
      job_id: jobId,
      marka,
      urun_olcu: urunOlcu,
      data_linki: dataLinki || null,
      onayli_ton: onayliTon || null,
      toplam_adet: Number(toplamAdet) || null,
      anadolu_adet: Number(anadoluAdet) || null,
      avrupa_adet: Number(avrupaAdet) || null,
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
          <Text style={styles.kartBaslik}>1. Rezervasyon</Text>
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
          <Alan etiket="Marka *" deger={marka} onChangeText={setMarka} />
          <Alan etiket="Basılan Ürün/Ölçü *" deger={urunOlcu} onChangeText={setUrunOlcu} />
          <Alan etiket="Data Linki" deger={dataLinki} onChangeText={setDataLinki} />
          <Alan etiket="Onaylı Ton" deger={onayliTon} onChangeText={setOnayliTon} />
          <Alan etiket="Toplam Adet *" deger={toplamAdet} onChangeText={setToplamAdet} keyboardType="numeric" />
          <Alan etiket="Anadolu Adet" deger={anadoluAdet} onChangeText={setAnadoluAdet} keyboardType="numeric" />
          <Alan etiket="Avrupa Adet" deger={avrupaAdet} onChangeText={setAvrupaAdet} keyboardType="numeric" />

          <TouchableOpacity style={styles.kaydetButon} onPress={kaydet} disabled={gonderiliyor}>
            {gonderiliyor ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.kaydetMetni}>
                {teslimTuru === "marka_teslim" ? "Kaydet ve Metro'ya Gönder" : "Kaydet ve Grafik Tasarım'a Gönder"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {acik && veri && (
        <View style={{ gap: 6 }}>
          <SatirGoster etiket="Marka" deger={veri.marka} />
          <SatirGoster etiket="Ürün/Ölçü" deger={veri.urun_olcu} />
          <SatirGoster etiket="Toplam Adet" deger={veri.toplam_adet?.toString()} />
          <SatirGoster etiket="Anadolu / Avrupa" deger={`${veri.anadolu_adet ?? "-"} / ${veri.avrupa_adet ?? "-"}`} />
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
  kaydetButon: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center", marginTop: spacing.xs },
  kaydetMetni: { color: colors.white, fontWeight: "600", fontSize: 14 },
  gosterSatiri: { flexDirection: "row", justifyContent: "space-between" },
  gosterEtiket: { fontSize: 12, color: colors.textSecondary },
  gosterDeger: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
});
