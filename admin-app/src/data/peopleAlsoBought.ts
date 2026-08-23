import type { Product } from "@/src/types";

interface PeopleAlsoBoughtInput {
  currentProduct: Product;
  products: Product[];
  limit?: number;
}

export function getPeopleAlsoBought({
  currentProduct,
  products,
  limit = 6,
}: PeopleAlsoBoughtInput): Product[] {
  const currentPrice = currentProduct.price;

  return products
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        product.stock > 0,
    )
    .map((product) => {
      let score = 0;

      // Similar price range
      const difference = Math.abs(
        product.price - currentPrice,
      );

      if (difference <= 50) score += 8;
      else if (difference <= 100) score += 5;
      else if (difference <= 200) score += 3;

      // Same category
      if (
        product.category ===
        currentProduct.category
      ) {
        score += 5;
      }

      // Popular
      if (product.isPopular) {
        score += 4;
      }

      // Best Offer
      if (product.isBestOffer) {
        score += 3;
      }

      // Featured
      if (product.isFeatured) {
        score += 2;
      }

      return {
        product,
        score,
      };
    })
    .sort(
      (first, second) =>
        second.score - first.score,
    )
    .map((item) => item.product)
    .slice(0, limit);
}