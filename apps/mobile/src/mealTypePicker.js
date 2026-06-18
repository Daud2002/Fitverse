import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radius } from "./theme";

export const MEAL_TYPES = ["Breakfast", "Brunch", "Lunch", "Dinner", "Snack"];
export const PORTIONS = ["Small", "Medium", "Large"];

export function PillBtn({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MealTypePicker({ value, onChange }) {
  return (
    <View style={styles.pillRow}>
      {MEAL_TYPES.map((t) => (
        <PillBtn key={t} label={t} active={value === t} onPress={() => onChange(t)} />
      ))}
    </View>
  );
}

export function PortionPicker({ value, onChange }) {
  return (
    <View style={styles.pillRow}>
      {PORTIONS.map((p) => (
        <PillBtn key={p} label={p} active={value === p} onPress={() => onChange(p)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", flexWrap: "wrap" },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, marginRight: 8, marginBottom: 8, backgroundColor: "#fff" },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: "#fff" },
});
