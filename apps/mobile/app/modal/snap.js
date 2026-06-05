import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme";
import { GradientButton, OutlineButton } from "../../src/components";
import { api } from "../../src/api";

export default function Snap() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  async function pick(fromCamera) {
    const opts = { base64: true, quality: 0.6, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images };
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow camera/photos to snap a meal.");
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    setImage(asset.uri);
    setImageBase64(asset.base64);
    analyze(asset.base64);
  }

  async function analyze(base64) {
    setAnalyzing(true);
    setResult(null);
    try {
      const { result } = await api("/meals/recognize", { method: "POST", body: { imageBase64: base64 } });
      setResult(result);
    } catch (e) {
      Alert.alert("Recognition failed", e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api("/meals", {
        method: "POST",
        body: {
          name: result.name,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          source: "photo",
          aiConfidence: result.confidence,
          mealType: "Lunch",
          imageBase64,
        },
      });
      router.back();
    } catch (e) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.fill}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.frame}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={56} color="#64748B" />
            <Text style={styles.hint}>Position your food in the frame</Text>
          </>
        )}
        {analyzing && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.overlayText}>Analyzing with AI...</Text>
          </View>
        )}
      </View>

      {!result ? (
        <View style={styles.controls}>
          <Text style={styles.tip}>💡 For best results, capture the entire meal in good lighting</Text>
          <View style={styles.btnRow}>
            <GradientButton title="Take Photo" onPress={() => pick(true)} style={{ flex: 1, marginRight: 8 }} />
            <OutlineButton title="Gallery" onPress={() => pick(false)} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </View>
      ) : (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultName}>{result.name}</Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{Math.round((result.confidence || 0) * 100)}% match</Text>
            </View>
          </View>
          <View style={styles.macroGrid}>
            <ResultMacro value={result.calories} unit="kcal" label="Calories" />
            <ResultMacro value={result.protein} unit="g" label="Protein" />
            <ResultMacro value={result.carbs} unit="g" label="Carbs" />
            <ResultMacro value={result.fat} unit="g" label="Fat" />
          </View>
          <View style={styles.btnRow}>
            <OutlineButton title="↺ Retake" onPress={() => { setResult(null); setImage(null); setImageBase64(null); }} style={{ flex: 1, marginRight: 8 }} />
            <GradientButton title="✓ Save" loading={saving} colors={["#16A34A", "#22C55E"]} onPress={save} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </View>
      )}
    </View>
  );
}

function ResultMacro({ value, unit, label }) {
  return (
    <View style={styles.rMacro}>
      <Text style={styles.rVal}>{value}<Text style={styles.rUnit}> {unit}</Text></Text>
      <Text style={styles.rLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0B1120", padding: spacing.md, justifyContent: "center" },
  close: { position: "absolute", top: 48, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  frame: { height: 320, borderRadius: radius.lg, borderWidth: 1, borderColor: "#334155", backgroundColor: "#111827", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  preview: { ...StyleSheet.absoluteFillObject, resizeMode: "cover" },
  hint: { color: "#64748B", marginTop: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  overlayText: { color: "#fff", marginTop: 10 },
  controls: { marginTop: 24 },
  tip: { color: "#FBBF24", textAlign: "center", marginBottom: 16, fontSize: 13 },
  btnRow: { flexDirection: "row", marginTop: 8 },
  resultCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.md, marginTop: 24 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  resultName: { fontSize: 18, fontWeight: "800", color: colors.text },
  matchBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  matchText: { color: "#16A34A", fontWeight: "700", fontSize: 12 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  rMacro: { width: "50%", padding: 8 },
  rVal: { fontSize: 22, fontWeight: "800", color: colors.text },
  rUnit: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  rLabel: { color: colors.textMuted, fontSize: 13 },
});
