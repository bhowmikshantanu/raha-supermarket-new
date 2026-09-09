import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT, SPACING } from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";

const TAB_BAR_HEIGHT = 52;
const TAB_ICON_SIZE = 22;

function CompactTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarSafeArea,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Preserve Expo Router hidden route behavior,
          // e.g. notifications with href: null.
          const href = (options as { href?: string | null }).href;

          if (href === null) {
            return null;
          }

          const isFocused = state.index === index;

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;

          const color = isFocused
            ? COLORS.maroon
            : COLORS.indigo;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={
                isFocused ? { selected: true } : {}
              }
              accessibilityLabel={
                options.tabBarAccessibilityLabel
              }
              testID={options.tabBarButtonTestID}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: TAB_ICON_SIZE,
                })}
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  { color },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { cartCount } = useApp();

  return (
    <Tabs
      tabBar={(props) => <CompactTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="home"
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarButtonTestID: "tab-home",
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="grid"
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarButtonTestID: "tab-categories",
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons
                name="cart"
                size={TAB_ICON_SIZE}
                color={color}
              />

              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {cartCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarButtonTestID: "tab-cart",
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="receipt"
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarButtonTestID: "tab-orders",
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="person"
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
          tabBarButtonTestID: "tab-profile",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarSafeArea: {
    backgroundColor: COLORS.background,
  },

  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: COLORS.cream,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,

    // Slight horizontal breathing space.
    marginHorizontal: 6,

    // Rounded top corners like the reference.
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,

    paddingVertical: 0,
  },

  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },

  iconContainer: {
    height: TAB_ICON_SIZE + 2,
    alignItems: "center",
    justifyContent: "center",
  },

  tabLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: FONT.weight.semibold,
    marginTop: 2,
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  badgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: FONT.weight.bold,
    paddingHorizontal: SPACING.xs / 2,
  },
});