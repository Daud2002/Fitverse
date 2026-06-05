import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { ProgressBar } from "../../src/components";
import { api } from "../../src/api";

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [session, setSession] = useState(null);
  const [done, setDone] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { workout } = await api(`/workouts/${id}`);
        setWorkout(workout);
        const { session } = await api("/workouts/sessions", { method: "POST", body: { workoutPlanId: id } });
        setSession(session);
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    })();
  }, [id]);

  async function completeExercise(index) {
    if (index !== done) return;
    const next = done + 1;
    setDone(next);
    try {
      await api(`/workouts/sessions/${session.id}`, { method: "PATCH", body: { exercisesDone: next } });
    } catch {}
    if (next === workout.exercises.length) {
      const calories = workout.caloriesEst || 0;
      await api(`/workouts/sessions/${session.id}/complete`, { method: "POST", body: { caloriesBurned: calories } }).catch(() => {});
      Alert.alert("Workout complete! 🎉", `You burned ~${calories} calories.`, [
        { text: "Done", onPress: () => router.back() },
      ]);
    }
  }

  if (!workout) return <View style={styles.fill} />;

  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.hero}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{workout.name}</Text>
        <View style={styles.heroMeta}>
          <Meta icon="time-outline" text={`${workout.durationMin} min`} />
          <Meta icon="flame-outline" text={`${workout.caloriesEst} cal`} />
          <Meta icon="barbell-outline" text={`${workout.exercises.length} exercises`} />
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.md }}>
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Workout Progress</Text>
            <Text style={styles.progressVal}>{done}/{workout.exercises.length}</Text>
          </View>
          <ProgressBar value={done} max={workout.exercises.length} />
        </View>

        <Text style={styles.section}>Exercise List</Text>
        {workout.exercises.map((ex, i) => {
          const completed = i < done;
          const current = i === done;
          return (
            <View key={ex.id} style={[styles.exRow, current && styles.exCurrent, completed && styles.exDone]}>
              <View style={[styles.check, completed ? styles.checkDone : current ? styles.checkCurrent : styles.checkIdle]}>
                {completed ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Text style={styles.checkNum}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, completed && styles.exNameDone]}>{ex.name}</Text>
                <Text style={styles.exMeta}>
                  {ex.timerSeconds ? `${ex.timerSeconds}s` : `${ex.reps} reps`} × {ex.sets} sets
                </Text>
              </View>
              {ex.videoUrl ? (
                <TouchableOpacity style={styles.videoBtn} onPress={() => setVideoUrl(toEmbed(ex.videoUrl))}>
                  <Ionicons name="play-circle" size={26} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
              {ex.timerSeconds && current ? (
                <Timer seconds={ex.timerSeconds} onDone={() => completeExercise(i)} />
              ) : current ? (
                <TouchableOpacity style={styles.completeBtn} onPress={() => completeExercise(i)}>
                  <Text style={styles.completeText}>Complete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>

      <Modal visible={!!videoUrl} animationType="slide" onRequestClose={() => setVideoUrl(null)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity style={styles.closeVideo} onPress={() => setVideoUrl(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {videoUrl ? <WebView source={{ uri: videoUrl }} allowsFullscreenVideo style={{ flex: 1 }} /> : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

function Timer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => () => clearInterval(ref.current), []);

  function toggle() {
    if (running) {
      clearInterval(ref.current);
      setRunning(false);
    } else {
      setRunning(true);
      ref.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(ref.current);
            setRunning(false);
            onDone();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <TouchableOpacity style={styles.timerBtn} onPress={toggle}>
      <Ionicons name={running ? "pause" : "play"} size={14} color="#fff" />
      <Text style={styles.timerText}>{mm}:{ss}</Text>
    </TouchableOpacity>
  );
}

function toEmbed(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : url;
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={15} color="rgba(255,255,255,0.9)" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: 24 },
  back: { marginBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroMeta: { flexDirection: "row", marginTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  metaText: { color: "rgba(255,255,255,0.9)", marginLeft: 5, fontSize: 13 },
  progressCard: { backgroundColor: "#E0E7FF", borderRadius: radius.lg, padding: spacing.md, marginBottom: 16 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontWeight: "700", color: colors.text },
  progressVal: { fontWeight: "800", color: colors.blue },
  section: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 12 },
  exRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  exCurrent: { borderColor: colors.blue, borderWidth: 2 },
  exDone: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  check: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 },
  checkDone: { backgroundColor: colors.green },
  checkCurrent: { backgroundColor: colors.blue },
  checkIdle: { backgroundColor: "#E5E7EB" },
  checkNum: { color: "#fff", fontWeight: "700" },
  exName: { fontWeight: "700", color: colors.text, fontSize: 15 },
  exNameDone: { textDecorationLine: "line-through", color: colors.textMuted },
  exMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  videoBtn: { paddingHorizontal: 6 },
  completeBtn: { backgroundColor: colors.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  completeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  timerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  timerText: { color: "#fff", fontWeight: "700", marginLeft: 6, fontVariant: ["tabular-nums"] },
  closeVideo: { position: "absolute", top: 48, right: 20, zIndex: 2 },
});
