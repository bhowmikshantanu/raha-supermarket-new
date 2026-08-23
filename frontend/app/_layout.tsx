import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import React, {
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  LogBox,
  StatusBar,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/src/components/Toast";
import { COLORS } from "@/src/config/theme";
import {
  AppProvider,
  type AppNotificationType,
  useApp,
} from "@/src/context/AppContext";
import { ProductProvider } from "@/src/context/ProductContext";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import {
  setupNotificationHandler,
  startPushTokenRegistrationLifecycle,
} from "@/src/services/pushNotifications";
import { storage } from "@/src/utils/storage";

LogBox.ignoreAllLogs(true);

void SplashScreen.preventAutoHideAsync();

setupNotificationHandler();

const PUSH_PROCESSED_KEY =
  "raha.processedPushNotifications.v1";

const MAX_PROCESSED_PUSH_IDS = 150;

function resolveNotificationType(
  value: unknown,
): AppNotificationType {
  if (value === "order") {
    return "order";
  }

  if (value === "offer") {
    return "offer";
  }

  if (value === "wishlist") {
    return "wishlist";
  }

  return "system";
}

function PushNotificationBridge() {
  const router = useRouter();

  const {
    addNotification,
  } = useApp();

  const processedIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const processedReadyRef =
    useRef(false);

  useEffect(() => {
    let active = true;

    const hydrateProcessedIds =
      async () => {
        try {
          const stored =
            await storage.getItem<string>(
              PUSH_PROCESSED_KEY,
              "",
            );

          if (
            !active ||
            !stored
          ) {
            processedReadyRef.current =
              true;

            return;
          }

          const parsed =
            JSON.parse(
              stored,
            );

          if (
            Array.isArray(
              parsed,
            )
          ) {
            processedIdsRef.current =
              new Set(
                parsed.filter(
                  (
                    value,
                  ): value is string =>
                    typeof value ===
                    "string",
                ),
              );
          }
        } catch (error) {
          console.warn(
            "[Push] Unable to hydrate processed notification IDs:",
            error,
          );
        } finally {
          processedReadyRef.current =
            true;
        }
      };

    void hydrateProcessedIds();

    return () => {
      active = false;
    };
  }, []);

  const persistProcessedIds =
    useCallback(
      async () => {
        try {
          const ids = Array.from(
            processedIdsRef.current,
          ).slice(
            -MAX_PROCESSED_PUSH_IDS,
          );

          processedIdsRef.current =
            new Set(ids);

          await storage.setItem(
            PUSH_PROCESSED_KEY,
            JSON.stringify(ids),
          );
        } catch (error) {
          console.warn(
            "[Push] Unable to save processed notification IDs:",
            error,
          );
        }
      },
      [],
    );

  const saveNotificationInApp =
    useCallback(
      async (
        notification: Notifications.Notification,
      ) => {
        const identifier =
          notification.request.identifier;

        /*
         * Prevent the same push from
         * being added twice:
         *
         * 1. notification received
         * 2. customer taps notification
         * 3. app checks last response
         */
        if (
          identifier &&
          processedIdsRef.current.has(
            identifier,
          )
        ) {
          return;
        }

        const content =
          notification.request.content;

        const title =
          typeof content.title ===
            "string" &&
          content.title.trim()
            ? content.title.trim()
            : "Raha Supermarket";

        const message =
          typeof content.body ===
            "string" &&
          content.body.trim()
            ? content.body.trim()
            : "You have a new update.";

        const data =
          content.data ?? {};

        const type =
          resolveNotificationType(
            data.type,
          );

        const route =
          typeof data.route ===
            "string" &&
          data.route.trim()
            ? data.route.trim()
            : undefined;

        const orderId =
          typeof data.orderId ===
            "string" &&
          data.orderId.trim()
            ? data.orderId.trim()
            : undefined;

        const productId =
          typeof data.productId ===
            "string" &&
          data.productId.trim()
            ? data.productId.trim()
            : undefined;

        /*
         * Save directly into the
         * existing AppContext notification
         * system.
         *
         * AppContext already persists
         * notifications to local storage.
         */
        addNotification({
          type,
          title,
          message,
          orderId,
          productId,
          actionRoute:
            route,
        });

        if (identifier) {
          processedIdsRef.current.add(
            identifier,
          );

          await persistProcessedIds();
        }

        console.log(
          "[Push] Saved notification inside Raha app:",
          identifier,
          title,
        );
      },
      [
        addNotification,
        persistProcessedIds,
      ],
    );

  const openNotificationDestination =
    useCallback(
      (
        notification: Notifications.Notification,
      ) => {
        const data =
          notification.request.content
            .data ?? {};

        const route =
          typeof data.route ===
            "string"
            ? data.route.trim()
            : "";

        const orderId =
          typeof data.orderId ===
            "string"
            ? data.orderId.trim()
            : "";

        const productId =
          typeof data.productId ===
            "string"
            ? data.productId.trim()
            : "";

        if (route) {
          router.push(
            route as never,
          );

          return;
        }

        if (orderId) {
          router.push({
            pathname:
              "/order/[id]",
            params: {
              id: orderId,
            },
          });

          return;
        }

        if (productId) {
          router.push({
            pathname:
              "/product/[id]",
            params: {
              id: productId,
            },
          });
        }
      },
      [router],
    );

  /*
   * FOREGROUND:
   *
   * App is open and push arrives.
   * Save it immediately in the
   * Notifications section.
   */
  useEffect(() => {
    const subscription =
      Notifications.addNotificationReceivedListener(
        (
          notification,
        ) => {
          void saveNotificationInApp(
            notification,
          );
        },
      );

    return () => {
      subscription.remove();
    };
  }, [
    saveNotificationInApp,
  ]);

  /*
   * CUSTOMER TAPS PUSH:
   *
   * Save it if needed and then
   * navigate to its route.
   */
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (
          response,
        ) => {
          const notification =
            response.notification;

          void saveNotificationInApp(
            notification,
          ).finally(() => {
            openNotificationDestination(
              notification,
            );
          });
        },
      );

    return () => {
      subscription.remove();
    };
  }, [
    openNotificationDestination,
    saveNotificationInApp,
  ]);

  /*
   * COLD START:
   *
   * Customer taps a push while
   * Raha app was completely closed.
   */
  useEffect(() => {
    void Notifications
      .getLastNotificationResponseAsync()
      .then(
        (
          response,
        ) => {
          if (!response) {
            return;
          }

          const notification =
            response.notification;

          return saveNotificationInApp(
            notification,
          ).then(() => {
            openNotificationDestination(
              notification,
            );
          });
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            "[Push] Initial notification response failed:",
            error,
          );
        },
      );
  }, [
    openNotificationDestination,
    saveNotificationInApp,
  ]);

  /*
   * BACKGROUND DELIVERY:
   *
   * If Android notification is still
   * visible in the system notification
   * tray when app starts/returns,
   * import it into Raha's notification
   * history as well.
   */
  useEffect(() => {
    const importPresentedNotifications =
      async () => {
        try {
          const presented =
            await Notifications
              .getPresentedNotificationsAsync();

          for (
            const notification
            of presented
          ) {
            await saveNotificationInApp(
              notification,
            );
          }
        } catch (error) {
          console.warn(
            "[Push] Unable to import presented notifications:",
            error,
          );
        }
      };

    void importPresentedNotifications();
  }, [
    saveNotificationInApp,
  ]);

  return null;
}

function AppContent() {
  const [loaded, error] =
    useIconFonts();

  useEffect(() => {
    if (
      loaded ||
      error
    ) {
      void SplashScreen
        .hideAsync();
    }
  }, [
    loaded,
    error,
  ]);

  useEffect(() => {
    const stopPushRegistration =
      startPushTokenRegistrationLifecycle();

    return stopPushRegistration;
  }, []);

  if (
    !loaded &&
    !error
  ) {
    return null;
  }

  return (
    <>
      <PushNotificationBridge />

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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <SafeAreaProvider>
        <ProductProvider>
          <AppProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AppProvider>
        </ProductProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}