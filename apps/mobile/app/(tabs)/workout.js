import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { colors, spacing, radius } from "../../src/theme";
import { Card, Pill, ScreenTitle, GradientButton, SkeletonList } from "../../src/components";
import { api } from "../../src/api";

const CATEGORIES = ["All", "Cardio", "Strength", "Flexibility"];
const LEVEL_COLOR = { easy: colors.green, medium: colors.orange, hard: colors.red };

export default function Workout() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (category) => {
    try {
      const d = await api(`/workouts?category=${category}`);
      setWorkouts(d.workouts);
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load(cat).finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [cat, load])
  );

  async function generate() {
    setGenerating(true);
    try {
      const { workout, source } = await api("/workouts/generate", { method: "POST" });
      Alert.alert("AI plan ready", `${workout.name} (${source}) created from your profile.`);
      load(cat);
      router.push(`/workout/${workout.id}`);
    } catch (e) {
      Alert.alert("Could not generate", e.message);
    } finally {
      setGenerating(false);
    }
  }

  const filtered = workouts.filter((w) => w.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingTop: 56 }}>
      <ScreenTitle>Workouts</ScreenTitle>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput placeholder="Search workouts..." value={q} onChangeText={setQ} style={styles.searchInput} placeholderTextColor={colors.textMuted} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {CATEGORIES.map((c) => (
          <Pill key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonList count={4} thumb={false} lines={3} />
      ) : (
        <>
          {filtered.map((w) => (
            <TouchableOpacity key={w.id} onPress={() => router.push(`/workout/${w.id}`)}>
              <Card style={styles.wCard}>
                <View style={[styles.badge, { backgroundColor: LEVEL_COLOR[w.level] || colors.green }]}>
                  <Text style={styles.badgeText}>{w.level}</Text>
                </View>
                <Text style={styles.wName}>{w.name}{w.isAiGenerated ? "  🤖" : ""}</Text>
                <View style={styles.metaRow}>
                  <Meta icon="time-outline" text={`${w.durationMin} min`} />
                  <Meta icon="flame-outline" text={`${w.caloriesEst} cal`} />
                  <Meta icon="barbell-outline" text={`${w.exercises.length} exercises`} />
                </View>
                <Meta icon="pricetag-outline" text={w.category} />
              </Card>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && <Text style={styles.empty}>No workouts found.</Text>}
        </>
      )}
    </ScrollView>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECECF2", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 4 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 10, color: colors.text },
  wCard: { marginBottom: 14 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.sm, marginBottom: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  wName: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap" },
  meta: { flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 4 },
  metaText: { color: colors.textMuted, marginLeft: 5, fontSize: 13 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
