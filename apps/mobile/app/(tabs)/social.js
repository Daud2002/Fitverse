import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { colors, spacing, radius } from "../../src/theme";
import { Card, GradientButton } from "../../src/components";
import { api } from "../../src/api";

export default function Social() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { posts } = await api("/posts");
      setPosts(posts);
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function post() {
    if (!text.trim()) return;
    try {
      await api("/posts", { method: "POST", body: { content: text.trim() } });
      setText("");
      load();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function like(id) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p)));
    try { await api(`/posts/${id}/like`, { method: "POST" }); } catch {}
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={styles.h}>Social Feed</Text>

      <Card style={{ marginBottom: 16 }}>
        <TextInput placeholder="Share your progress..." value={text} onChangeText={setText} style={styles.input} placeholderTextColor={colors.textMuted} multiline />
        <GradientButton title="Post" onPress={post} style={{ marginTop: 8 }} />
      </Card>

      {posts.map((p) => (
        <Card key={p.id} style={{ marginBottom: 14 }}>
          <View style={styles.author}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(p.author?.name || "?")[0]}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{p.author?.name}</Text>
              <Text style={styles.time}>Fitness Enthusiast • {timeAgo(p.createdAt)}</Text>
            </View>
          </View>
          <Text style={styles.content}>{p.content}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={() => like(p.id)}>
              <Ionicons name={p.likedByMe ? "heart" : "heart-outline"} size={20} color={p.likedByMe ? colors.red : colors.textMuted} />
              <Text style={styles.actionText}>{p.likeCount}</Text>
            </TouchableOpacity>
            <View style={styles.action}>
              <Ionicons name="chatbubble-outline" size={19} color={colors.textMuted} />
              <Text style={styles.actionText}>{p.commentCount}</Text>
            </View>
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 3600000;
  if (diff < 1) return `${Math.max(1, Math.round(diff * 60))} min ago`;
  if (diff < 24) return `${Math.round(diff)} hours ago`;
  return `${Math.round(diff / 24)} days ago`;
}

const styles = StyleSheet.create({
  h: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 12 },
  input: { minHeight: 44, color: colors.text, textAlignVertical: "top" },
  author: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { color: "#fff", fontWeight: "800" },
  authorName: { fontWeight: "700", color: colors.text },
  time: { color: colors.textMuted, fontSize: 12 },
  content: { color: colors.text, lineHeight: 21, marginBottom: 12 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  action: { flexDirection: "row", alignItems: "center" },
  actionText: { color: colors.textMuted, marginLeft: 6 },
});
