import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { gradients, colors, radius } from "../src/theme";
import { GradientButton } from "../src/components";
import { Field } from "./login";
import { useAuth } from "../src/auth";

const GENDERS = ["male", "female", "other"];
const LEVELS = ["easy", "medium", "hard"];

export default function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({
    name: "", username: "", email: "", password: "",
    gender: "male", weight: "", currentGoal: "", targetGoal: "", level: "easy",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit() {
    if (!f.name || !f.username || !f.email || f.password.length < 6) {
      return Alert.alert("Missing info", "Name, username, email and a 6+ char password are required.");
    }
    setLoading(true);
    try {
      await register({
        name: f.name.trim(),
        username: f.username.trim(),
        email: f.email.trim(),
        password: f.password,
        gender: f.gender,
        weight: f.weight ? Number(f.weight) : undefined,
        currentGoal: f.currentGoal || undefined,
        targetGoal: f.targetGoal || undefined,
        level: f.level,
      });
    } catch (e) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={gradients.header} style={styles.hero}>
        <Text style={styles.brand}>Create your account</Text>
        <Text style={styles.tag}>Tell us about you — your AI coach personalizes everything</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Field icon="person-outline" placeholder="Full name" value={f.name} onChangeText={set("name")} />
        <Field icon="at-outline" placeholder="Username" value={f.username} onChangeText={set("username")} />
        <Field icon="mail-outline" placeholder="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" />
        <Field icon="lock-closed-outline" placeholder="Password (6+ chars)" value={f.password} onChangeText={set("password")} secureTextEntry />

        <Text style={styles.label}>Gender (drives your AI workout plan)</Text>
        <Choices options={GENDERS} value={f.gender} onChange={set("gender")} />

        <Field icon="scale-outline" placeholder="Weight (kg)" value={f.weight} onChangeText={set("weight")} keyboardType="numeric" />
        <Field icon="flag-outline" placeholder="Current goal (e.g. Lose weight)" value={f.currentGoal} onChangeText={set("currentGoal")} />
        <Field icon="trophy-outline" placeholder="Target to achieve (e.g. 70kg)" value={f.targetGoal} onChangeText={set("targetGoal")} />

        <Text style={styles.label}>Difficulty level</Text>
        <Choices options={LEVELS} value={f.level} onChange={set("level")} />

        <GradientButton title="Create account" loading={loading} onPress={onSubmit} style={{ marginTop: 8 }} />
        <View style={styles.row}>
          <Text style={styles.muted}>Already have an account? </Text>
          <Link href="/login" style={styles.link}>Login</Link>
        </View>
      </View>
    </ScrollView>
  );
}

function Choices({ options, value, onChange }) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <TouchableOpacity key={o} onPress={() => onChange(o)} style={[styles.choice, value === o && styles.choiceActive]}>
          <Text style={[styles.choiceText, value === o && styles.choiceTextActive]}>{o[0].toUpperCase() + o.slice(1)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  brand: { color: "#fff", fontSize: 24, fontWeight: "800" },
  tag: { color: "rgba(255,255,255,0.9)", marginTop: 6 },
  form: { padding: 24 },
  label: { fontWeight: "700", color: colors.text, marginBottom: 8, marginTop: 4 },
  choices: { flexDirection: "row", marginBottom: 14 },
  choice: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: "#fff" },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textMuted, fontWeight: "600" },
  choiceTextActive: { color: "#fff" },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "700" },
});
