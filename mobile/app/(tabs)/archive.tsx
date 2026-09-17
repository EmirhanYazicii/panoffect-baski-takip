import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, spacing } from "@/constants/theme";
import { JobCard } from "@/components/JobCard";
import type { JobListItem } from "@/types/database";

export default function ArsivScreen() {
  const router = useRouter();
  const [isler, setIsler] = useState<JobListItem[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  const veriYukle = useCallback(async () => {
    setYukleniyor(true);
    const otuzGunOnce = new Date();
    otuzGunOnce.setDate(otuzGunOnce.getDate() - 60); // bu ay + geçen ay görünsün

    const { data, error } = await supabase
      .from("jobs")
      .select("*, rezervasyon_detay(marka, urun_olcu)")
      .gte("created_at", otuzGunOnce.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) setIsler(data as unknown as JobListItem[]);
    setYukleniyor(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      veriYukle();
    }, [veriYukle])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.aciklama}>
        Bu ay ve geçen aya ait tüm işler (biten + devam eden), tarihe göre sıralı. Tamamlanan işler
        30 gün sonra otomatik arşive taşınır.
      </Text>
      <FlatList
        style={{ flex: 1 }}
        data={isler}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={veriYukle} />}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => router.push(`/job/${item.id}`)} />
        )}
        ListEmptyComponent={
          !yukleniyor ? <Text style={styles.bosMetni}>Kayıt bulunamadı.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  aciklama: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  bosMetni: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl },
});
