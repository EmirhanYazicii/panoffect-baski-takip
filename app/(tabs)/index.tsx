import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius } from "@/constants/theme";
import { JobCard } from "@/components/JobCard";
import type { JobListItem, IsDurumu } from "@/types/database";

const FILTRELER: { anahtar: IsDurumu | "tumu" | "benim" | "acil"; etiket: string }[] = [
  { anahtar: "tumu", etiket: "Tümü" },
  { anahtar: "benim", etiket: "Benim İşlerim" },
  { anahtar: "acil", etiket: "Acil" },
  { anahtar: "rezervasyon_bekliyor", etiket: "Rezervasyon" },
  { anahtar: "grafik_bekliyor", etiket: "Grafik" },
  { anahtar: "metro_bekliyor", etiket: "Metro" },
  { anahtar: "tamamlandi", etiket: "Tamamlandı" },
];

export default function AnaListeScreen() {
  const router = useRouter();
  const kullanici = useAuthStore((s) => s.kullanici);
  const [isler, setIsler] = useState<JobListItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [arama, setArama] = useState("");
  const [aktifFiltre, setAktifFiltre] = useState<(typeof FILTRELER)[number]["anahtar"]>("tumu");

  const veriYukle = useCallback(async () => {
    setYukleniyor(true);
    let sorgu = supabase
      .from("jobs")
      .select("*, rezervasyon_detay(marka, urun_olcu)")
      .eq("arsiv", false)
      .order("created_at", { ascending: false });

    if (aktifFiltre !== "tumu" && aktifFiltre !== "benim" && aktifFiltre !== "acil") {
      if (aktifFiltre === "rezervasyon_bekliyor") {
        sorgu = sorgu.in("durum", ["rezervasyon_bekliyor", "revize_gerekiyor"]);
      } else {
        sorgu = sorgu.eq("durum", aktifFiltre);
      }
    }
    if (aktifFiltre === "benim" && kullanici) {
      sorgu = sorgu.eq("baslatan_kullanici_id", kullanici.id);
    }
    if (aktifFiltre === "acil") {
      sorgu = sorgu.eq("oncelik", "acil");
    }

    const { data, error } = await sorgu;
    if (!error && data) {
      const siralanmis = [...(data as unknown as JobListItem[])].sort((a, b) => {
        if (a.oncelik === "acil" && b.oncelik !== "acil") return -1;
        if (a.oncelik !== "acil" && b.oncelik === "acil") return 1;
        return 0;
      });
      setIsler(siralanmis);
    }
    setYukleniyor(false);
  }, [aktifFiltre, kullanici]);

  useFocusEffect(
    useCallback(() => {
      veriYukle();
    }, [veriYukle])
  );

  const filtrelenmisIsler = useMemo(() => {
    if (!arama.trim()) return isler;
    const q = arama.toLowerCase();
    return isler.filter(
      (is) =>
        String(is.sayi).includes(q) ||
        is.rezervasyon_detay?.marka?.toLowerCase().includes(q) ||
        is.rezervasyon_detay?.urun_olcu?.toLowerCase().includes(q)
    );
  }, [isler, arama]);

  const ozet = useMemo(() => {
    const tamamlanan = isler.filter((i) => i.durum === "tamamlandi").length;
    const devamEden = isler.filter((i) =>
      ["rezervasyon_bekliyor", "grafik_bekliyor", "metro_bekliyor", "baslatildi"].includes(i.durum)
    ).length;
    const revize = isler.filter((i) => i.durum === "revize_gerekiyor").length;
    return { tamamlanan, devamEden, revize };
  }, [isler]);

  return (
    <View style={styles.container}>
      <View style={styles.ozetRow}>
        <OzetKutu sayi={ozet.devamEden} etiket="Devam Eden" renk={colors.durum.grafik_bekliyor} />
        <OzetKutu sayi={ozet.tamamlanan} etiket="Tamamlanan" renk={colors.success} />
        <OzetKutu sayi={ozet.revize} etiket="Revize" renk={colors.danger} />
      </View>

      <View style={styles.aramaKutu}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.aramaInput}
          placeholder="İş no, marka veya ürün ara..."
          placeholderTextColor={colors.textSecondary}
          value={arama}
          onChangeText={setArama}
        />
      </View>

      <FlatList
        horizontal
        data={FILTRELER}
        keyExtractor={(f) => f.anahtar}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filtreChip, aktifFiltre === item.anahtar && styles.filtreChipAktif]}
            onPress={() => setAktifFiltre(item.anahtar)}
          >
            <Text style={[styles.filtreMetni, aktifFiltre === item.anahtar && styles.filtreMetniAktif]}>
              {item.etiket}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        style={{ flex: 1 }}
        data={filtrelenmisIsler}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={veriYukle} />}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => router.push(`/job/${item.id}`)} />
        )}
        ListEmptyComponent={
          !yukleniyor ? (
            <Text style={styles.bosMetni}>Bu filtreye uyan iş bulunamadı.</Text>
          ) : null
        }
      />

      {kullanici?.ekip === "baslatma" && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push("/new-job")}>
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function OzetKutu({ sayi, etiket, renk }: { sayi: number; etiket: string; renk: string }) {
  return (
    <View style={styles.ozetKutu}>
      <Text style={[styles.ozetSayi, { color: renk }]}>{sayi}</Text>
      <Text style={styles.ozetEtiket}>{etiket}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  ozetRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.sm },
  ozetKutu: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ozetSayi: { fontSize: 22, fontWeight: "700" },
  ozetEtiket: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: "center" },
  aramaKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  aramaInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.textPrimary },
  filtreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtreChipAktif: { backgroundColor: colors.navy, borderColor: colors.navy },
  filtreMetni: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  filtreMetniAktif: { color: colors.white },
  bosMetni: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
