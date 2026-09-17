import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, durumEtiketleri, radius, spacing } from "@/constants/theme";
import type { JobListItem } from "@/types/database";

export function JobCard({ job, onPress }: { job: JobListItem; onPress: () => void }) {
  const renk = colors.durum[job.durum as keyof typeof colors.durum] ?? colors.textSecondary;

  return (
    <TouchableOpacity style={styles.kart} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.ustSatir}>
        <Text style={styles.isNo}>#{job.sayi}</Text>
        {job.oncelik === "acil" && (
          <View style={styles.acilRozet}>
            <Text style={styles.acilMetni}>ACİL</Text>
          </View>
        )}
        <View style={[styles.durumEtiket, { backgroundColor: renk + "20" }]}>
          <View style={[styles.durumNokta, { backgroundColor: renk }]} />
          <Text style={[styles.durumMetni, { color: renk }]}>{durumEtiketleri[job.durum]}</Text>
        </View>
      </View>

      <Text style={styles.marka}>
        {job.rezervasyon_detay?.marka || "Marka bilgisi bekleniyor"}
        {job.rezervasyon_detay?.urun_olcu ? ` · ${job.rezervasyon_detay.urun_olcu}` : ""}
      </Text>

      <View style={styles.altSatir}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.tarihMetni}>
          {new Date(job.created_at).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ustSatir: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  isNo: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  acilRozet: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  acilMetni: { color: colors.white, fontSize: 10, fontWeight: "700" },
  durumEtiket: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  durumNokta: { width: 6, height: 6, borderRadius: 3 },
  durumMetni: { fontSize: 11, fontWeight: "600" },
  marka: { fontSize: 14, color: colors.textPrimary, marginTop: spacing.sm, fontWeight: "500" },
  altSatir: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  tarihMetni: { fontSize: 12, color: colors.textSecondary },
});
