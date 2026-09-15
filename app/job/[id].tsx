import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { colors, durumEtiketleri, radius, spacing } from "@/constants/theme";
import { RezervasyonForm } from "@/components/forms/RezervasyonForm";
import { GrafikForm } from "@/components/forms/GrafikForm";
import { MetroForm } from "@/components/forms/MetroForm";
import type {
  JobRow,
  RezervasyonDetayRow,
  GrafikDetayRow,
  MetroDetayRow,
  JobAktiviteRow,
} from "@/types/database";

export default function IsDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const kullanici = useAuthStore((s) => s.kullanici);

  const [job, setJob] = useState<JobRow | null>(null);
  const [rezervasyon, setRezervasyon] = useState<RezervasyonDetayRow | null>(null);
  const [grafik, setGrafik] = useState<GrafikDetayRow | null>(null);
  const [metro, setMetro] = useState<MetroDetayRow[]>([]);
  const [aktivite, setAktivite] = useState<JobAktiviteRow[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const veriYukle = useCallback(async () => {
    setYukleniyor(true);
    const [jobRes, rezRes, grafRes, metroRes, aktRes] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single(),
      supabase.from("rezervasyon_detay").select("*").eq("job_id", id).maybeSingle(),
      supabase.from("grafik_detay").select("*").eq("job_id", id).maybeSingle(),
      supabase.from("metro_detay").select("*").eq("job_id", id),
      supabase.from("job_aktivite").select("*").eq("job_id", id).order("created_at", { ascending: true }),
    ]);
    setJob(jobRes.data as JobRow);
    setRezervasyon(rezRes.data as RezervasyonDetayRow);
    setGrafik(grafRes.data as GrafikDetayRow);
    setMetro((metroRes.data as MetroDetayRow[]) ?? []);
    setAktivite((aktRes.data as JobAktiviteRow[]) ?? []);
    setYukleniyor(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      veriYukle();
    }, [veriYukle])
  );

  const [revizeModalAcik, setRevizeModalAcik] = useState(false);
  const [revizeNotu, setRevizeNotu] = useState("");
  const [revizeGonderiliyor, setRevizeGonderiliyor] = useState(false);

  const revizeyeGonderOnayla = async () => {
    if (!revizeNotu.trim()) {
      Alert.alert("Eksik bilgi", "Eksiklik/hata notu girin.");
      return;
    }
    setRevizeGonderiliyor(true);
    const { error } = await supabase.rpc("is_revizeye_gonder", { p_job_id: id, p_not: revizeNotu.trim() });
    setRevizeGonderiliyor(false);
    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }
    setRevizeModalAcik(false);
    setRevizeNotu("");
    veriYukle();
  };

  const iptalEt = () => {
    Alert.alert("İşi İptal Et", "Bu işi iptal etmek istediğinize emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "İptal Et",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.rpc("is_iptal_et", { p_job_id: id, p_not: "Yönetici tarafından iptal edildi" });
          if (error) Alert.alert("Hata", error.message);
          else veriYukle();
        },
      },
    ]);
  };

  if (yukleniyor || !job) {
    return (
      <View style={styles.yukleniyorWrap}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  const renk = colors.durum[job.durum as keyof typeof colors.durum] ?? colors.textSecondary;
  const kullaniciAdmin = kullanici?.role === "admin";
  const iptalEdilebilirMi =
    job.durum !== "tamamlandi" && job.durum !== "iptal" && (kullaniciAdmin || kullanici?.ekip === "baslatma");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.ustKart}>
        <View style={styles.ustSolGrup}>
          <Text style={styles.isNo}>İş #{job.sayi}</Text>
          {job.oncelik === "acil" && (
            <View style={styles.acilRozet}>
              <Text style={styles.acilRozetMetni}>ACİL</Text>
            </View>
          )}
        </View>
        <View style={[styles.durumEtiket, { backgroundColor: renk + "20" }]}>
          <Text style={[styles.durumMetni, { color: renk }]}>{durumEtiketleri[job.durum]}</Text>
        </View>
      </View>

      <View style={styles.altBilgiRow}>
        <Text style={styles.altBilgiMetni}>
          {job.teslim_turu === "marka_teslim" ? "Marka Tarafından Teslim Edilen" : "Panoffect Tarafından Gönderilen"}
        </Text>
        <Text style={styles.altBilgiMetni}>Baskı Merkezi: {job.baski_merkezi || "-"}</Text>
      </View>

      {job.revize_notu && job.durum === "revize_gerekiyor" && (
        <View style={styles.uyariKutu}>
          <Text style={styles.uyariBaslik}>Revize Notu</Text>
          <Text style={styles.uyariMetin}>{job.revize_notu}</Text>
        </View>
      )}

      {/* 1. Bölüm — Rezervasyon */}
      <RezervasyonForm
        jobId={job.id}
        durum={job.durum}
        veri={rezervasyon}
        kullaniciEkip={kullanici?.ekip}
        teslimTuru={job.teslim_turu}
        acil={job.oncelik === "acil"}
        onKaydedildi={veriYukle}
      />

      {/* 2. Bölüm — Grafik Tasarım */}
      <GrafikForm
        jobId={job.id}
        durum={job.durum}
        veri={grafik}
        kullaniciEkip={kullanici?.ekip}
        baskiMerkezi={job.baski_merkezi}
        teslimTuru={job.teslim_turu}
        acil={job.oncelik === "acil"}
        onKaydedildi={veriYukle}
      />

      {/* 3. Bölüm — Metro */}
      <MetroForm
        jobId={job.id}
        durum={job.durum}
        metroKayitlari={metro}
        anadoluGerekli={(rezervasyon?.anadolu_adet ?? 0) > 0}
        avrupaGerekli={(rezervasyon?.avrupa_adet ?? 0) > 0}
        kullaniciEkip={kullanici?.ekip}
        acil={job.oncelik === "acil"}
        onKaydedildi={veriYukle}
      />

      {/* Aktivite / Zaman Çizelgesi */}
      <View style={styles.kart}>
        <Text style={styles.kartBaslik}>Aktivite Geçmişi</Text>
        {aktivite.map((a) => (
          <View key={a.id} style={styles.aktiviteSatiri}>
            <View style={styles.aktiviteNokta} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aktiviteMetni}>
                {a.eski_durum ? `${durumEtiketleri[a.eski_durum]} → ` : ""}
                {durumEtiketleri[a.yeni_durum]}
              </Text>
              {a.aciklama && <Text style={styles.aktiviteAciklama}>{a.aciklama}</Text>}
              <Text style={styles.aktiviteTarih}>
                {new Date(a.created_at).toLocaleString("tr-TR")}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Yönetim aksiyonları */}
      {(kullaniciAdmin ||
        kullanici?.ekip === "rezervasyon" ||
        kullanici?.ekip === "grafik_tasarim" ||
        kullanici?.ekip === "metro_anadolu" ||
        kullanici?.ekip === "metro_avrupa") &&
        job.durum !== "tamamlandi" &&
        job.durum !== "iptal" &&
        job.durum !== "baslatildi" && (
          <TouchableOpacity style={styles.revizeButon} onPress={() => setRevizeModalAcik(true)}>
            <Text style={styles.revizeMetni}>Revizeye Gönder</Text>
          </TouchableOpacity>
        )}

      {iptalEdilebilirMi && (
        <TouchableOpacity style={styles.iptalButon} onPress={iptalEt}>
          <Text style={styles.iptalMetni}>İşi İptal Et</Text>
        </TouchableOpacity>
      )}

      <Modal visible={revizeModalAcik} transparent animationType="fade" onRequestClose={() => setRevizeModalAcik(false)}>
        <View style={styles.modalArkaPlan}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>Revizeye Gönder</Text>
            <Text style={styles.modalAciklama}>
              İş Rezervasyon aşamasına geri döner ve "Revize Bekliyor" olarak işaretlenir.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={revizeNotu}
              onChangeText={setRevizeNotu}
              placeholder="Eksiklik/hata notu girin (örn. data linki değişti, adet güncellendi)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalButonRow}>
              <TouchableOpacity
                style={styles.modalVazgecButon}
                onPress={() => {
                  setRevizeModalAcik(false);
                  setRevizeNotu("");
                }}
              >
                <Text style={styles.modalVazgecMetni}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOnayButon} onPress={revizeyeGonderOnayla} disabled={revizeGonderiliyor}>
                {revizeGonderiliyor ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalOnayMetni}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  yukleniyorWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  ustKart: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ustSolGrup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  acilRozet: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  acilRozetMetni: { color: colors.white, fontSize: 10, fontWeight: "700" },
  isNo: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  durumEtiket: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  durumMetni: { fontSize: 12, fontWeight: "700" },
  altBilgiRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -spacing.sm },
  altBilgiMetni: { fontSize: 12, color: colors.textSecondary },
  uyariKutu: {
    backgroundColor: "#fdecea",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  uyariBaslik: { color: colors.danger, fontWeight: "700", fontSize: 13, marginBottom: 4 },
  uyariMetin: { color: colors.textPrimary, fontSize: 13 },
  kart: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kartBaslik: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm },
  aktiviteSatiri: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  aktiviteNokta: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy, marginTop: 6 },
  aktiviteMetni: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  aktiviteAciklama: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  aktiviteTarih: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  revizeButon: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  revizeMetni: { color: colors.warning, fontWeight: "600" },
  iptalButon: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iptalMetni: { color: colors.danger, fontWeight: "600" },
  modalArkaPlan: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalKutu: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  modalBaslik: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  modalAciklama: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: spacing.xs,
  },
  modalButonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modalVazgecButon: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  modalVazgecMetni: { color: colors.textSecondary, fontWeight: "600" },
  modalOnayButon: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: "center", backgroundColor: colors.warning },
  modalOnayMetni: { color: colors.white, fontWeight: "600" },
});
