import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/Button";
import { RatingStars } from "@/src/components/RatingStars";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { getProductById } from "@/src/data/products";
import {
  saveCustomerReview,
  type ProductReview,
} from "@/src/data/reviews";

const MAX_TITLE_LENGTH = 80;
const MAX_COMMENT_LENGTH = 500;

export default function WriteReviewScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    productId?: string | string[];
  }>();

  const productId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId ?? "";

  const product = getProductById(productId);

  const { user, orders } = useApp();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const customerName =
    user?.name?.trim() ||
    (user?.isGuest ? "Guest Customer" : "Customer");

  const verifiedPurchase = useMemo(
    () =>
      orders.some(
        (order) =>
          order.status === "delivered" &&
          order.items.some(
            (item) => item.productId === productId,
          ),
      ),
    [orders, productId],
  );

  const titleLength = title.trim().length;
  const commentLength = comment.trim().length;

  const canSubmit =
    rating > 0 &&
    titleLength >= 3 &&
    commentLength >= 10 &&
    !submitting;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/reviews/[productId]",
      params: {
        productId,
      },
    });
  }, [productId, router]);

  const handleSubmit = useCallback(async () => {
    const cleanTitle = title.trim();
    const cleanComment = comment.trim();

    if (rating < 1 || rating > 5) {
      showToast(
        "Please select a rating between 1 and 5 stars.",
        "error",
      );
      return;
    }

    if (cleanTitle.length < 3) {
      showToast(
        "Please enter a short review title.",
        "error",
      );
      return;
    }

    if (cleanComment.length < 10) {
      showToast(
        "Please write at least 10 characters about the product.",
        "error",
      );
      return;
    }

    if (!product) {
      showToast("Product not found.", "error");
      return;
    }

    try {
      setSubmitting(true);

      const review: ProductReview = {
        id: `customer-review-${Date.now()}`,
        productId: product.id,
        customerName,
        rating,
        title: cleanTitle,
        comment: cleanComment,
        createdAt: Date.now(),
        verifiedPurchase,
        helpfulCount: 0,
      };

      await saveCustomerReview(review);

      showToast(
        "Your review has been submitted.",
        "success",
      );

      router.replace({
        pathname: "/reviews/[productId]",
        params: {
          productId: product.id,
          refresh: Date.now().toString(),
        },
      });
    } catch {
      showToast(
        "Unable to submit your review. Please try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    comment,
    customerName,
    product,
    rating,
    router,
    showToast,
    title,
    verifiedPurchase,
  ]);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Write a Review
          </Text>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.notFoundContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={54}
            color={COLORS.textSecondary}
          />

          <Text style={styles.notFoundTitle}>
            Product not found
          </Text>

          <Text style={styles.notFoundMessage}>
            This product may have been removed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBack}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              Write a Review
            </Text>

            <Text style={styles.headerSubtitle}>
              Share your product experience
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.productCard}>
            <View style={styles.productIcon}>
              <Ionicons
                name="cube-outline"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.productDetails}>
              <Text
                style={styles.productName}
                numberOfLines={2}
              >
                {product.name}
              </Text>

              <Text style={styles.productSize}>
                {product.size}
              </Text>
            </View>

            {verifiedPurchase ? (
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={COLORS.primary}
                />

                <Text style={styles.verifiedText}>
                  Verified
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              How would you rate this product?
            </Text>

            <Text style={styles.sectionDescription}>
              Tap a star to select your rating.
            </Text>

            <View style={styles.ratingContainer}>
              <RatingStars
                rating={rating}
                editable
                onChange={setRating}
                size={38}
                gap={9}
                testID="write-review-rating"
              />

              <Text style={styles.ratingLabel}>
                {rating === 0
                  ? "Select rating"
                  : rating === 1
                    ? "Poor"
                    : rating === 2
                      ? "Fair"
                      : rating === 3
                        ? "Good"
                        : rating === 4
                          ? "Very Good"
                          : "Excellent"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>
                Review title
              </Text>

              <Text style={styles.characterCount}>
                {title.length}/{MAX_TITLE_LENGTH}
              </Text>
            </View>

            <TextInput
              value={title}
              onChangeText={(value) =>
                setTitle(
                  value.slice(0, MAX_TITLE_LENGTH),
                )
              }
              placeholder="Summarize your experience"
              placeholderTextColor={COLORS.textMuted}
              style={styles.titleInput}
              returnKeyType="next"
              maxLength={MAX_TITLE_LENGTH}
              testID="review-title-input"
            />

            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>
                Your review
              </Text>

              <Text style={styles.characterCount}>
                {comment.length}/{MAX_COMMENT_LENGTH}
              </Text>
            </View>

            <TextInput
              value={comment}
              onChangeText={(value) =>
                setComment(
                  value.slice(
                    0,
                    MAX_COMMENT_LENGTH,
                  ),
                )
              }
              placeholder="What did you like or dislike about this product?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              style={styles.commentInput}
              maxLength={MAX_COMMENT_LENGTH}
              testID="review-comment-input"
            />

            <View style={styles.tipBox}>
              <Ionicons
                name="bulb-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text style={styles.tipText}>
                Mention product quality, freshness,
                packaging and value for money.
              </Text>
            </View>
          </View>

          <View style={styles.guidelinesCard}>
            <Text style={styles.guidelinesTitle}>
              Review guidelines
            </Text>

            <View style={styles.guidelineRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text style={styles.guidelineText}>
                Share your honest product experience.
              </Text>
            </View>

            <View style={styles.guidelineRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text style={styles.guidelineText}>
                Avoid phone numbers or personal details.
              </Text>
            </View>

            <View style={styles.guidelineRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={COLORS.primary}
              />

              <Text style={styles.guidelineText}>
                Keep the language respectful and helpful.
              </Text>
            </View>
          </View>

          <Button
            label={
              submitting
                ? "Submitting..."
                : "Submit Review"
            }
            onPress={handleSubmit}
            fullWidth
            size="lg"
            disabled={!canSubmit}
            testID="submit-review-button"
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (
                rating > 0 ||
                title.trim() ||
                comment.trim()
              ) {
                Alert.alert(
                  "Discard review?",
                  "Your entered review details will be lost.",
                  [
                    {
                      text: "Keep Editing",
                      style: "cancel",
                    },
                    {
                      text: "Discard",
                      style: "destructive",
                      onPress: handleBack,
                    },
                  ],
                );

                return;
              }

              handleBack();
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },

  headerTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    marginRight: SPACING.md,
  },

  productDetails: {
    flex: 1,
  },

  productName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  productSize: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primaryLight,
  },

  verifiedText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.primary,
  },

  formCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.card,
  },

  sectionTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  sectionDescription: {
    marginTop: 4,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  ratingContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },

  ratingLabel: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: ratingTextColor(),
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },

  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },

  inputLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  characterCount: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  titleInput: {
    minHeight: 50,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    marginBottom: SPACING.lg,
  },

  commentInput: {
    minHeight: 150,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    fontSize: FONT.size.md,
    lineHeight: 22,
  },

  tipBox: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
  },

  tipText: {
    flex: 1,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  guidelinesCard: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  guidelinesTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  guidelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  guidelineText: {
    flex: 1,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: SPACING.sm,
  },

  cancelButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textSecondary,
  },

  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },

  notFoundTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  notFoundMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});

function ratingTextColor(): string {
  return "#F5A623";
}