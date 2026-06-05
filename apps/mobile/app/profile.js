import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../src/theme";
import { Card } from "../src/components";
import { api } from "../src/api";
import { useAuth } from "../src/auth";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api("/profile/stats").then(setStats).catch((e) => console.warn(e.message));
    }, [])
  );

  const achievements = [
    { label: "7 Day Streak", icon: "flame", color: "#EF4444" },
    { label: "Marathon Runner", icon: "walk", color: "#F59E0B" },
    { label: "Early Bird", icon: "sunny", color: "#3B82F6" },
    { label: "Calorie Crusher", icon: "barbell", color: "#22C55E" },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <LinearGradient colors={gradients.header} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>
        <View style={styles.profileRow}>
          <View style={styles.avatar}><Ionicons name="person" size={36} color="#fff" /></View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.badges}>
              <View style={styles.badge}><Text style={styles.badgeText}>Pro Member</Text></View>
              <View style={styles.badge}><Text style={styles.badgeText}>Level 12</Text></View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.md, marginTop: -20 }}>
        <View style={styles.statGrid}>
          <StatCard icon="locate" tint="#DBEAFE" color="#3B82F6" value={stats?.workouts ?? 0} label="Workouts" />
          <StatCard icon="flame" tint="#FED7AA" color="#F97316" value={stats?.caloriesBurned ?? 0} label="Calories" />
        </View>
        <View style={styles.statGrid}>
          <StatCard icon="trophy" tint="#FEF3C7" color="#F59E0B" value={`${stats?.points ?? 0}`} label="Points" />
          <StatCard icon="calendar" tint="#EDE9FE" color="#8B5CF6" value="3 months" label="Member" />
        </View>

        <Text style={styles.section}>Recent Achievements</Text>
        <View style={styles.achievements}>
          {achievements.map((a) => (
            <View key={a.label} style={styles.achCard}>
              <Ionicons name={a.icon} size={26} color={a.color} />
              <Text style={styles.achLabel}>{a.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/modal/mood")}>
          <Ionicons name="happy-outline" size={22} color={colors.primary} />
          <Text style={styles.menuText}>Track today's mood</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/modal/sos")}>
          <Ionicons name="warning-outline" size={22} color={colors.red} />
          <Text style={styles.menuText}>Emergency SOS</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          <Text style={styles.menuText}>Log out</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, tint, color, value, label }) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: 36, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  email: { color: "rgba(255,255,255,0.9)", marginTop: 2 },
  badges: { flexDirection: "row", marginTop: 8 },
  badge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, marginRight: 8 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statGrid: { flexDirection: "row" },
  statCard: { flex: 1, margin: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statVal: { fontSize: 24, fontWeight: "800", color: colors.text },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  section: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 16, marginBottom: 12 },
  achievements: { flexDirection: "row", justifyContent: "space-between" },
  achCard: { flex: 1, backgroundColor: "#fff", borderRadius: radius.md, padding: 12, alignItems: "center", marginHorizontal: 3, borderWidth: 1, borderColor: colors.border },
  achLabel: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: 6 },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, padding: 16, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  menuText: { flex: 1, marginLeft: 12, fontWeight: "600", color: colors.text },
});
