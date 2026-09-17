import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Kullanıcı giriş yaptığında Expo push token'ını alır ve
 * users.expo_push_token alanına kaydeder. Edge Function bu token'ı
 * kullanarak durum değişikliği bildirimleri gönderir (Bölüm 7).
 */
export function usePushNotifications() {
  const kullanici = useAuthStore((s) => s.kullanici);

  useEffect(() => {
    if (!kullanici) return;

    (async () => {
      if (!Device.isDevice) return; // Simülatörde push token alınamaz

      const { status: mevcutIzin } = await Notifications.getPermissionsAsync();
      let izin = mevcutIzin;
      if (izin !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        izin = status;
      }
      if (izin !== "granted") return;

      const token = (await Notifications.getExpoPushTokenAsync()).data;

      await supabase.from("users").update({ expo_push_token: token }).eq("id", kullanici.id);

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    })();
  }, [kullanici?.id]);
}
