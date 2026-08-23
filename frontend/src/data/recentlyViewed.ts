import { storage } from "@/src/utils/storage";

const K_RECENTLY_VIEWED =
  "raha.recentlyViewed.v1";

const MAX_RECENT_PRODUCTS = 12;

export async function getRecentlyViewedProductIds(): Promise<
  string[]
> {
  try {
    const saved = await storage.getItem<string>(
      K_RECENTLY_VIEWED,
      "",
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (productId): productId is string =>
        typeof productId === "string",
    );
  } catch {
    return [];
  }
}

export async function addRecentlyViewedProduct(
  productId: string,
): Promise<string[]> {
  const cleanProductId = productId.trim();

  if (!cleanProductId) {
    return getRecentlyViewedProductIds();
  }

  const current =
    await getRecentlyViewedProductIds();

  const updated = [
    cleanProductId,
    ...current.filter(
      (existingId) =>
        existingId !== cleanProductId,
    ),
  ].slice(0, MAX_RECENT_PRODUCTS);

  await storage.setItem(
    K_RECENTLY_VIEWED,
    JSON.stringify(updated),
  );

  return updated;
}

export async function removeRecentlyViewedProduct(
  productId: string,
): Promise<string[]> {
  const current =
    await getRecentlyViewedProductIds();

  const updated = current.filter(
    (existingId) => existingId !== productId,
  );

  await storage.setItem(
    K_RECENTLY_VIEWED,
    JSON.stringify(updated),
  );

  return updated;
}

export async function clearRecentlyViewedProducts(): Promise<void> {
  await storage.setItem(
    K_RECENTLY_VIEWED,
    JSON.stringify([]),
  );
}