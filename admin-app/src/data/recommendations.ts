import type { CartItem, Product } from "@/src/types";

interface RecommendationInput {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  recentlyViewedIds: string[];
  limit?: number;
}

function getInterestScore(
  product: Product,
  cartCategoryIds: Set<string>,
  wishlistCategoryIds: Set<string>,
  viewedCategoryIds: Set<string>,
  cartProductIds: Set<string>,
  wishlistProductIds: Set<string>,
  viewedProductIds: Set<string>,
): number {
  let score = 0;

  // Exact products get the highest priority.
  if (cartProductIds.has(product.id)) {
    score += 20;
  }

  if (wishlistProductIds.has(product.id)) {
    score += 15;
  }

  if (viewedProductIds.has(product.id)) {
    score += 8;
  }

  // Similar-category products are recommended next.
  if (cartCategoryIds.has(product.category)) {
    score += 5;
  }

  if (wishlistCategoryIds.has(product.category)) {
    score += 4;
  }

  if (viewedCategoryIds.has(product.category)) {
    score += 3;
  }

  // Product quality and merchandising signals.
  if (product.isBestOffer) {
    score += 3;
  }

  if (product.isPopular) {
    score += 2;
  }

  if (product.isFeatured) {
    score += 1;
  }

  // Better discounts receive a small additional boost.
  const discountPercent =
    product.mrp > 0 && product.mrp > product.price
      ? ((product.mrp - product.price) /
          product.mrp) *
        100
      : 0;

  score += Math.min(
    3,
    discountPercent / 10,
  );

  // Never recommend unavailable products.
  if (product.stock <= 0) {
    score -= 1000;
  }

  return score;
}

export function getRecommendedProducts({
  products,
  cart,
  wishlist,
  recentlyViewedIds,
  limit = 10,
}: RecommendationInput): Product[] {
  const cartProductIds = new Set(
    cart.map((item) => item.productId),
  );

  const wishlistProductIds = new Set(
    wishlist,
  );

  const viewedProductIds = new Set(
    recentlyViewedIds,
  );

  const cartCategoryIds = new Set(
    products
      .filter((product) =>
        cartProductIds.has(product.id),
      )
      .map((product) => product.category),
  );

  const wishlistCategoryIds = new Set(
    products
      .filter((product) =>
        wishlistProductIds.has(product.id),
      )
      .map((product) => product.category),
  );

  const viewedCategoryIds = new Set(
    products
      .filter((product) =>
        viewedProductIds.has(product.id),
      )
      .map((product) => product.category),
  );

  const rankedProducts = products
    .map((product) => ({
      product,
      score: getInterestScore(
        product,
        cartCategoryIds,
        wishlistCategoryIds,
        viewedCategoryIds,
        cartProductIds,
        wishlistProductIds,
        viewedProductIds,
      ),
    }))
    .filter(
      ({ product }) => product.stock > 0,
    )
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      const popularityDifference =
        Number(second.product.isPopular) -
        Number(first.product.isPopular);

      if (popularityDifference !== 0) {
        return popularityDifference;
      }

      const offerDifference =
        Number(second.product.isBestOffer) -
        Number(first.product.isBestOffer);

      if (offerDifference !== 0) {
        return offerDifference;
      }

      return first.product.name.localeCompare(
        second.product.name,
      );
    })
    .map(({ product }) => product);

  return rankedProducts.slice(0, limit);
}