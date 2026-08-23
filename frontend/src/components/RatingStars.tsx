import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS } from "@/src/config/theme";

interface RatingStarsProps {
  rating: number;
  size?: number;
  editable?: boolean;
  onChange?: (rating: number) => void;
  gap?: number;
  testID?: string;
}

export const RatingStars: React.FC<
  RatingStarsProps
> = ({
  rating,
  size = 18,
  editable = false,
  onChange,
  gap = 2,
  testID,
}) => {
  const safeRating = Math.min(
    5,
    Math.max(0, rating),
  );

  return (
    <View
      style={[styles.container, { gap }]}
      testID={testID}
      accessibilityRole={
        editable ? "adjustable" : "text"
      }
      accessibilityLabel={`${safeRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = safeRating >= star;
        const isHalf =
          !isFull &&
          safeRating >= star - 0.5;

        const iconName = isFull
          ? "star"
          : isHalf
            ? "star-half"
            : "star-outline";

        if (editable) {
          return (
            <TouchableOpacity
              key={star}
              activeOpacity={0.7}
              onPress={() => onChange?.(star)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} star${
                star > 1 ? "s" : ""
              }`}
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 5,
                right: 5,
              }}
            >
              <Ionicons
                name={iconName}
                size={size}
                color={COLORS.warning ?? "#F5A623"}
              />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={star}
            name={iconName}
            size={size}
            color={COLORS.warning ?? "#F5A623"}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
});