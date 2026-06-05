import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, useWindowDimensions, FlatList, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { gradients, colors } from "../src/theme";

const SLIDES = [
  { icon: "barbell", title: "Track Your Fitness", text: "Monitor your workouts, nutrition, and progress all in one place", tint: "#E0E7FF", color: "#4A6CF7" },
  { icon: "locate", title: "Set Your Goals", text: "Create personalized fitness goals and crush them with our guided plans", tint: "#F3E8FF", color: "#8B5CF6" },
  { icon: "trophy", title: "Join Challenges", text: "Compete with friends, earn rewards, and stay motivated every day", tint: "#FEF3C7", color: "#F59E0B" },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      router.replace("/login");
    }
  };

  return (
    <LinearGradient colors={gradients.primary} style={styles.fill}>
      <TouchableOpacity style={styles.skip} onPress={() => router.replace("/login")}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.circle, { backgroundColor: item.tint }]}>
              <Ionicons name={item.icon} size={64} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.9} style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? "Get Started" : "Next  ›"}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  skip: { position: "absolute", top: 56, right: 24, zIndex: 2 },
  skipText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  circle: { width: 160, height: 160, borderRadius: 80, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 12 },
  text: { color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)", marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: "#fff" },
  footer: { paddingHorizontal: 24, paddingBottom: 48 },
  cta: { backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
});
