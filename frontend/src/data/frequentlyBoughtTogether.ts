import type { Product } from "@/src/types";

interface FrequentlyBoughtTogetherInput {
  currentProduct: Product;
  products: Product[];
  limit?: number;
}

export function getFrequentlyBoughtTogether({
  currentProduct,
  products,
  limit = 3,
}: FrequentlyBoughtTogetherInput): Product[] {
  const sameCategoryProducts = products
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        product.category === currentProduct.category &&
        product.stock > 0,
    )
    .sort((first, second) => {
      const firstScore =
        Number(first.isPopular) * 3 +
        Number(first.isBestOffer) * 2 +
        Number(first.isFeatured);

      const secondScore =
        Number(second.isPopular) * 3 +
        Number(second.isBestOffer) * 2 +
        Number(second.isFeatured);

      return (
        secondScore - firstScore ||
        first.price - second.price
      );
    });

  const complementaryProducts = products
    .filter(
      (product) =>
        product.id !== currentProduct.id &&
        product.category !== currentProduct.category &&
        product.stock > 0,
    )
    .sort((first, second) => {
      const firstScore =
        Number(first.isPopular) * 3 +
        Number(first.isBestOffer) * 2 +
        Number(first.isFeatured);

      const secondScore =
        Number(second.isPopular) * 3 +
        Number(second.isBestOffer) * 2 +
        Number(second.isFeatured);

      return (
        secondScore - firstScore ||
        first.price - second.price
      );
    });

  const combined = [
    ...sameCategoryProducts,
    ...complementaryProducts,
  ];

  const uniqueProducts = combined.filter(
    (product, index, array) =>
      array.findIndex(
        (item) => item.id === product.id,
      ) === index,
  );

  return uniqueProducts.slice(0, limit);
}