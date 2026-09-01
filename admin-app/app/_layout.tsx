import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import {
  LogBox,
  Platform,
  StatusBar,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/src/components/Toast";
import { COLORS } from "@/src/config/theme";
import { AppProvider } from "@/src/context/AppContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { ProductProvider } from "@/src/context/ProductContext";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import {
  setupNotificationHandler,
  startPushTokenRegistrationLifecycle,
} from "@/src/services/pushNotifications";

LogBox.ignoreAllLogs(true);

void SplashScreen.preventAutoHideAsync();

setupNotificationHandler();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const router = useRouter();

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    const stopPushRegistration =
      startPushTokenRegistrationLifecycle();

    return stopPushRegistration;
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response.notification.request.content.data;

          const route =
            typeof data?.route === "string"
              ? data.route
              : null;

          const orderId =
            typeof data?.orderId === "string"
              ? data.orderId
              : null;

          if (route) {
            router.push(route as never);
            return;
          }

          if (orderId) {
            router.push(
              `/order/${orderId}` as never,
            );
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          return;
        }

        const data =
          response.notification.request.content.data;

        const route =
          typeof data?.route === "string"
            ? data.route
            : null;

        const orderId =
          typeof data?.orderId === "string"
            ? data.orderId
            : null;

        if (route) {
          router.push(route as never);
          return;
        }

        if (orderId) {
          router.push(
            `/order/${orderId}` as never,
          );
        }
      })
      .catch((notificationError) => {
        console.error(
          "[Push] Initial notification response failed:",
          notificationError,
        );
      });
  }, [router]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
    >
      <SafeAreaProvider>
        <ProductProvider>
          <AppProvider>
            <NotificationProvider>
              <ToastProvider>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor={
                    COLORS.background
                  }
                />

                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor:
                        COLORS.background,
                    },
                  }}
                />
              </ToastProvider>
            </NotificationProvider>
          </AppProvider>
        </ProductProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}