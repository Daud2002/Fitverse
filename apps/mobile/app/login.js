import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { gradients, colors, radius } from "../src/theme";
import { GradientButton } from "../src/components";
import { useAuth } from "../src/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("abdul.daim@gmail.com");
  const [password, setPassword] = useState("Pass123!");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <LinearGradient colors={gradients.header} style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="barbell" size={40} color="#fff" />
        </View>
        <Text style={styles.brand}>FitVerse</Text>
        <Text style={styles.tag}>AI-Powered Wellness Platform</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.h}>Welcome back</Text>
        <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <GradientButton title="Login" loading={loading} onPress={onSubmit} style={{ marginTop: 8 }} />
        <View style={styles.row}>
          <Text style={styles.muted}>Don't have an account? </Text>
          <Link href="/register" style={styles.link}>Sign up</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Field({ icon, ...props }) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} autoCapitalize="none" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 90, paddingBottom: 50, alignItems: "center", borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  brand: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 12 },
  tag: { color: "rgba(255,255,255,0.9)", marginTop: 4 },
  form: { flex: 1, padding: 24 },
  h: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 16 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, paddingVertical: 14, marginLeft: 10, color: colors.text },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: "700" },
});
