import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { Card, ProgressBar } from "../../src/components";
import { api } from "../../src/api";

const CARD_GRADIENTS = [["#F97316", "#EF4444"], ["#6366F1", "#A855F7"], ["#16A34A", "#22C55E"], ["#EC4899", "#A855F7"], ["#0EA5E9", "#6366F1"]];

export default function Goals() {
  const [tab, setTab] = useState("active");
  const [active, setActive] = useState([]);
  const [available, setAvailable] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const load = useCallback(async () => {
    try {
      const [{ active, available }, { leaderboard }] = await Promise.all([
        api("/gamification/challenges"),
        api("/gamification/leaderboard"),
      ]);
      setActive(active);
      setAvailable(available);
      setLeaderboard(leaderboard);
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function join(id) {
    try {
      await api(`/gamification/challenges/${id}/join`, { method: "POST" });
      load();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  const list = tab === "active" ? active : available;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <LinearGradient colors={gradients.orange} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.sub}>Push your limits and earn rewards</Text>
      </LinearGradient>

      <View style={{ padding: spacing.md }}>
        <View style={styles.tabs}>
          <Tab label={`Active (${active.length})`} active={tab === "active"} onPress={() => setTab("active")} />
          <Tab label="Available" active={tab === "available"} onPress={() => setTab("available")} />
        </View>

        {list.map((c, i) => (
          <Card key={c.id} style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
            <LinearGradient colors={CARD_GRADIENTS[i % CARD_GRADIENTS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cChallenge}>
              <View style={styles.cHeaderRow}>
                <Ionicons name="flame" size={22} color="#fff" />
                {c.type === "community" && <View style={styles.tag}><Text style={styles.tagText}>{c.type}</Text></View>}
              </View>
              <Text style={styles.cTitle}>{c.title}</Text>
              <Text style={styles.cDesc}>{c.description}</Text>
              <View style={styles.cMetaRow}>
                <CMeta icon="time-outline" text={`${c.durationDays} days`} />
                <CMeta icon="people-outline" text={`${c.joined} joined`} />
                <CMeta icon="trophy-outline" text={`${c.points} pts`} />
              </View>
            </LinearGradient>
            <View style={{ padding: spacing.md }}>
              {tab === "active" ? (
                <>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressVal}>{c.progress} / {c.goalValue}</Text>
                  </View>
                  <ProgressBar value={c.progress} max={c.goalValue} color={colors.text} />
                  <Text style={styles.pct}>{Math.round((c.progress / c.goalValue) * 100)}% complete</Text>
                </>
              ) : (
                <TouchableOpacity onPress={() => join(c.id)}>
                  <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBtn}>
                    <Text style={styles.joinText}>Join Challenge</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}

        <Text style={styles.lbTitle}>Global Leaderboard</Text>
        <Card style={{ padding: 0 }}>
          {leaderboard.map((u, i) => (
            <View key={u.id} style={[styles.lbRow, u.isMe && styles.lbMe, i < leaderboard.length - 1 && styles.lbBorder]}>
              <View style={styles.lbRank}>
                {u.rank <= 3 ? <Ionicons name="medal" size={22} color={["#F59E0B", "#94A3B8", "#B45309"][u.rank - 1]} /> : <Ionicons name="star" size={20} color="#F59E0B" />}
              </View>
              <Text style={styles.lbHash}>#{u.rank}</Text>
              <Text style={styles.lbName}>{u.isMe ? "You" : u.name}</Text>
              <View style={styles.lbPts}><Ionicons name="trophy" size={14} color="#F59E0B" /><Text style={styles.lbPtsText}>{u.points}</Text></View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

function Tab({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
function CMeta({ icon, text }) {
  return <View style={styles.cMeta}><Ionicons name={icon} size={14} color="#fff" /><Text style={styles.cMetaText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.9)", marginTop: 4 },
  tabs: { flexDirection: "row", backgroundColor: "#ECECF2", borderRadius: radius.pill, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.pill },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: colors.textMuted, fontWeight: "700" },
  tabTextActive: { color: colors.text },
  cChallenge: { padding: spacing.md },
  cHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tag: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 6 },
  cDesc: { color: "rgba(255,255,255,0.9)", marginTop: 4 },
  cMetaRow: { flexDirection: "row", marginTop: 12 },
  cMeta: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  cMetaText: { color: "#fff", marginLeft: 5, fontSize: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontWeight: "700", color: colors.text },
  progressVal: { color: colors.text, fontWeight: "700" },
  pct: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  joinBtn: { paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  joinText: { color: "#fff", fontWeight: "700" },
  lbTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginVertical: 14 },
  lbRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  lbBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  lbMe: { backgroundColor: "#EFF6FF" },
  lbRank: { width: 30 },
  lbHash: { width: 40, color: colors.textMuted, fontWeight: "700" },
  lbName: { flex: 1, fontWeight: "700", color: colors.text },
  lbPts: { flexDirection: "row", alignItems: "center" },
  lbPtsText: { marginLeft: 5, fontWeight: "700", color: colors.text },
});
