import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  const { kullanici, yukleniyor, oturumuYukle } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    oturumuYukle();
  }, []);

  useEffect(() => {
    if (yukleniyor) return;
    const girisEkraninda = segments[0] === "login";

    if (!kullanici && !girisEkraninda) {
      router.replace("/login");
    } else if (kullanici && girisEkraninda) {
      router.replace("/(tabs)");
    }
  }, [kullanici, yukleniyor, segments]);

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ headerShown: true, title: "İş Detayı" }} />
        <Stack.Screen name="new-job" options={{ headerShown: true, title: "Yeni İş Başlat", presentation: "modal" }} />
      </Stack>
    </>
  );
}
