import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "@/src/config/theme";

type ToastTone = "success" | "error" | "info";
interface ToastState {
  message: string;
  tone: ToastTone;
  visible: boolean;
}
interface ToastCtx {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ToastState>({ message: "", tone: "success", visible: false });
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState({ message, tone, visible: true });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setState((s) => ({ ...s, visible: false })));
      }, 2200);
    },
    [opacity],
  );

  const icon: keyof typeof Ionicons.glyphMap =
    state.tone === "success" ? "checkmark-circle" : state.tone === "error" ? "alert-circle" : "information-circle";
  const bg = state.tone === "success" ? COLORS.primary : state.tone === "error" ? COLORS.danger : COLORS.info;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {state.visible && (
        <SafeAreaView pointerEvents="none" style={styles.wrap} edges={["top"]}>
          <Animated.View style={[styles.toast, { backgroundColor: bg, opacity }]} testID="toast">
            <Ionicons name={icon} size={20} color={COLORS.textOnPrimary} />
            <Text style={styles.text}>{state.message}</Text>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastCtx => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    maxWidth: "90%",
    ...SHADOW.fab,
  },
  text: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    flexShrink: 1,
  },
});
