import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { colors, ekipEtiketleri, radius, spacing } from "@/constants/theme";

export default function ProfilScreen() {
  const { kullanici, cikisYap } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarHarf}>{kullanici?.isim?.charAt(0)?.toUpperCase() ?? "?"}</Text>
      </View>
      <Text style={styles.isim}>{kullanici?.isim}</Text>
      <Text style={styles.eposta}>{kullanici?.e_posta}</Text>

      <View style={styles.bilgiKart}>
        <BilgiSatiri etiket="Ekip" deger={kullanici ? ekipEtiketleri[kullanici.ekip] : "-"} />
        <BilgiSatiri etiket="Rol" deger={kullanici?.role === "admin" ? "Yönetici" : "Çalışan"} />
        <BilgiSatiri etiket="Durum" deger={kullanici?.aktif ? "Aktif" : "Pasif"} />
      </View>

      <TouchableOpacity style={styles.cikisButon} onPress={cikisYap}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.cikisMetni}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

function BilgiSatiri({ etiket, deger }: { etiket: string; deger?: string }) {
  return (
    <View style={styles.bilgiSatiri}>
      <Text style={styles.bilgiEtiket}>{etiket}</Text>
      <Text style={styles.bilgiDeger}>{deger}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: "center", padding: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  avatarHarf: { color: colors.white, fontSize: 32, fontWeight: "700" },
  isim: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginTop: spacing.md },
  eposta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bilgiKart: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  bilgiSatiri: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bilgiEtiket: { color: colors.textSecondary, fontSize: 14 },
  bilgiDeger: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  cikisButon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cikisMetni: { color: colors.danger, fontWeight: "600" },
});
