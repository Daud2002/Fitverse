import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth";
import { MaintenanceGate } from "../src/maintenance";
import { colors, spacing } from "../src/theme";
import { Skeleton, SkeletonList } from "../src/components";

function RoutingGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inApp = ["(tabs)", "workout", "modal", "profile"].includes(segments[0]);
    if (!user && inApp) router.replace("/login");
    else if (user && (segments[0] === "login" || segments[0] === "register" || segments[0] === "onboarding" || segments.length === 0)) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md, paddingTop: 72 }}>
        <Skeleton width="50%" height={26} radius={8} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={120} radius={16} style={{ marginBottom: 20 }} />
        <SkeletonList count={4} thumb lines={2} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/[id]" />
      <Stack.Screen name="modal/sos" options={{ presentation: "modal" }} />
      <Stack.Screen name="modal/snap" options={{ presentation: "modal" }} />
      <Stack.Screen name="modal/mood" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <MaintenanceGate>
          <RoutingGate />
        </MaintenanceGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
