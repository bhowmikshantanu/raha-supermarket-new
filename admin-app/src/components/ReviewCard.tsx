import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { RatingStars } from "@/src/components/RatingStars";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import type { ProductReview } from "@/src/data/reviews";

interface ReviewCardProps {
  review: ProductReview;
  helpful?: boolean;
  onHelpfulPress?: () => void;
}

function formatReviewDate(
  createdAt: number,
): string {
  return new Date(createdAt).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export const ReviewCard: React.FC<
  ReviewCardProps
> = ({
  review,
  helpful = false,
  onHelpfulPress,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.customerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(review.customerName)}
          </Text>
        </View>

        <View style={styles.customerDetails}>
          <Text
            style={styles.customerName}
            numberOfLines={1}
          >
            {review.customerName}
          </Text>

          <View style={styles.customerMeta}>
            {review.verifiedPurchase ? (
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={COLORS.primary}
                />

                <Text style={styles.verifiedText}>
                  Verified Purchase
                </Text>
              </View>
            ) : null}

            <Text style={styles.dateText}>
              {formatReviewDate(review.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <RatingStars
          rating={review.rating}
          size={17}
        />

        <Text style={styles.ratingNumber}>
          {review.rating.toFixed(1)}
        </Text>
      </View>

      <Text style={styles.reviewTitle}>
        {review.title}
      </Text>

      <Text style={styles.reviewComment}>
        {review.comment}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.helpfulQuestion}>
          Was this review helpful?
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onHelpfulPress}
          style={[
            styles.helpfulButton,
            helpful && styles.helpfulButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mark review as helpful"
        >
          <Ionicons
            name={
              helpful
                ? "thumbs-up"
                : "thumbs-up-outline"
            }
            size={16}
            color={
              helpful
                ? COLORS.primary
                : COLORS.textSecondary
            }
          />

          <Text
            style={[
              styles.helpfulText,
              helpful && styles.helpfulTextActive,
            ]}
          >
            Helpful (
            {review.helpfulCount +
              (helpful ? 1 : 0)}
            )
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },

  customerDetails: {
    flex: 1,
  },

  customerName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  customerMeta: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  verifiedText: {
    fontSize: FONT.size.xs,
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
  },

  dateText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  ratingRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  ratingNumber: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },

  reviewTitle: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  reviewComment: {
    marginTop: 6,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  footer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },

  helpfulQuestion: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  helpfulButton: {
    minHeight: 34,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  helpfulButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  helpfulText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },

  helpfulTextActive: {
    color: COLORS.primary,
  },
});