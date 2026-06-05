import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { Card, StatTile, ProgressBar } from "../../src/components";
import { api } from "../../src/api";

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/dashboard");
      setData(d);
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const s = data?.stats || {};
  return (
    <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <LinearGradient colors={gradients.header} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Good Morning</Text>
            <Text style={styles.name}>{data?.greetingName || "Athlete"}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/profile")}>
              <Ionicons name="person" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/modal/sos")}>
              <Ionicons name="settings-sharp" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.grid}>
          <StatTile label="Calories Burned" value={s.caloriesBurned ?? 0} tint="#FED7AA">
            <Ionicons name="flame" size={18} color="#F97316" />
          </StatTile>
          <StatTile label="Active Minutes" value={s.activeMinutes ?? 0} tint="#DBEAFE">
            <Ionicons name="time" size={18} color="#3B82F6" />
          </StatTile>
        </View>
        <View style={styles.grid}>
          <StatTile label="Workouts" value={s.workouts ?? 0} tint="#EDE9FE">
            <Ionicons name="flash" size={18} color="#8B5CF6" />
          </StatTile>
          <StatTile label="Streak Days" value={s.streakDays ?? 0} tint="#FEF3C7">
            <Ionicons name="trophy" size={18} color="#F59E0B" />
          </StatTile>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Today's Goals</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/goals")}>
            <Text style={styles.link}>View All</Text>
          </TouchableOpacity>
        </View>

        {(data?.todaysGoals || []).map((g, i) => (
          <Card key={i} style={{ marginBottom: 12 }}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>{g.label}</Text>
              <Text style={styles.goalVal}>{g.current}/{g.target} {g.unit}</Text>
            </View>
            <ProgressBar value={g.current} max={g.target} />
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  hello: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
  name: { color: "#fff", fontSize: 26, fontWeight: "800" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  grid: { flexDirection: "row" },
  body: { padding: spacing.md },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  section: { fontSize: 20, fontWeight: "800", color: colors.text },
  link: { color: colors.blue, fontWeight: "700" },
  goalRow: { flexDirection: "row", justifyContent: "space-between" },
  goalLabel: { fontWeight: "700", color: colors.text },
  goalVal: { color: colors.textMuted },
  aiCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: radius.lg, marginTop: 8 },
  aiCtaText: { color: "#fff", fontWeight: "700", marginLeft: 8, fontSize: 15 },
});
