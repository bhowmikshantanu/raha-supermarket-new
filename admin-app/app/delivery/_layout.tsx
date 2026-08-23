import { Stack } from "expo-router";
import React from "react";

export default function DeliveryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Independent from admin/customer stacks so we don't
        // accidentally alter their behaviour.
      }}
    />
  );
}
