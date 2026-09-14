import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/src/components/EmptyState";
import { ProductCard } from "@/src/components/ProductCard";
import { useToast } from "@/src/components/Toast";
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from "@/src/config/theme";
import { useApp } from "@/src/context/AppContext";
import { useProducts } from "@/src/context/ProductContext";
import { CATEGORIES } from "@/src/data/categories";
import type { Product } from "@/src/types";

const TRENDING_SEARCHES = [
  "Milk",
  "Bread",
  "Rice",
  "Oil",
  "Biscuits",
  "Tea",
  "Soap",
  "Cold Drinks",
];

const SEARCH_ALIASES: Record<string, string> = {
  milc: "Milk",
  melk: "Milk",
  bred: "Bread",
  brad: "Bread",
  biscut: "Biscuits",
  biskit: "Biscuits",
  biskut: "Biscuits",
  oill: "Oil",
  rise: "Rice",
  chawal: "Rice",
  doodh: "Milk",
  dudh: "Milk",
  sabun: "Soap",
  colddrink: "Cold Drinks",
};

interface SearchSuggestion {
  id: string;
  label: string;
  type: "product" | "category" | "keyword";
  product?: Product;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function levenshteinDistance(
  firstValue: string,
  secondValue: string,
): number {
  const first = normalizeText(firstValue);
  const second = normalizeText(secondValue);

  if (!first) return second.length;
  if (!second) return first.length;

  const matrix = Array.from(
    { length: first.length + 1 },
    () => Array(second.length + 1).fill(0),
  );

  for (let row = 0; row <= first.length; row += 1) {
    matrix[row][0] = row;
  }

  for (
    let column = 0;
    column <= second.length;
    column += 1
  ) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= first.length; row += 1) {
    for (
      let column = 1;
      column <= second.length;
      column += 1
    ) {
      const cost =
        first[row - 1] === second[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[first.length][second.length];
}

function getSearchTokens(products: Product[]): string[] {
  const tokens = new Set<string>();

  for (const product of products) {
    normalizeText(product.name)
      .split(" ")
      .filter((token) => token.length >= 3)
      .forEach((token) => tokens.add(token));
  }

  for (const category of CATEGORIES) {
    normalizeText(category.name)
      .split(" ")
      .filter((token) => token.length >= 3)
      .forEach((token) => tokens.add(token));
  }

  for (const keyword of TRENDING_SEARCHES) {
    normalizeText(keyword)
      .split(" ")
      .filter((token) => token.length >= 3)
      .forEach((token) => tokens.add(token));
  }

  return [...tokens];
}

function getClosestToken(
  queryWord: string,
  searchTokens: string[],
): string | null {
  const normalizedWord = normalizeText(queryWord);

  if (!normalizedWord) {
    return null;
  }

  const alias = SEARCH_ALIASES[normalizedWord];

  if (alias) {
    return alias;
  }

  const rankedTokens = searchTokens
    .map((token) => ({
      token,
      distance: levenshteinDistance(
        normalizedWord,
        token,
      ),
    }))
    .sort(
      (first, second) =>
        first.distance - second.distance ||
        first.token.localeCompare(second.token),
    );

  const best = rankedTokens[0];

  if (!best || best.distance === 0) {
    return null;
  }

  const allowedDistance =
    normalizedWord.length <= 4 ? 1 : 2;

  if (best.distance > allowedDistance) {
    return null;
  }

  return best.token;
}

function getCorrectedQuery(
  query: string,
  searchTokens: string[],
): string | null {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return null;
  }

  const directAlias = SEARCH_ALIASES[normalizedQuery];

  if (directAlias) {
    return directAlias;
  }

  const words = normalizedQuery.split(" ");
  let changed = false;

  const correctedWords = words.map((word) => {
    const corrected = getClosestToken(word, searchTokens);

    if (corrected) {
      changed = true;
      return corrected;
    }

    return word;
  });

  if (!changed) {
    return null;
  }

  return correctedWords
    .map((word) =>
      word
        .split(" ")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() +
            part.slice(1),
        )
        .join(" "),
    )
    .join(" ");
}

function getSearchScore(
  product: Product,
  rawQuery: string,
  searchTokens: string[],
): number {
  const query = normalizeText(rawQuery);
  const correctedQuery = normalizeText(
    getCorrectedQuery(rawQuery, searchTokens) ?? rawQuery,
  );

  const name = normalizeText(product.name);
  const size = normalizeText(product.size);
  const description = normalizeText(
    product.description,
  );

  const category = CATEGORIES.find(
    (item) => item.id === product.category,
  );

  const categoryName = normalizeText(
    category?.name ?? "",
  );

  if (!query) {
    return 0;
  }

  let score = 0;

  const queryVariants = Array.from(
    new Set([query, correctedQuery]),
  );

  for (const variant of queryVariants) {
    if (!variant) continue;

    if (name === variant) score += 100;
    if (name.startsWith(variant)) score += 60;
    if (name.includes(variant)) score += 45;

    if (categoryName === variant) score += 40;
    if (categoryName.includes(variant)) score += 30;

    if (size.includes(variant)) score += 12;
    if (description.includes(variant)) score += 8;

    const queryWords = variant.split(" ");
    const nameWords = name.split(" ");

    for (const queryWord of queryWords) {
      for (const nameWord of nameWords) {
        if (nameWord === queryWord) {
          score += 35;
        } else if (nameWord.startsWith(queryWord)) {
          score += 18;
        }

        const distance = levenshteinDistance(
          queryWord,
          nameWord,
        );

        if (
          queryWord.length >= 4 &&
          distance <= 1
        ) {
          score += 24;
        }

        if (
          queryWord.length >= 6 &&
          distance <= 2
        ) {
          score += 14;
        }
      }
    }
  }

  if (product.isPopular) score += 3;
  if (product.isFeatured) score += 2;
  if (product.isBestOffer) score += 2;
  if (product.stock <= 0) score -= 5;

  return score;
}

function smartSearchProducts(
  query: string,
  products: Product[],
  searchTokens: string[],
): Product[] {
  return products
    .map((product) => ({
      product,
      score: getSearchScore(
        product,
        query,
        searchTokens,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.product.name.localeCompare(
          second.product.name,
        ),
    )
    .map(({ product }) => product);
}

export default function SearchScreen() {
  const router = useRouter();
const { voice } = useLocalSearchParams<{
  voice?: string;
}>();

const voiceStartedRef = useRef(false);

  const {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    addToCart,
    updateQuantity,
    getQuantity,
  } = useApp();

  const {
    products,
    loading: productsLoading,
  } = useProducts();

  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const spokenText =
      event.results?.[0]?.transcript?.trim() ?? "";

    if (!spokenText) {
      return;
    }

    setQuery(spokenText);

    const isFinal = event.isFinal;

    if (isFinal) {
      addRecentSearch(spokenText);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);

    if (
      event.error === "aborted" ||
      event.error === "no-speech"
    ) {
      return;
    }

    console.warn(
      "Speech recognition error:",
      event.error,
      event.message,
    );

    showToast(
      "Voice search could not understand you. Please try again.",
      "error",
    );
  });

  const handleVoiceSearch = async () => {
    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }

      Keyboard.dismiss();

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Microphone permission required",
          "Please allow microphone access to use voice search.",
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-IN",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (error) {
      console.warn(
        "Unable to start voice search:",
        error,
      );

      setIsListening(false);

      showToast(
        "Unable to start voice search.",
        "error",
      );
    }
  };

useEffect(() => {
  if (
    voice === "1" &&
    !voiceStartedRef.current
  ) {
    voiceStartedRef.current = true;

    const timer = setTimeout(() => {
      void handleVoiceSearch();
    }, 400);

    return () => clearTimeout(timer);
  }
}, [voice]);
  const normalizedQuery = query.trim();

  const searchTokens = useMemo(
    () => getSearchTokens(products),
    [products],
  );

  const correctedQuery = useMemo(
    () =>
      getCorrectedQuery(
        normalizedQuery,
        searchTokens,
      ),
    [normalizedQuery, searchTokens],
  );

  const results = useMemo(
    () =>
      normalizedQuery
        ? smartSearchProducts(
            normalizedQuery,
            products,
            searchTokens,
          )
        : [],
    [
      normalizedQuery,
      products,
      searchTokens,
    ],
  );

  const suggestions = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.isPopular ||
            product.isFeatured ||
            product.isBestOffer,
        )
        .slice(0, 6),
    [products],
  );

  const liveSuggestions = useMemo<
    SearchSuggestion[]
  >(() => {
    if (!normalizedQuery) {
      return [];
    }

    const suggestionMap = new Map<
      string,
      SearchSuggestion
    >();

    if (
      correctedQuery &&
      normalizeText(correctedQuery) !==
        normalizeText(normalizedQuery)
    ) {
      suggestionMap.set(
        `corrected-${correctedQuery}`,
        {
          id: `corrected-${correctedQuery}`,
          label: correctedQuery,
          type: "keyword",
        },
      );
    }

    results.slice(0, 5).forEach((product) => {
      suggestionMap.set(`product-${product.id}`, {
        id: `product-${product.id}`,
        label: product.name,
        type: "product",
        product,
      });
    });

    CATEGORIES.filter((category) => {
      const categoryName = normalizeText(
        category.name,
      );

      const target = normalizeText(
        correctedQuery ?? normalizedQuery,
      );

      return (
        categoryName.includes(target) ||
        target.includes(categoryName)
      );
    })
      .slice(0, 3)
      .forEach((category) => {
        suggestionMap.set(
          `category-${category.id}`,
          {
            id: `category-${category.id}`,
            label: category.name,
            type: "category",
          },
        );
      });

    TRENDING_SEARCHES.filter((item) => {
      const keyword = normalizeText(item);
      const target = normalizeText(
        correctedQuery ?? normalizedQuery,
      );

      return (
        keyword.includes(target) ||
        target.includes(keyword)
      );
    })
      .slice(0, 3)
      .forEach((item) => {
        suggestionMap.set(`keyword-${item}`, {
          id: `keyword-${item}`,
          label: item,
          type: "keyword",
        });
      });

    return [...suggestionMap.values()].slice(0, 8);
  }, [correctedQuery, normalizedQuery, results]);

  const commit = (value: string) => {
    const cleanValue = value.trim();

    setQuery(cleanValue);

    if (cleanValue) {
      addRecentSearch(cleanValue);
    }
  };

  const goProduct = (product: Product) => {
    router.push({
      pathname: "/product/[id]",
      params: {
        id: product.id,
      },
    });
  };

  const handleSuggestionPress = (
    suggestion: SearchSuggestion,
  ) => {
    commit(suggestion.label);

    if (
      suggestion.type === "product" &&
      suggestion.product
    ) {
      goProduct(suggestion.product);
    }
  };

  const handleAdd = (product: Product) => {
    const result = addToCart(product.id, 1);

    if (!result.ok) {
      showToast(
        result.message ?? "Unable to add",
        "error",
      );
      return;
    }

    showToast("Added to cart", "success");
  };

  const handleIncrement = (
    product: Product,
  ) => {
    const result = updateQuantity(
      product.id,
      getQuantity(product.id) + 1,
    );

    if (!result.ok) {
      showToast(
        result.message ?? "Reached stock limit",
        "error",
      );
    }
  };

  const handleDecrement = (
    product: Product,
  ) => {
    updateQuantity(
      product.id,
      getQuantity(product.id) - 1,
    );
  };

  const renderProduct = ({
    item,
  }: {
    item: Product;
  }) => (
    <View style={styles.productCell}>
      <ProductCard
        product={item}
        quantity={getQuantity(item.id)}
        onPress={() => {
          commit(query);
          goProduct(item);
        }}
        onAdd={() => handleAdd(item)}
        onIncrement={() => handleIncrement(item)}
        onDecrement={() => handleDecrement(item)}
      />
    </View>
  );

  if (productsLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom"]}
      >
        <View style={styles.loadingWrap}>
          <Ionicons
            name="cloud-download-outline"
            size={42}
            color={COLORS.primary}
          />

          <Text style={styles.loadingTitle}>
            Loading products
          </Text>

          <Text style={styles.loadingText}>
            Syncing the latest products, prices and stock from Firebase.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.searchWrap}>
        <TouchableOpacity
          onPress={() => router.back()}
          testID="search-back"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.searchBox,
            isListening && styles.searchBoxListening,
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={COLORS.textSecondary}
          />

          <TextInput
            autoFocus={!isListening}
            placeholder={
              isListening
                ? "Listening..."
                : "Search products, categories..."
            }
            placeholderTextColor={
              isListening
                ? COLORS.primary
                : COLORS.textMuted
            }
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() =>
              commit(correctedQuery ?? query)
            }
            returnKeyType="search"
            testID="search-input"
          />

          {query.length > 0 && !isListening ? (
            <TouchableOpacity
              onPress={() => setQuery("")}
              testID="search-clear"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleVoiceSearch}
            activeOpacity={0.7}
            style={[
              styles.voiceButton,
              isListening &&
                styles.voiceButtonListening,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isListening
                ? "Stop voice search"
                : "Start voice search"
            }
            testID="search-voice"
          >
            <Ionicons
              name={
                isListening
                  ? "stop-circle"
                  : "mic-outline"
              }
              size={21}
              color={
                isListening
                  ? COLORS.surface
                  : COLORS.primary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {isListening ? (
        <View style={styles.listeningBanner}>
          <Ionicons
            name="mic"
            size={17}
            color={COLORS.primary}
          />
          <Text style={styles.listeningText}>
            Listening... say a product name
          </Text>
        </View>
      ) : null}

      {normalizedQuery ? (
        <View style={styles.resultsContainer}>
          {liveSuggestions.length > 0 ? (
            <View style={styles.liveSuggestionsCard}>
              {liveSuggestions.map(
                (suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    activeOpacity={0.75}
                    style={[
                      styles.liveSuggestionRow,
                      index <
                        liveSuggestions.length - 1 &&
                        styles.liveSuggestionDivider,
                    ]}
                    onPress={() =>
                      handleSuggestionPress(
                        suggestion,
                      )
                    }
                  >
                    <View
                      style={styles.suggestionIconWrap}
                    >
                      <Ionicons
                        name={
                          suggestion.id.startsWith(
                            "corrected-",
                          )
                            ? "sparkles-outline"
                            : suggestion.type ===
                                "product"
                              ? "cube-outline"
                              : suggestion.type ===
                                  "category"
                                ? "grid-outline"
                                : "search-outline"
                        }
                        size={16}
                        color={COLORS.primary}
                      />
                    </View>

                    <Text
                      style={styles.liveSuggestionText}
                      numberOfLines={1}
                    >
                      {suggestion.label}
                    </Text>

                    <Ionicons
                      name="arrow-forward-outline"
                      size={16}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                ),
              )}
            </View>
          ) : null}

          {correctedQuery &&
          normalizeText(correctedQuery) !==
            normalizeText(normalizedQuery) ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.correctionBanner}
              onPress={() => commit(correctedQuery)}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={COLORS.primary}
              />

              <Text style={styles.correctionLabel}>
                Showing results for
              </Text>

              <Text style={styles.correctionValue}>
                {correctedQuery}
              </Text>
            </TouchableOpacity>
          ) : null}

          {results.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="search-outline"
                title={`No results for "${query}"`}
                description="Try a different keyword or explore popular searches."
              />

              <View style={styles.emptyTrendingSection}>
                <Text style={styles.sectionTitle}>
                  Popular searches
                </Text>

                <View style={styles.chips}>
                  {TRENDING_SEARCHES.slice(
                    0,
                    6,
                  ).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.chip}
                      onPress={() => commit(item)}
                    >
                      <Ionicons
                        name="trending-up-outline"
                        size={14}
                        color={COLORS.textSecondary}
                      />

                      <Text style={styles.chipText}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>
                  {results.length} result
                  {results.length === 1 ? "" : "s"}
                </Text>

                <Text style={styles.resultSubtitle}>
                  for "{correctedQuery ?? query.trim()}"
                </Text>
              </View>

              <FlatList
                data={results}
                keyExtractor={(product) =>
                  product.id
                }
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                numColumns={2}
                columnWrapperStyle={
                  styles.columnWrapper
                }
                contentContainerStyle={styles.grid}
                ItemSeparatorComponent={() => (
                  <View
                    style={styles.productSeparator}
                  />
                )}
                renderItem={renderProduct}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={(_, index) =>
            `empty-${index}`
          }
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.initialContent}>
              {recentSearches.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Recent searches
                    </Text>

                    <TouchableOpacity
                      onPress={clearRecentSearches}
                      testID="clear-recent"
                    >
                      <Text style={styles.link}>
                        Clear
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.chips}>
                    {recentSearches.map(
                      (recentQuery) => (
                        <TouchableOpacity
                          key={recentQuery}
                          style={styles.chip}
                          onPress={() =>
                            commit(recentQuery)
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={
                              COLORS.textSecondary
                            }
                          />

                          <Text
                            style={styles.chipText}
                          >
                            {recentQuery}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Trending searches
                  </Text>

                  <Ionicons
                    name="trending-up"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.chips}>
                  {TRENDING_SEARCHES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.chip}
                      onPress={() => commit(item)}
                    >
                      <Ionicons
                        name="flame-outline"
                        size={14}
                        color={COLORS.textSecondary}
                      />

                      <Text style={styles.chipText}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                Suggested for you
              </Text>

              <View style={styles.suggestGrid}>
                {suggestions.map((product) => (
                  <View
                    key={product.id}
                    style={styles.suggestionProduct}
                  >
                    <ProductCard
                      product={product}
                      quantity={getQuantity(product.id)}
                      onPress={() =>
                        goProduct(product)
                      }
                      onAdd={() =>
                        handleAdd(product)
                      }
                      onIncrement={() =>
                        handleIncrement(product)
                      }
                      onDecrement={() =>
                        handleDecrement(product)
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  searchBoxListening: {
    borderColor: COLORS.primary,
  },

  input: {
    flex: 1,
    fontSize: FONT.size.base,
    color: COLORS.textPrimary,
    padding: 0,
  },

  voiceButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  voiceButtonListening: {
    backgroundColor: COLORS.primary,
  },

  listeningBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },

  listeningText: {
    color: COLORS.primary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  resultsContainer: {
    flex: 1,
  },

  liveSuggestionsCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  liveSuggestionRow: {
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  liveSuggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  suggestionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },

  liveSuggestionText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },

  correctionBanner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  correctionLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  correctionValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.primary,
  },

  resultHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },

  resultTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  resultSubtitle: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },

  columnWrapper: {
    gap: SPACING.md,
  },

  grid: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  productCell: {
    flex: 1,
  },

  productSeparator: {
    height: SPACING.md,
  },

  emptyWrap: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  emptyTrendingSection: {
    marginTop: SPACING.xl,
  },

  initialContent: {
    padding: SPACING.md,
  },

  sectionBlock: {
    marginBottom: SPACING.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  sectionTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  link: {
    color: COLORS.primary,
    fontWeight: FONT.weight.semibold,
    fontSize: FONT.size.sm,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  chipText: {
    color: COLORS.textPrimary,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },

  suggestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },

  suggestionProduct: {
    width: "48%",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },

  loadingTitle: {
    marginTop: SPACING.md,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.textPrimary,
  },

  loadingText: {
    marginTop: SPACING.sm,
    maxWidth: 300,
    textAlign: "center",
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});