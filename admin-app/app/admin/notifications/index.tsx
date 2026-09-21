import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";

import {
  sendCustomerPushNotification,
  subscribeToNotificationCampaigns,
  type AdminNotificationChannel,
  type NotificationCampaign,
} from "@/src/services/firebaseAdminNotifications";

const CHANNELS: Array<{
  id: AdminNotificationChannel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "general",
    label: "General",
    icon: "notifications-outline",
  },
  {
    id: "offers",
    label: "Offers",
    icon: "pricetag-outline",
  },
  {
    id: "orders",
    label: "Orders",
    icon: "receipt-outline",
  },
];

function showMessage(
  title: string,
  message: string,
) {
  if (Platform.OS === "web") {
    window.alert(
      `${title}\n\n${message}`,
    );
    return;
  }

  Alert.alert(
    title,
    message,
  );
}

function formatDate(
  value: unknown,
): string {
  const timestamp = value as
    | {
        toDate?: () => Date;
      }
    | undefined;

  if (
    !timestamp ||
    typeof timestamp.toDate !==
      "function"
  ) {
    return "Just now";
  }

  return timestamp
    .toDate()
    .toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
}

export default function AdminNotificationsScreen() {
  const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [route, setRoute] =
    useState(
      "/notifications",
    );

  const [
    channel,
    setChannel,
  ] =
    useState<AdminNotificationChannel>(
      "general",
    );

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(true);

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<
      NotificationCampaign[]
    >([]);

  useEffect(() => {
    const unsubscribe =
      subscribeToNotificationCampaigns(
        (items) => {
          setCampaigns(
            items,
          );
          setHistoryLoading(
            false,
          );
        },
        (error) => {
          console.error(
            "Unable to load notification history:",
            error,
          );
          setHistoryLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, []);

  const stats =
    useMemo(() => {
      const accepted =
        campaigns.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.acceptedCount,
          0,
        );

      const failed =
        campaigns.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.failedCount,
          0,
        );

      return {
        campaigns:
          campaigns.length,
        accepted,
        failed,
      };
    }, [campaigns]);

  const sendNotification =
    async () => {
      const cleanTitle =
        title.trim();

      const cleanMessage =
        message.trim();

      if (
        !cleanTitle ||
        !cleanMessage
      ) {
        showMessage(
          "Missing details",
          "Please enter both notification title and message.",
        );
        return;
      }

      const run =
        async () => {
          try {
            setSending(true);

            const result =
              await sendCustomerPushNotification(
                {
                  title:
                    cleanTitle,
                  body:
                    cleanMessage,
                  channel,
                  route:
                    route.trim() ||
                    "/notifications",
                },
              );

            showMessage(
              "Notification sent",
              `Accepted: ${result.acceptedCount}/${result.recipientCount}\nFailed: ${result.failedCount}`,
            );

            setTitle("");
            setMessage("");
          } catch (error) {
            console.error(
              "Notification send failed:",
              error,
            );

            showMessage(
              "Unable to send",
              error instanceof
                Error
                ? error.message
                : "Unable to send notification.",
            );
          } finally {
            setSending(
              false,
            );
          }
        };

      if (
        Platform.OS ===
        "web"
      ) {
        const confirmed =
          window.confirm(
            "Send this notification to all registered customer devices?",
          );

        if (confirmed) {
          await run();
        }

        return;
      }

      Alert.alert(
        "Send Notification",
        "Send this notification to all registered customer devices?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Send",
            onPress: () =>
              void run(),
          },
        ],
      );
    };

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        "top",
        "bottom",
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={
              COLORS.textPrimary
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={
              styles.heading
            }
          >
            Notification Management
          </Text>

          <Text
            style={
              styles.subheading
            }
          >
            Send push updates to customer devices
          </Text>
        </View>
      </View>

      <View
        style={
          styles.statsRow
        }
      >
        <StatCard
          label="Campaigns"
          value={
            stats.campaigns
          }
        />

        <StatCard
          label="Accepted"
          value={
            stats.accepted
          }
        />

        <StatCard
          label="Failed"
          value={
            stats.failed
          }
        />
      </View>

      <FlatList
        data={
          campaigns
        }
        keyExtractor={(
          item,
        ) =>
          item.id
        }
        showsVerticalScrollIndicator={
          true
        }
        contentContainerStyle={
          styles.pageContent
        }
        ListHeaderComponent={
          <>
            <View
              style={
                styles.formCard
              }
            >
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View
                  style={
                    styles.sectionIcon
                  }
                >
                  <Ionicons
                    name="paper-plane-outline"
                    size={22}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.sectionHeaderText
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Send Customer Notification
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    This sends to registered customer app devices.
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Notification Type
              </Text>

              <View
                style={
                  styles.channelRow
                }
              >
                {CHANNELS.map(
                  (
                    item,
                  ) => {
                    const selected =
                      channel ===
                      item.id;

                    return (
                      <TouchableOpacity
                        key={
                          item.id
                        }
                        style={[
                          styles.channelChip,
                          selected &&
                            styles.channelChipActive,
                        ]}
                        onPress={() =>
                          setChannel(
                            item.id,
                          )
                        }
                        activeOpacity={
                          0.8
                        }
                      >
                        <Ionicons
                          name={
                            item.icon
                          }
                          size={18}
                          color={
                            selected
                              ? COLORS.textOnPrimary
                              : COLORS.textPrimary
                          }
                        />

                        <Text
                          style={[
                            styles.channelText,
                            selected &&
                              styles.channelTextActive,
                          ]}
                        >
                          {
                            item.label
                          }
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Title
              </Text>

              <TextInput
                value={
                  title
                }
                onChangeText={
                  setTitle
                }
                style={
                  styles.input
                }
                placeholder="Example: Weekend Special Offer"
                placeholderTextColor={
                  COLORS.textMuted
                }
                maxLength={
                  100
                }
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Message
              </Text>

              <TextInput
                value={
                  message
                }
                onChangeText={
                  setMessage
                }
                style={[
                  styles.input,
                  styles.messageInput,
                ]}
                placeholder="Write the message customers should receive..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                textAlignVertical="top"
                maxLength={
                  500
                }
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Open App Route
              </Text>

              <TextInput
                value={
                  route
                }
                onChangeText={
                  setRoute
                }
                style={
                  styles.input
                }
                placeholder="/notifications"
                placeholderTextColor={
                  COLORS.textMuted
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                For general notifications keep /notifications.
              </Text>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  sending &&
                    styles.sendButtonDisabled,
                ]}
                onPress={() =>
                  void sendNotification()
                }
                disabled={
                  sending
                }
                activeOpacity={
                  0.85
                }
              >
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color={
                    COLORS.textOnPrimary
                  }
                />

                <Text
                  style={
                    styles.sendButtonText
                  }
                >
                  {sending
                    ? "Sending..."
                    : "Send to Customers"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.historyHeader
              }
            >
              <Text
                style={
                  styles.historyTitle
                }
              >
                Send History
              </Text>

              <Text
                style={
                  styles.historySubtitle
                }
              >
                Latest campaigns
              </Text>
            </View>

            {historyLoading ? (
              <View
                style={
                  styles.emptyHistory
                }
              >
                <Text
                  style={
                    styles.mutedText
                  }
                >
                  Loading notification history...
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !historyLoading ? (
            <View
              style={
                styles.emptyHistory
              }
            >
              <Ionicons
                name="notifications-off-outline"
                size={42}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No notification campaigns yet
              </Text>

              <Text
                style={
                  styles.mutedText
                }
              >
                Sent notifications will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.historyCard
            }
          >
            <View
              style={
                styles.historyTopRow
              }
            >
              <View
                style={
                  styles.historyIcon
                }
              >
                <Ionicons
                  name={
                    item.channel ===
                    "offers"
                      ? "pricetag-outline"
                      : item.channel ===
                          "orders"
                        ? "receipt-outline"
                        : "notifications-outline"
                  }
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={
                  styles.historyContent
                }
              >
                <Text
                  style={
                    styles.historyItemTitle
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.historyDate
                  }
                >
                  {formatDate(
                    item.createdAt,
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.sentBadge
                }
              >
                <Text
                  style={
                    styles.sentBadgeText
                  }
                >
                  Sent
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.historyMessage
              }
            >
              {item.body}
            </Text>

            <View
              style={
                styles.historyStats
              }
            >
              <Text
                style={
                  styles.historyStatText
                }
              >
                Recipients:{" "}
                {
                  item.recipientCount
                }
              </Text>

              <Text
                style={
                  styles.historyStatSuccess
                }
              >
                Accepted:{" "}
                {
                  item.acceptedCount
                }
              </Text>

              <Text
                style={
                  styles.historyStatFailed
                }
              >
                Failed:{" "}
                {
                  item.failedCount
                }
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <Text
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },

  /* ---------- HEADER ---------- */
  header: {
    minHeight: 80,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  headerText: {
    flex: 1,
  },

  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  subheading: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },

  /* ---------- STATS ---------- */
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 0,
  },

  statCard: {
    flex: 1,
    minHeight: 98,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.055,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#102A43",
    letterSpacing: -0.5,
  },

  statLabel: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ---------- PAGE ---------- */
  pageContent: {
    padding: 20,
    paddingBottom: 60,
  },

  /* ---------- COMPOSE CARD ---------- */
  formCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
  },

  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#F4D98B",
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontWeight: "900",
    color: "#0F172A",
    fontSize: 16,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },

  /* ---------- FORM ---------- */
  fieldLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  channelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  channelChip: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
  },

  channelChipActive: {
    borderColor: "#102A43",
    backgroundColor: "#102A43",
    shadowColor: "#102A43",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  channelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },

  channelTextActive: {
    color: "#FFFFFF",
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 13,
    paddingHorizontal: 15,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    fontSize: 13,
  },

  messageInput: {
    minHeight: 110,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  helperText: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 15,
    color: "#94A3B8",
  },

  /* ---------- SEND ---------- */
  sendButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#102A43",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    shadowColor: "#102A43",
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },

  /* ---------- HISTORY HEADER ---------- */
  historyHeader: {
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  historyTitle: {
    fontWeight: "900",
    color: "#0F172A",
    fontSize: 17,
    letterSpacing: -0.2,
  },

  historySubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#64748B",
  },

  /* ---------- HISTORY CARD ---------- */
  historyCard: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 17,
    borderWidth: 1,
    borderColor: "#E1E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  historyIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F3",
    borderWidth: 1,
    borderColor: "#CBE9E1",
  },

  historyContent: {
    flex: 1,
  },

  historyItemTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },

  historyDate: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },

  sentBadge: {
    minHeight: 28,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F8F1",
    borderWidth: 1,
    borderColor: "#CDE7E2",
  },

  sentBadgeText: {
    color: "#0F766E",
    fontWeight: "900",
    fontSize: 9,
  },

  historyMessage: {
    marginTop: 12,
    lineHeight: 19,
    fontSize: 12,
    color: "#475569",
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    padding: 12,
  },

  /* ---------- DELIVERY STATS ---------- */
  historyStats: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },

  historyStatText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },

  historyStatSuccess: {
    fontSize: 10,
    color: "#0F766E",
    fontWeight: "800",
  },

  historyStatFailed: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "800",
  },

  /* ---------- EMPTY HISTORY ---------- */
  emptyHistory: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },

  mutedText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    color: "#94A3B8",
    textAlign: "center",
  },
});
