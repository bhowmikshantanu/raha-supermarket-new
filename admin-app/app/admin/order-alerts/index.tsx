import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  OrderAlertRecipient,
  addOrderAlertRecipient,
  getOrderAlertRecipients,
  registerThisDeviceForOrderAlerts,
  removeOrderAlertRecipient,
} from "@/src/services/firebaseAdminOrderAlerts";

const NAVY = "#082F5B";
const NAVY_DARK = "#052445";
const GOLD = "#F3B53F";

export default function AdminOrderAlertsScreen() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<OrderAlertRecipient[]>([]);
  const [phone, setPhone] = useState("");
  const [devicePhone, setDevicePhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

  const loadRecipients = useCallback(async () => {
    try {
      const data = await getOrderAlertRecipients();
      setRecipients(data);
    } catch (error: any) {
      Alert.alert(
        "Unable to load",
        error?.message || "Could not load order alert recipients.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const addRecipient = async () => {
    if (!phone.trim()) {
      Alert.alert("Mobile number required", "Enter a mobile number first.");
      return;
    }

    try {
      setSaving(true);
      await addOrderAlertRecipient(phone.trim());
      setPhone("");
      await loadRecipients();

      Alert.alert(
        "Recipient added",
        "Now register the Raha app on the phone that should receive order alerts.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not add number",
        error?.message || "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeRecipient = (recipient: OrderAlertRecipient) => {
    Alert.alert(
      "Remove order alerts?",
      `${recipient.phone} will stop receiving new-order alerts.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeOrderAlertRecipient(recipient.id);
              await loadRecipients();
            } catch (error: any) {
              Alert.alert(
                "Could not remove number",
                error?.message || "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const registerDevice = async () => {
    if (!devicePhone.trim()) {
      Alert.alert(
        "Mobile number required",
        "Enter one of the configured recipient numbers.",
      );
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Use Android app",
        "Device registration must be done from the Raha Supermarket Android app.",
      );
      return;
    }

    try {
      setRegistering(true);

      await registerThisDeviceForOrderAlerts(
        devicePhone.trim(),
      );

      await loadRecipients();

      Alert.alert(
        "Phone registered",
        "This device can now receive new customer-order alerts even after admin logout.",
      );
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error?.message || "Please try again.",
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Order Alerts</Text>
          <Text style={styles.headerSubtitle}>
            Customer order notification recipients
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecipients();
            }}
          />
        }
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            How Order Alerts Work
          </Text>

          <Text style={styles.infoText}>
            Add the mobile numbers that should receive new customer-order
            notifications. Each number must be registered once from the Raha
            Supermarket Android app on that phone.
          </Text>

          <Text style={styles.infoStrong}>
            After registration, notifications can continue even when the admin
            is logged out.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Notification Recipients
          </Text>

          <Text style={styles.label}>
            Admin mobile number
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 9045747008"
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={16}
          />

          <Pressable
            style={[
              styles.primaryButton,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={addRecipient}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Add Recipient
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Active Recipients
            </Text>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {recipients.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={NAVY}
              style={styles.loader}
            />
          ) : recipients.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No recipients added
              </Text>
              <Text style={styles.emptyText}>
                Add at least one mobile number above.
              </Text>
            </View>
          ) : (
            recipients.map((recipient) => (
              <View
                key={recipient.id}
                style={styles.recipientRow}
              >
                <View style={styles.recipientInfo}>
                  <Text style={styles.phoneText}>
                    {recipient.phone}
                  </Text>

                  <Text style={styles.deviceText}>
                    {recipient.registeredDevices > 0
                      ? `${recipient.registeredDevices} registered device${
                          recipient.registeredDevices === 1 ? "" : "s"
                        }`
                      : "No registered device yet"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    recipient.registeredDevices > 0
                      ? styles.readyBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {recipient.registeredDevices > 0
                      ? "Ready"
                      : "Setup"}
                  </Text>
                </View>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeRecipient(recipient)}
                >
                  <Text style={styles.removeText}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.registerCard}>
          <Text style={styles.registerTitle}>
            Register This Phone
          </Text>

          <Text style={styles.registerDescription}>
            Open this page on the Android phone that should receive order
            alerts. Enter a recipient number already added above, then tap
            Register This Device.
          </Text>

          <TextInput
            value={devicePhone}
            onChangeText={setDevicePhone}
            placeholder="Recipient mobile number"
            keyboardType="phone-pad"
            style={styles.input}
            maxLength={16}
          />

          <Pressable
            style={[
              styles.goldButton,
              registering && styles.disabledButton,
            ]}
            disabled={registering}
            onPress={registerDevice}
          >
            {registering ? (
              <ActivityIndicator color={NAVY_DARK} />
            ) : (
              <Text style={styles.goldButtonText}>
                Register This Device
              </Text>
            )}
          </Pressable>

          <Text style={styles.securityNote}>
            Order access still requires an active authorized admin login.
            Tapping an alert while logged out will first open Admin Login.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 34,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#D8E5F3",
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  infoCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoText: {
    color: "#E6EEF7",
    fontSize: 14,
    lineHeight: 21,
  },
  infoStrong: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E6ECF3",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    color: NAVY_DARK,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  label: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D8E1EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#0F172A",
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.55,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  countText: {
    color: NAVY_DARK,
    fontWeight: "900",
  },
  loader: {
    marginVertical: 24,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyTitle: {
    color: NAVY_DARK,
    fontWeight: "800",
    fontSize: 16,
  },
  emptyText: {
    color: "#64748B",
    marginTop: 5,
  },
  recipientRow: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recipientInfo: {
    flex: 1,
  },
  phoneText: {
    color: NAVY_DARK,
    fontSize: 16,
    fontWeight: "800",
  },
  deviceText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  readyBadge: {
    backgroundColor: "#DCFCE7",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    color: NAVY_DARK,
    fontSize: 11,
    fontWeight: "800",
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800",
  },
  registerCard: {
    backgroundColor: NAVY_DARK,
    borderRadius: 18,
    padding: 20,
  },
  registerTitle: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  registerDescription: {
    color: "#D8E5F3",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 15,
  },
  goldButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  goldButtonText: {
    color: NAVY_DARK,
    fontSize: 15,
    fontWeight: "900",
  },
  securityNote: {
    color: "#B8C9DC",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
});
