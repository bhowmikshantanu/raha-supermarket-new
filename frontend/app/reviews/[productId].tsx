import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RatingStars } from "@/src/components/RatingStars";
import { ReviewCard } from "@/src/components/ReviewCard";
import {
  COLORS,
  FONT,
  RADIUS,
  SHADOW,
  SPACING,
} from "@/src/config/theme";
import {
  getAllReviewsByProductId,
  getRatingSummary,
  sortReviews,
  type ProductReview,
  type ReviewSortOption,
} from "@/src/data/reviews";
import { getProductById } from "@/src/data/products";

interface SortOption {
  id: ReviewSortOption;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    id: "latest",
    label: "Latest",
  },
  {
    id: "helpful",
    label: "Most Helpful",
  },
  {
    id: "highest",
    label: "Highest",
  },
  {
    id: "lowest",
    label: "Lowest",
  },
];

export default function ProductReviewsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    productId?: string | string[];
    refresh?: string | string[];
  }>();

  const productId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId ?? "";

  const product = getProductById(productId);

  const [reviews, setReviews] = useState<ProductReview[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] =
    useState<ReviewSortOption>("latest");

  const [helpfulReviewIds, setHelpfulReviewIds] =
    useState<string[]>([]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);

      const loadedReviews =
        await getAllReviewsByProductId(productId);

      setReviews(loadedReviews);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      void loadReviews();
    }, [loadReviews]),
  );

  const ratingSummary = useMemo(
    () => getRatingSummary(reviews),
    [reviews],
  );

  const sortedReviews = useMemo(
    () => sortReviews(reviews, sortBy),
    [reviews, sortBy],
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, [router]);

  const handleWriteReview = useCallback(() => {
    router.push({
      pathname: "/reviews/write/[productId]",
      params: {
        productId,
      },
    });
  }, [productId, router]);

  const toggleHelpful = useCallback(
    (reviewId: string) => {
      setHelpfulReviewIds((previous) =>
        previous.includes(reviewId)
          ? previous.filter(
              (id) => id !== reviewId,
            )
          : [...previous, reviewId],
      );
    },
    [],
  );

  const renderReview = useCallback(
    ({ item }: { item: ProductReview }) => (
      <ReviewCard
        review={item}
        helpful={helpfulReviewIds.includes(item.id)}
        onHelpfulPress={() =>
          toggleHelpful(item.id)
        }
      />
    ),
    [helpfulReviewIds, toggleHelpful],
  );

  const renderDistributionRow = (
    rating: 1 | 2 | 3 | 4 | 5,
  ) => {
    const count =
      ratingSummary.distribution[rating];

    const percentage =
      ratingSummary.totalReviews > 0
        ? (count / ratingSummary.totalReviews) *
          100
        : 0;

    return (
      <View
        key={rating}
        style={styles.distributionRow}
      >
        <Text style={styles.distributionLabel}>
          {rating}
        </Text>

        <Ionicons
          name="star"
          size={13}
          color="#F5A623"
        />

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.distributionCount}>
          {count}
        </Text>
      </View>
    );
  };

  const listHeader = (
    <>
      <View style={styles.productSection}>
        <Text
          style={styles.productName}
          numberOfLines={2}
        >
          {product?.name ?? "Product Reviews"}
        </Text>

        {product?.size ? (
          <Text style={styles.productSize}>
            {product.size}
          </Text>
        ) : null}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.averageSection}>
          <Text style={styles.averageRating}>
            {ratingSummary.averageRating.toFixed(1)}
          </Text>

          <RatingStars
            rating={ratingSummary.averageRating}
            size={20}
          />

          <Text style={styles.totalReviews}>
            Based on {ratingSummary.totalReviews}{" "}
            review
            {ratingSummary.totalReviews === 1
              ? ""
              : "s"}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.distributionSection}>
          {([5, 4, 3, 2, 1] as const).map(
            renderDistributionRow,
          )}
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={handleWriteReview}
        style={styles.writeReviewButton}
        accessibilityRole="button"
        accessibilityLabel="Write a product review"
      >
        <View style={styles.writeReviewIcon}>
          <Ionicons
            name="create-outline"
            size={22}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.writeReviewContent}>
          <Text style={styles.writeReviewTitle}>
            Write a Review
          </Text>

          <Text style={styles.writeReviewSubtitle}>
            Share your experience with other customers
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={21}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewHeading}>
            Customer Reviews
          </Text>

          <Text style={styles.reviewSubtitle}>
            Genuine feedback from Raha customers
          </Text>
        </View>
      </View>

      <FlatList
        data={SORT_OPTIONS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortList}
        renderItem={({ item }) => {
          const isSelected = sortBy === item.id;

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSortBy(item.id)}
              style={[
                styles.sortButton,
                isSelected &&
                  styles.sortButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  isSelected &&
                    styles.sortButtonTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerButton}
            onPress={handleBack}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              Ratings & Reviews
            </Text>

            <Text style={styles.headerSubtitle}>
              What customers are saying
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading reviews...
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
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerButton}
          onPress={handleBack}
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
            Ratings & Reviews
          </Text>

          <Text style={styles.headerSubtitle}>
            What customers are saying
          </Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={sortedReviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={38}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No reviews yet
            </Text>

            <Text style={styles.emptyMessage}>
              Be the first customer to review this
              product.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleWriteReview}
              style={styles.emptyWriteButton}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={COLORS.textOnPrimary}
              />

              <Text style={styles.emptyWriteButtonText}>
                Write First Review
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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

  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  productSection: {
    paddingTop: SPACING.lg,
  },

  productName: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  productSize: {
    marginTop: 4,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  summaryCard: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: "row",
    ...SHADOW.card,
  },

  averageSection: {
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
    paddingRight: SPACING.md,
  },

  averageRating: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: FONT.weight.heavy,
    color: COLORS.textPrimary,
  },

  totalReviews: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },

  distributionSection: {
    flex: 1,
    paddingLeft: SPACING.md,
    justifyContent: "center",
    gap: 7,
  },

  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  distributionLabel: {
    width: 14,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  progressTrack: {
    flex: 1,
    height: 7,
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.borderLight,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: "#F5A623",
  },

  distributionCount: {
    width: 22,
    textAlign: "right",
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  writeReviewButton: {
    marginTop: SPACING.lg,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOW.card,
  },

  writeReviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    marginRight: SPACING.md,
  },

  writeReviewContent: {
    flex: 1,
  },

  writeReviewTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  writeReviewSubtitle: {
    marginTop: 4,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  reviewHeader: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reviewHeading: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  reviewSubtitle: {
    marginTop: 3,
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
  },

  sortList: {
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    gap: SPACING.sm,
  },

  sortButton: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  sortButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },

  sortButtonText: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT.weight.semibold,
  },

  sortButtonTextSelected: {
    color: COLORS.primary,
  },

  separator: {
    height: SPACING.md,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  emptyMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },

  emptyWriteButton: {
    marginTop: SPACING.lg,
    minHeight: 46,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
  },

  emptyWriteButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});