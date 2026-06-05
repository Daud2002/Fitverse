import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, gradients } from "./theme";

export function Skeleton({ width = "100%", height = 14, radius: r = 8, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: "#E2E5EC", opacity }, style]} />;
}

export function SkeletonCard({ thumb = true, lines = 2 }) {
  return (
    <View style={styles.skelCard}>
      {thumb && <Skeleton width={44} height={44} radius={12} style={{ marginRight: 12 }} />}
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={15} style={{ marginBottom: 8 }} />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} width="85%" height={11} style={{ marginBottom: 6 }} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, thumb = true, lines = 2 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} thumb={thumb} lines={lines} />
      ))}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GradientButton({ title, onPress, loading, colors: g = gradients.primary, style }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={loading} style={style}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, style }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.outlineBtn, style]}>
      <Text style={styles.outlineText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function ProgressBar({ value, max, color = colors.text }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function StatTile({ label, value, tint = "#FEE2E2", children }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>{children}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ScreenTitle({ children }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  btn: { paddingVertical: 16, borderRadius: radius.lg, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  outlineBtn: { paddingVertical: 14, borderRadius: radius.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  outlineText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  track: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: "hidden", marginTop: 8 },
  fill: { height: 8, borderRadius: radius.pill },
  statTile: { flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.lg, padding: spacing.md, margin: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  pill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill },
  pillActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  pillText: { color: colors.textMuted, fontWeight: "600" },
  pillTextActive: { color: colors.text },
  screenTitle: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  skelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 8,
  },
});
