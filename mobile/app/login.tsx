import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius } from "@/constants/theme";

export default function LoginScreen() {
  const [ePosta, setEPosta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const girisYap = useAuthStore((s) => s.girisYap);

  const handleGiris = async () => {
    setHata(null);
    if (!ePosta || !sifre) {
      setHata("E-posta ve şifre gerekli.");
      return;
    }
    setGonderiliyor(true);
    const { hata: girisHatasi } = await girisYap(ePosta.trim(), sifre);
    setGonderiliyor(false);
    if (girisHatasi) setHata(girisHatasi);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/icon.png")}
          style={{ width: 96, height: 96, borderRadius: 20 }}
          resizeMode="contain"
        />
        <Text style={styles.baslik}>Baskı Süreç Takip</Text>
        <Text style={styles.altBaslik}>Panoffect Medya A.Ş.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Kurumsal E-posta</Text>
        <TextInput
          style={styles.input}
          value={ePosta}
          onChangeText={setEPosta}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ad.soyad@panoffect.com"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          value={sifre}
          onChangeText={setSifre}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
        />

        {hata && <Text style={styles.hataMetni}>{hata}</Text>}

        <TouchableOpacity style={styles.buton} onPress={handleGiris} disabled={gonderiliyor}>
          {gonderiliyor ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.butonMetni}>Giriş Yap</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, justifyContent: "center", paddingHorizontal: spacing.lg },
  logoWrap: { alignItems: "center", marginBottom: spacing.xl },
  baslik: { fontSize: 22, fontWeight: "700", color: colors.navy, marginTop: spacing.md },
  altBaslik: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.xs },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  hataMetni: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  buton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  butonMetni: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
