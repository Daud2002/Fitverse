import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { ProgressBar } from "../../src/components";
import { api, API_URL } from "../../src/api";

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [session, setSession] = useState(null);
  const [done, setDone] = useState(0);
  const [videoId, setVideoId] = useState(null);

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
      <View style={styles.heroWrap}>
        {workout.imageUrl ? (
          <Image source={{ uri: `${API_URL}${workout.imageUrl}` }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={workout.imageUrl ? ["rgba(15,23,42,0.35)", "rgba(15,23,42,0.92)"] : ["#0F172A", "#1E293B"]}
          style={styles.hero}
        >
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
      </View>

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
                <TouchableOpacity style={styles.videoBtn} onPress={() => setVideoId(youtubeId(ex.videoUrl))}>
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

      <Modal visible={!!videoId} animationType="fade" transparent onRequestClose={() => setVideoId(null)}>
        <Pressable style={styles.videoBackdrop} onPress={() => setVideoId(null)}>
          <Pressable style={styles.videoCard} onPress={() => {}}>
            <View style={styles.videoBar}>
              <Text style={styles.videoBarTitle}>Exercise demo</Text>
              <TouchableOpacity onPress={() => setVideoId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.videoPlayer}>
              {videoId ? (
                <WebView
                  source={{ html: youtubeHtml(videoId), baseUrl: "https://www.youtube.com" }}
                  originWhitelist={["*"]}
                  style={styles.webview}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  allowsFullscreenVideo
                />
              ) : null}
            </View>
          </Pressable>
        </Pressable>
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

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function youtubeHtml(id) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; }
      html, body { background: #000; height: 100%; overflow: hidden; }
      #player { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script>
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      function onYouTubeIframeAPIReady() {
        new YT.Player('player', {
          videoId: '${id}',
          host: 'https://www.youtube.com',
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            fs: 1,
            origin: 'https://www.youtube.com'
          },
          events: {
            onReady: function (e) { e.target.playVideo(); }
          }
        });
      }
    </script>
  </body>
</html>`;
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
  heroWrap: { position: "relative" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  hero: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: 24, minHeight: 150 },
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
  videoBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: spacing.md },
  videoCard: { width: "100%", maxWidth: 520, backgroundColor: "#000", borderRadius: radius.lg, overflow: "hidden" },
  videoBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#111827" },
  videoBarTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  videoPlayer: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});
