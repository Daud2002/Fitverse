import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme";
import { GradientButton } from "../../src/components";
import { api } from "../../src/api";

const MOODS = [
  { mood: "Happy", emoji: "😄" },
  { mood: "Calm", emoji: "😌" },
  { mood: "Tired", emoji: "😴" },
  { mood: "Stressed", emoji: "😣" },
  { mood: "Sad", emoji: "😢" },
];

export default function Mood() {
  const router = useRouter();
  const [mood, setMood] = useState("Happy");
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState("");

  async function save() {
    try {
      const { suggestion } = await api("/moods", { method: "POST", body: { mood, intensity, notes } });
      Alert.alert("Mood saved", suggestion, [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <Text style={styles.title}>How are you feeling?</Text>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={colors.text} /></TouchableOpacity>
      </View>

      <View style={styles.moods}>
        {MOODS.map((m) => (
          <TouchableOpacity key={m.mood} style={[styles.moodBtn, mood === m.mood && styles.moodActive]} onPress={() => setMood(m.mood)}>
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.moodLabel, mood === m.mood && styles.moodLabelActive]}>{m.mood}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Intensity: {intensity}/5</Text>
      <View style={styles.intensity}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} style={[styles.iDot, n <= intensity && styles.iDotActive]} onPress={() => setIntensity(n)} />
        ))}
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.notes} value={notes} onChangeText={setNotes} placeholder="What's on your mind?" placeholderTextColor={colors.textMuted} multiline />

      <GradientButton title="Save mood" onPress={save} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#fff", padding: spacing.lg, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  moods: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  moodBtn: { width: "18%", aspectRatio: 0.85, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  moodActive: { borderColor: colors.primary, backgroundColor: "#F5F3FF" },
  emoji: { fontSize: 26 },
  moodLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  moodLabelActive: { color: colors.primary, fontWeight: "700" },
  label: { fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10 },
  intensity: { flexDirection: "row" },
  iDot: { width: 40, height: 12, borderRadius: 6, backgroundColor: colors.border, marginRight: 8 },
  iDotActive: { backgroundColor: colors.primary },
  notes: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, minHeight: 80, color: colors.text, textAlignVertical: "top" },
});
