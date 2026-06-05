import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { Card, ProgressBar, SkeletonList } from "../../src/components";
import { api, API_URL } from "../../src/api";

const RANGES = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MEAL_ICON = { Breakfast: "sunny", Lunch: "restaurant", Dinner: "moon", Snack: "cafe" };

export default function Food() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [range, setRange] = useState("today");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (selectedRange) => {
    try {
      const [s, m] = await Promise.all([
        api(`/meals/summary?range=${selectedRange}`),
        api(`/meals?range=${selectedRange}`),
      ]);
      setSummary(s);
      setMeals(m.meals || []);
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load(range).finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [load, range])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load(range);
    setRefreshing(false);
  }

  const remaining = (summary?.goalCalories || 2000) - (summary?.calories || 0);

  const visible = meals.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));
  const grouped = visible.reduce((acc, m) => {
    (acc[m.mealType] = acc[m.mealType] || []).push(m);
    return acc;
  }, {});
  const groups = MEAL_ORDER.filter((t) => grouped[t]?.length).map((t) => [t, grouped[t]]);
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || "Today";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: 56, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.h}>Food Log</Text>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search foods..."
          style={styles.searchInput}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/modal/snap")}>
        <LinearGradient colors={gradients.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.snap}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.snapText}>Snap to Track</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.rangeBar}>
        {RANGES.map((r) => {
          const active = range === r.value;
          return (
            <TouchableOpacity
              key={r.value}
              activeOpacity={0.8}
              onPress={() => setRange(r.value)}
              style={[styles.rangeTab, active && styles.rangeTabActive]}
            >
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
        <View style={styles.calRow}>
          <View>
            <Text style={styles.summaryLabel}>{rangeLabel} • Calories</Text>
            <Text style={styles.calVal}>
              {summary?.calories || 0}
              <Text style={styles.calGoal}> / {summary?.goalCalories || 2000} kcal</Text>
            </Text>
          </View>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingNum}>{Math.max(0, remaining)}</Text>
            <Text style={styles.remainingUnit}>left</Text>
          </View>
        </View>
        <ProgressBar value={summary?.calories || 0} max={summary?.goalCalories || 2000} color="#fff" />

        <View style={styles.macros}>
          <Macro label="Protein" value={`${Math.round(summary?.protein || 0)}g`} />
          <Macro label="Carbs" value={`${Math.round(summary?.carbs || 0)}g`} />
          <Macro label="Fat" value={`${Math.round(summary?.fat || 0)}g`} />
        </View>
      </LinearGradient>

      <View style={styles.listHeader}>
        <Text style={styles.section}><Ionicons name={"restaurant"} size={15} color={colors.primary} />Meals</Text>
        {visible.length > 0 && <Text style={styles.count}>{visible.length} logged</Text>}
      </View>

      {loading ? (
        <SkeletonList count={4} thumb lines={2} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name={query ? "search" : "restaurant-outline"} size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>
            {query ? "No matching meals" : `No meals logged ${rangeLabel === "Today" ? "today" : `this ${rangeLabel.toLowerCase()}`}`}
          </Text>
          <Text style={styles.emptyText}>
            {query ? "Try a different search." : "Tap “Snap to Track” to log your first meal."}
          </Text>
        </View>
      ) : (
        groups.map(([type, items]) => (
          <View key={type} style={{ marginBottom: 18 }}>
            {items.map((m) => (
              <Card key={m.id} style={styles.mealCard}>
                {m.imageUrl ? (
                  <Image source={{ uri: `${API_URL}${m.imageUrl}` }} style={styles.mealImage} />
                ) : (
                  <View style={styles.mealIcon}><Ionicons name="restaurant" size={18} color={colors.orange} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.mealMeta}>P {m.protein}g • C {m.carbs}g • F {m.fat}g</Text>
                </View>
                <View style={styles.calBadge}>
                  <Text style={styles.calBadgeNum}>{m.calories}</Text>
                  <Text style={styles.calBadgeUnit}>cal</Text>
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Macro({ label, value }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroVal}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 12 },
  search: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECECF2", borderRadius: radius.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 10, color: colors.text },
  snap: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: radius.md, marginTop: 12 },
  snapText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 15 },

  rangeBar: { flexDirection: "row", backgroundColor: "#ECECF2", borderRadius: radius.pill, padding: 4, marginTop: 16 },
  rangeTab: { flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: "center" },
  rangeTabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  rangeText: { color: colors.textMuted, fontWeight: "600", fontSize: 14 },
  rangeTextActive: { color: colors.primary, fontWeight: "800" },

  summaryCard: { borderRadius: radius.lg, padding: spacing.md, marginTop: 14 },
  calRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  summaryLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  calVal: { color: "#fff", fontSize: 24, fontWeight: "800" },
  calGoal: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" },
  remainingBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  remainingNum: { color: "#fff", fontWeight: "800", fontSize: 18 },
  remainingUnit: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
  macros: { flexDirection: "row", marginTop: 16 },
  macro: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.md, padding: 12, marginHorizontal: 3, alignItems: "center" },
  macroVal: { fontSize: 18, fontWeight: "800", color: "#fff" },
  macroLabel: { fontSize: 12, marginTop: 2, color: "rgba(255,255,255,0.85)" },

  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 },
  section: { fontSize: 18, fontWeight: "800", color: colors.text },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },

  mealTypeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  mealType: { fontWeight: "800", color: colors.text, fontSize: 15, marginLeft: 6 },
  mealTypeCal: { marginLeft: "auto", color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  mealCard: { flexDirection: "row", alignItems: "center", marginBottom: 8, padding: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFEDD5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  mealImage: { width: 44, height: 44, borderRadius: 12, marginRight: 12, backgroundColor: "#FFEDD5" },
  mealName: { fontWeight: "700", color: colors.text, fontSize: 15 },
  mealMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  calBadge: { alignItems: "center", marginLeft: 8, minWidth: 48 },
  calBadgeNum: { color: colors.text, fontWeight: "800", fontSize: 16 },
  calBadgeUnit: { color: colors.textMuted, fontSize: 11 },

  emptyWrap: { alignItems: "center", marginTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ECECF2", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 4 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 13 },
});
