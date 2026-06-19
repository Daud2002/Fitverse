import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, RefreshControl, ActivityIndicator, Alert, Modal, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { Card, ProgressBar, SkeletonList, GradientButton, OutlineButton } from "../../src/components";
import { MealTypePicker, PortionPicker } from "../../src/mealTypePicker";
import { api, API_URL } from "../../src/api";

const PAGE_SIZE = 20;
const HISTORY_DAYS = 7;

const MEAL_ORDER = ["Breakfast", "Brunch", "Lunch", "Dinner", "Snack"];
const MEAL_ICON = { Breakfast: "sunny", Brunch: "cafe", Lunch: "restaurant", Dinner: "moon", Snack: "cafe" };

// "2026-06-19T..." -> "Yesterday" / "Tue, Jun 17"
function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function Food() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [meals, setMeals] = useState([]);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, m, h] = await Promise.all([
        api(`/meals/summary?range=today`),
        api(`/meals?range=today`),
        api(`/meals/history?days=${HISTORY_DAYS}`),
      ]);
      setSummary(s);
      setMeals(m.meals || []);
      // Drop today from the history list — it's already the main summary above.
      setHistory((h.history || []).filter((d) => dayLabel(d.date) !== "Today"));
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const remaining = (summary?.goalCalories || 2000) - (summary?.calories || 0);

  const visible = meals.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));
  const grouped = visible.reduce((acc, m) => {
    (acc[m.mealType] = acc[m.mealType] || []).push(m);
    return acc;
  }, {});
  const groups = MEAL_ORDER.filter((t) => grouped[t]?.length).map((t) => [t, grouped[t]]);
  const rangeLabel = "Today";

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

      <ManualEntry onSaved={onRefresh} />

      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/modal/snap")}>
        <LinearGradient colors={gradients.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.snap}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.snapText}>Snap to Track</Text>
        </LinearGradient>
      </TouchableOpacity>

      <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.summaryCard, { marginTop: 16 }]}>
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

      {history.length > 0 && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.section}><Ionicons name="calendar" size={15} color={colors.primary} /> Previous Days</Text>
          </View>
          {history.map((d) => (
            <HistoryRow key={d.date} day={d} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

// A collapsible row for one past day: totals always visible; tap to lazy-load that day's meals.
function HistoryRow({ day }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      setLoading(true);
      try {
        const iso = day.date.slice(0, 10);
        const { meals } = await api(`/meals?date=${iso}`);
        setItems(meals || []);
      } catch (e) {
        setItems([]);
        console.warn(e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Card style={styles.histCard}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle} style={styles.histHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.histDate}>{dayLabel(day.date)}</Text>
          <Text style={styles.histMeta}>
            P {day.protein}g • C {day.carbs}g • F {day.fat}g • {day.count} {day.count === 1 ? "meal" : "meals"}
          </Text>
        </View>
        <View style={styles.histCalWrap}>
          <Text style={styles.histCal}>{day.calories}</Text>
          <Text style={styles.histCalUnit}>kcal</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {open && (
        <View style={styles.histBody}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
          ) : items && items.length > 0 ? (
            items.map((m) => (
              <View key={m.id} style={styles.histMealRow}>
                <Ionicons name={MEAL_ICON[m.mealType] || "restaurant"} size={15} color={colors.orange} style={{ marginRight: 8 }} />
                <Text style={styles.histMealName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.histMealCal}>{m.calories} cal</Text>
              </View>
            ))
          ) : (
            <Text style={styles.histEmpty}>No meals logged this day.</Text>
          )}
        </View>
      )}
    </Card>
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

// "Manual" button that opens a bottom sheet sliding up from the bottom: a search bar
// over the USDA food catalog with paginated results. Tapping a result shows an add form.
function ManualEntry({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  const run = useCallback(async (q, p) => {
    if (!q.trim()) {
      setItems([]);
      setTotalPages(0);
      return;
    }
    setLoading(true);
    try {
      const data = await api(`/meals/catalog?search=${encodeURIComponent(q.trim())}&page=${p}&pageSize=${PAGE_SIZE}`);
      setItems((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e) {
      Alert.alert("Search failed", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      run(search, 1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search, open, run]);

  function close() {
    setOpen(false);
    setSearch("");
    setItems([]);
    setSelected(null);
  }

  async function handleSaved() {
    close();
    await onSaved?.();
  }

  const canLoadMore = page < totalPages;

  return (
    <>
      <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(true)} style={styles.manualBtn}>
        <Ionicons name="create-outline" size={20} color={colors.primary} />
        <Text style={styles.manualBtnText}>Manual</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.sheetBackdrop} onPress={close} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{selected ? "Add Meal" : "Add Food Manually"}</Text>
              <TouchableOpacity onPress={selected ? () => setSelected(null) : close} hitSlop={8}>
                <Ionicons name={selected ? "arrow-back" : "close"} size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selected ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <CatalogAddForm item={selected} onCancel={() => setSelected(null)} onSaved={handleSaved} />
              </ScrollView>
            ) : (
              <>
                <View style={styles.manualSearch}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    placeholder="Search foods (e.g. biryani, chicken)..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.manualSearchInput}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                  {items.length === 0 && !loading && (
                    <Text style={styles.manualEmpty}>
                      {search.trim() ? "No foods found. Try another search." : "Type a food name to search."}
                    </Text>
                  )}

                  {items.map((item) => (
                    <TouchableOpacity key={item.fdcId} style={styles.catalogRow} activeOpacity={0.8} onPress={() => setSelected(item)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.catalogMeta}>
                          {item.per100g.calories} kcal · P{item.per100g.protein} C{item.per100g.carbs} F{item.per100g.fat} (per 100g)
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  ))}

                  {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

                  {canLoadMore && !loading && (
                    <TouchableOpacity style={styles.loadMore} onPress={() => run(search, page + 1)}>
                      <Text style={styles.loadMoreText}>Load more</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// Inline form shown after picking a catalog item: choose portion + meal type, then save.
function CatalogAddForm({ item, onCancel, onSaved }) {
  const [portion, setPortion] = useState("Medium");
  const [mealType, setMealType] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api("/meals", {
        method: "POST",
        body: { name: item.name, per100g: item.per100g, portion, source: "manual", mealType },
      });
      onSaved();
    } catch (e) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={styles.catalogName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.catalogMeta}>
        {item.per100g.calories} kcal · P{item.per100g.protein} C{item.per100g.carbs} F{item.per100g.fat} (per 100g)
      </Text>

      <Text style={styles.fieldLabel}>Portion size</Text>
      <PortionPicker value={portion} onChange={setPortion} />

      <Text style={styles.fieldLabel}>Meal type</Text>
      <MealTypePicker value={mealType} onChange={setMealType} />

      <View style={styles.formBtnRow}>
        <OutlineButton title="Cancel" onPress={onCancel} style={{ flex: 1, marginRight: 8 }} />
        <GradientButton
          title="✓ Add Meal"
          loading={saving}
          colors={mealType ? gradients.green : ["#9CA3AF", "#9CA3AF"]}
          onPress={mealType ? save : undefined}
          style={{ flex: 1, marginLeft: 8, opacity: mealType ? 1 : 0.7 }}
        />
      </View>
      {!mealType && <Text style={styles.saveHint}>Pick a meal type to save</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 12 },
  search: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECECF2", borderRadius: radius.md, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 10, color: colors.text },
  snap: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: radius.md, marginTop: 12 },
  snapText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 15 },

  manualBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 14, marginTop: 12 },
  manualBtnText: { color: colors.primary, fontWeight: "700", marginLeft: 8, fontSize: 15 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.md, paddingBottom: 28, maxHeight: "85%" },
  sheetHandle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  manualSearch: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECECF2", borderRadius: radius.md, paddingHorizontal: 14 },
  manualSearchInput: { flex: 1, paddingVertical: 11, marginLeft: 10, color: colors.text },
  manualEmpty: { color: colors.textMuted, textAlign: "center", marginTop: 20, marginBottom: 8, fontSize: 13 },
  catalogRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F8FC", borderRadius: radius.md, padding: 12, marginTop: 8 },
  catalogName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  catalogMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  loadMore: { backgroundColor: "#ECECF2", borderRadius: radius.md, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  loadMoreText: { color: colors.primary, fontWeight: "700" },
  fieldLabel: { color: colors.text, fontWeight: "700", fontSize: 14, marginTop: 14, marginBottom: 8 },
  formBtnRow: { flexDirection: "row", marginTop: 16 },
  saveHint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 8 },

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

  histCard: { padding: 0, marginBottom: 8, overflow: "hidden" },
  histHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
  histDate: { fontWeight: "800", color: colors.text, fontSize: 15 },
  histMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  histCalWrap: { alignItems: "center", minWidth: 52 },
  histCal: { color: colors.primary, fontWeight: "800", fontSize: 16 },
  histCalUnit: { color: colors.textMuted, fontSize: 11 },
  histBody: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingVertical: 6 },
  histMealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  histMealName: { flex: 1, color: colors.text, fontSize: 14 },
  histMealCal: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginLeft: 8 },
  histEmpty: { color: colors.textMuted, fontSize: 13, fontStyle: "italic", paddingVertical: 10 },

  emptyWrap: { alignItems: "center", marginTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ECECF2", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 4 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 13 },
});
