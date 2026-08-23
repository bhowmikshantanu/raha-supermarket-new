export type ReviewSortOption =
  | "latest"
  | "highest"
  | "lowest"
  | "helpful";

export interface ProductReview {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: number;
  verifiedPurchase: boolean;
  helpfulCount: number;
  isHelpful?: boolean;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

const DAY = 24 * 60 * 60 * 1000;

export const REVIEWS: ProductReview[] = [
  {
    id: "review-001",
    productId: "1",
    customerName: "Priya Sharma",
    rating: 5,
    title: "Excellent quality",
    comment:
      "The product was fresh and properly packed. Delivery was also quick. I will definitely order it again.",
    createdAt: Date.now() - DAY * 2,
    verifiedPurchase: true,
    helpfulCount: 18,
  },
  {
    id: "review-002",
    productId: "1",
    customerName: "Amit Kumar",
    rating: 4,
    title: "Good product",
    comment:
      "Quality is good and the price is reasonable. Packaging could have been slightly better.",
    createdAt: Date.now() - DAY * 7,
    verifiedPurchase: true,
    helpfulCount: 9,
  },
  {
    id: "review-003",
    productId: "1",
    customerName: "Neha Verma",
    rating: 5,
    title: "Worth buying",
    comment:
      "Received the same product as shown in the app. Fresh stock and fast delivery.",
    createdAt: Date.now() - DAY * 12,
    verifiedPurchase: true,
    helpfulCount: 12,
  },
  {
    id: "review-004",
    productId: "2",
    customerName: "Rahul Singh",
    rating: 4,
    title: "Nice and fresh",
    comment:
      "The product quality was good. Raha Supermarket delivered it on time.",
    createdAt: Date.now() - DAY * 4,
    verifiedPurchase: true,
    helpfulCount: 7,
  },
  {
    id: "review-005",
    productId: "2",
    customerName: "Pooja Das",
    rating: 5,
    title: "Very satisfied",
    comment:
      "Great quality and neat packaging. The product was completely fresh.",
    createdAt: Date.now() - DAY * 10,
    verifiedPurchase: true,
    helpfulCount: 11,
  },
  {
    id: "review-006",
    productId: "3",
    customerName: "Suman Roy",
    rating: 3,
    title: "Average experience",
    comment:
      "The product was fine, but the packaging needs improvement.",
    createdAt: Date.now() - DAY * 5,
    verifiedPurchase: true,
    helpfulCount: 3,
  },
  {
    id: "review-007",
    productId: "3",
    customerName: "Anjali Gupta",
    rating: 5,
    title: "Highly recommended",
    comment:
      "Very good product at a fair price. I am happy with the purchase.",
    createdAt: Date.now() - DAY * 15,
    verifiedPurchase: true,
    helpfulCount: 14,
  },
];

export function getReviewsByProductId(
  productId: string,
): ProductReview[] {
  return REVIEWS.filter(
    (review) => review.productId === productId,
  );
}

export function getRatingSummary(
  reviews: ProductReview[],
): RatingSummary {
  const distribution: RatingSummary["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution,
    };
  }

  let ratingTotal = 0;

  for (const review of reviews) {
    const normalizedRating = Math.min(
      5,
      Math.max(1, Math.round(review.rating)),
    ) as 1 | 2 | 3 | 4 | 5;

    distribution[normalizedRating] += 1;
    ratingTotal += normalizedRating;
  }

  return {
    averageRating:
      Math.round(
        (ratingTotal / reviews.length) * 10,
      ) / 10,
    totalReviews: reviews.length,
    distribution,
  };
}

export function sortReviews(
  reviews: ProductReview[],
  sortBy: ReviewSortOption,
): ProductReview[] {
  const copiedReviews = [...reviews];

  switch (sortBy) {
    case "highest":
      return copiedReviews.sort(
        (first, second) =>
          second.rating - first.rating ||
          second.createdAt - first.createdAt,
      );

    case "lowest":
      return copiedReviews.sort(
        (first, second) =>
          first.rating - second.rating ||
          second.createdAt - first.createdAt,
      );

    case "helpful":
      return copiedReviews.sort(
        (first, second) =>
          second.helpfulCount -
            first.helpfulCount ||
          second.createdAt - first.createdAt,
      );

    case "latest":
    default:
      return copiedReviews.sort(
        (first, second) =>
          second.createdAt - first.createdAt,
      );
  }
}
import { storage } from "@/src/utils/storage";

const K_CUSTOMER_REVIEWS =
  "raha.customerReviews.v1";

export async function getCustomerReviews(): Promise<
  ProductReview[]
> {
  try {
    const savedReviews =
      await storage.getItem<string>(
        K_CUSTOMER_REVIEWS,
        "",
      );

    if (!savedReviews) {
      return [];
    }

    const parsedReviews = JSON.parse(
      savedReviews,
    ) as ProductReview[];

    return Array.isArray(parsedReviews)
      ? parsedReviews
      : [];
  } catch {
    return [];
  }
}

export async function saveCustomerReview(
  review: ProductReview,
): Promise<void> {
  const existingReviews =
    await getCustomerReviews();

  const withoutPreviousCustomerReview =
    existingReviews.filter(
      (existingReview) =>
        !(
          existingReview.productId ===
            review.productId &&
          existingReview.customerName ===
            review.customerName
        ),
    );

  const updatedReviews = [
    review,
    ...withoutPreviousCustomerReview,
  ];

  await storage.setItem(
    K_CUSTOMER_REVIEWS,
    JSON.stringify(updatedReviews),
  );
}

export async function getAllReviewsByProductId(
  productId: string,
): Promise<ProductReview[]> {
  const customerReviews =
    await getCustomerReviews();

  const defaultReviews =
    getReviewsByProductId(productId);

  return [
    ...customerReviews.filter(
      (review) =>
        review.productId === productId,
    ),
    ...defaultReviews,
  ];
}