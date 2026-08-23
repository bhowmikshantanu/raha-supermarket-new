import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COLORS,
  FONT,
} from "@/src/config/theme";

import { useApp } from "@/src/context/AppContext";

export default function TabsLayout() {
  const { cartCount } = useApp();
  const insets = useSafeAreaInsets();

  const bottomPadding =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 10)
      : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          COLORS.primary,

        tabBarInactiveTintColor:
          COLORS.textMuted,

        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight:
            FONT.weight.semibold,
          marginTop: 1,
        },

        tabBarIconStyle: {
          marginTop: -1,
        },

        tabBarItemStyle: {
          paddingTop: 2,
        },

        tabBarStyle: {
          height:
            58 + bottomPadding,

          paddingTop: 5,

          paddingBottom:
            bottomPadding,

          backgroundColor:
            COLORS.background,

          borderTopWidth: 1,
          borderTopColor:
            COLORS.borderLight,

          elevation: 12,

          shadowColor:
            "#4A2032",

          shadowOffset: {
            width: 0,
            height: -2,
          },

          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "home"
                  : "home-outline"
              }
              size={20}
              color={color}
            />
          ),

          tabBarButtonTestID:
            "tab-home",
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "grid"
                  : "grid-outline"
              }
              size={19}
              color={color}
            />
          ),

          tabBarButtonTestID:
            "tab-categories",
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View>
              <Ionicons
                name={
                  focused
                    ? "cart"
                    : "cart-outline"
                }
                size={20}
                color={color}
              />

              {cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount > 99
                      ? "99+"
                      : cartCount}
                  </Text>
                </View>
              ) : null}
            </View>
          ),

          tabBarButtonTestID:
            "tab-cart",
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "receipt"
                  : "receipt-outline"
              }
              size={19}
              color={color}
            />
          ),

          tabBarButtonTestID:
            "tab-orders",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "person"
                  : "person-outline"
              }
              size={19}
              color={color}
            />
          ),

          tabBarButtonTestID:
            "tab-profile",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "notifications"
                  : "notifications-outline"
              }
              size={19}
              color={color}
            />
          ),

          tabBarButtonTestID:
            "tab-notifications",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -7,
    right: -9,

    minWidth: 17,
    height: 17,

    borderRadius: 9,

    paddingHorizontal: 4,

    backgroundColor:
      COLORS.accent,

    justifyContent:
      "center",

    alignItems:
      "center",

    borderWidth: 2,

    borderColor:
      COLORS.background,
  },

  badgeText: {
    color:
      COLORS.textOnPrimary,

    fontSize: 9,

    fontWeight:
      FONT.weight.bold,
  },
});