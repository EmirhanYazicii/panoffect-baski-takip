import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/constants/theme";
import type { TeslimTuru } from "@/types/database";

const SECENEKLER: { deger: TeslimTuru; baslik: string; aciklama: string }[] = [
  {
    deger: "marka_teslim",
    baslik: "Marka Tarafından Teslim Edilen",
    aciklama: "Baskı marka tarafından zaten yapılıyor. Grafik Tasarım aşaması atlanır, iş doğrudan Metro'ya gider.",
  },
  {
    deger: "kendi_baski",
    baslik: "Panoffect Tarafından Gönderilen",
    aciklama: "Normal akış: Rezervasyon → Grafik Tasarım → Metro.",
  },
];

export default function YeniIsBaslatScreen() {
  const router = useRouter();
  const [teslimTuru, setTeslimTuru] = useState<TeslimTuru>("kendi_baski");
  const [baskiMerkezi, setBaskiMerkezi] = useState("");
  const [acil, setAcil] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const baslat = async () => {
    if (!baskiMerkezi.trim()) {
      Alert.alert("Eksik bilgi", "Baskı merkezi / firma zorunludur.");
      return;
    }
    setGonderiliyor(true);
    const { data, error } = await supabase.rpc("yeni_is_baslat", {
      p_teslim_turu: teslimTuru,
      p_baski_merkezi: baskiMerkezi.trim(),
      p_oncelik: acil ? "acil" : "normal",
    });
    setGonderiliyor(false);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }
    if (data) {
      router.replace(`/job/${(data as any).id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.ikonWrap}>
        <Ionicons name="add-circle" size={64} color={colors.navy} />
      </View>
      <Text style={styles.baslik}>Yeni İş Başlat</Text>
      <Text style={styles.aciklama}>
        İş numarası otomatik atanır ve başlangıç zamanı (created_at) veritabanına kaydedilir — bu,
        Rezervasyon ekibinin süresinin başladığı tarafsız referans noktasıdır.
      </Text>

      <Text style={styles.alanEtiket}>Teslim Türü *</Text>
      <View style={{ gap: spacing.sm, width: "100%" }}>
        {SECENEKLER.map((s) => (
          <TouchableOpacity
            key={s.deger}
            style={[styles.secenekKart, teslimTuru === s.deger && styles.secenekKartAktif]}
            onPress={() => setTeslimTuru(s.deger)}
          >
            <View style={styles.secenekUst}>
              <Ionicons
                name={teslimTuru === s.deger ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={teslimTuru === s.deger ? colors.navy : colors.textSecondary}
              />
              <Text style={styles.secenekBaslik}>{s.baslik}</Text>
            </View>
            <Text style={styles.secenekAciklama}>{s.aciklama}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ width: "100%", marginTop: spacing.md }}>
        <Text style={styles.alanEtiket}>Baskı Merkezi / Firma *</Text>
        <TextInput
          style={styles.input}
          value={baskiMerkezi}
          onChangeText={setBaskiMerkezi}
          placeholder="Örn. BBM"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <TouchableOpacity
        style={[styles.acilKart, acil && styles.acilKartAktif]}
        onPress={() => setAcil(!acil)}
      >
        <Ionicons name={acil ? "checkbox" : "square-outline"} size={20} color={acil ? colors.danger : colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.acilBaslik, acil && { color: colors.danger }]}>Acil İş</Text>
          <Text style={styles.acilAciklama}>Liste ve kartlarda kırmızı "ACİL" rozeti ile öne çıkarılır.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buton} onPress={baslat} disabled={gonderiliyor}>
        {gonderiliyor ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.butonMetni}>İşi Başlat</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.iptalButon} onPress={() => router.back()}>
        <Text style={styles.iptalMetni}>Vazgeç</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: "center", padding: spacing.lg, paddingTop: spacing.xl },
  ikonWrap: { marginBottom: spacing.sm },
  baslik: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  aciklama: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  alanEtiket: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: spacing.sm, alignSelf: "flex-start" },
  secenekKart: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  secenekKartAktif: { borderColor: colors.navy, backgroundColor: colors.navy + "10" },
  secenekUst: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  secenekBaslik: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  secenekAciklama: { fontSize: 12, color: colors.textSecondary, marginTop: 4, marginLeft: 28 },
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
  acilKart: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  acilKartAktif: { borderColor: colors.danger, backgroundColor: colors.danger + "10" },
  acilBaslik: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  acilAciklama: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  buton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    minWidth: 200,
    alignItems: "center",
  },
  butonMetni: { color: colors.white, fontSize: 16, fontWeight: "600" },
  iptalButon: { marginTop: spacing.md, padding: spacing.sm },
  iptalMetni: { color: colors.textSecondary, fontSize: 14 },
});
