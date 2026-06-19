import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { Card, GradientButton } from "../../src/components";
import { api, API_URL } from "../../src/api";
import { useAuth } from "../../src/auth";

const PAGE_SIZE = 10;

export default function Social() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  const load = useCallback(async (reset = true) => {
    if (reset) {
      cursorRef.current = null;
      hasMoreRef.current = true;
    }
    if (!hasMoreRef.current) return;
    try {
      const qs = `?take=${PAGE_SIZE}${cursorRef.current ? `&cursor=${cursorRef.current}` : ""}`;
      const { posts: page, nextCursor } = await api(`/posts${qs}`);
      cursorRef.current = nextCursor;
      hasMoreRef.current = !!nextCursor;
      setPosts((prev) => (reset ? page : [...prev, ...page]));
    } catch (e) {
      console.warn(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setInitialLoading(true);
        await load(true);
        setInitialLoading(false);
      })();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  async function onEndReached() {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo access to attach an image.");
    const res = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    setImage(asset.uri);
    setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
  }

  function clearImage() {
    setImage(null);
    setImageBase64(null);
  }

  async function submitPost() {
    if (!text.trim() && !imageBase64) return;
    setPosting(true);
    try {
      await api("/posts", {
        method: "POST",
        body: { content: text.trim() || " ", imageBase64: imageBase64 || undefined },
      });
      setText("");
      clearImage();
      await load(true);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setPosting(false);
    }
  }

  function like(id) {
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p
      )
    );
    api(`/posts/${id}/like`, { method: "POST" }).catch(() => {});
  }

  function bumpCommentCount(id, delta) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, commentCount: p.commentCount + delta } : p)));
  }

  function removePost(id) {
    Alert.alert("Delete post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = posts;
          setPosts((ps) => ps.filter((p) => p.id !== id));
          try {
            await api(`/posts/${id}`, { method: "DELETE" });
          } catch (e) {
            setPosts(prev);
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={gradients.header} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Social Feed</Text>
          <Text style={styles.headerSub}>Share your journey with the community</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={20} color="#fff" />
        </View>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <Card style={styles.composer}>
            <TextInput
              placeholder="Share your progress..."
              value={text}
              onChangeText={setText}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {image && (
              <View style={styles.previewWrap}>
                <Image source={{ uri: image }} style={styles.preview} />
                <TouchableOpacity style={styles.removeImg} onPress={clearImage}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.composerRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={20} color={colors.primary} />
                <Text style={styles.attachText}>Photo</Text>
              </TouchableOpacity>
              <GradientButton title="Post" onPress={submitPost} loading={posting} style={{ flex: 1, marginLeft: 10 }} />
            </View>
          </Card>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.id}
            onLike={like}
            onCommentChange={bumpCommentCount}
            onDelete={removePost}
          />
        )}
        ListEmptyComponent={
          initialLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Be the first to share your progress with the community!</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
      />
    </KeyboardAvoidingView>
  );
}

function PostCard({ post, currentUserId, onLike, onCommentChange, onDelete }) {
  const isOwner = currentUserId && post.author?.id === currentUserId;
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && comments.length === 0) {
      setLoading(true);
      try {
        const { comments: list } = await api(`/posts/${post.id}/comments`);
        setComments(list);
      } catch (e) {
        console.warn(e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const { comment } = await api(`/posts/${post.id}/comments`, {
        method: "POST",
        body: { content: draft.trim(), parentId: replyTo?.id },
      });
      setComments((prev) => insertComment(prev, comment));
      setDraft("");
      setReplyTo(null);
      onCommentChange(post.id, 1);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <View style={styles.author}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(post.author?.name || "?")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author?.name}</Text>
          <Text style={styles.time}>Fitness Enthusiast • {timeAgo(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(post.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {post.content?.trim() ? <Text style={styles.content}>{post.content}</Text> : null}
      {post.imageUrl ? (
        <Image source={{ uri: `${API_URL}${post.imageUrl}` }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.action, post.likedByMe && styles.actionLiked]} onPress={() => onLike(post.id)}>
          <Ionicons name={post.likedByMe ? "heart" : "heart-outline"} size={19} color={post.likedByMe ? colors.red : colors.textMuted} />
          <Text style={[styles.actionText, post.likedByMe && { color: colors.red }]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, open && styles.actionOpen]} onPress={toggleComments}>
          <Ionicons name={open ? "chatbubble" : "chatbubble-outline"} size={18} color={open ? colors.primary : colors.textMuted} />
          <Text style={[styles.actionText, open && { color: colors.primary }]}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.commentSection}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Start the conversation!</Text>
          ) : (
            comments.map((c) => (
              <CommentNode key={c.id} comment={c} depth={0} onReply={setReplyTo} />
            ))
          )}

          {replyTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText} numberOfLines={1}>
                Replying to {replyTo.author?.name}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.commentInputRow}>
            <TextInput
              placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
              value={draft}
              onChangeText={setDraft}
              style={styles.commentInput}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity onPress={send} disabled={sending || !draft.trim()} style={styles.sendBtn}>
              {sending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="send" size={20} color={draft.trim() ? colors.primary : colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}

function CommentNode({ comment, depth, onReply }) {
  return (
    <View style={[styles.comment, depth > 0 && styles.commentNested]}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{(comment.author?.name || "?")[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentName}>{comment.author?.name}</Text>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text style={styles.replyBtn}>Reply</Text>
          </TouchableOpacity>
        </View>
        {comment.replies?.map((r) => (
          <CommentNode key={r.id} comment={r} depth={depth + 1} onReply={onReply} />
        ))}
      </View>
    </View>
  );
}

function insertComment(tree, comment) {
  if (!comment.parentId) return [...tree, comment];
  const add = (nodes) =>
    nodes.map((n) => {
      if (n.id === comment.parentId) {
        return { ...n, replies: [...(n.replies || []), comment] };
      }
      if (n.replies?.length) {
        return { ...n, replies: add(n.replies) };
      }
      return n;
    });
  return add(tree);
}

function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 3600000;
  if (diff < 1 / 60) return "just now";
  if (diff < 1) return `${Math.max(1, Math.round(diff * 60))} min ago`;
  if (diff < 24) return `${Math.round(diff)} hours ago`;
  return `${Math.round(diff / 24)} days ago`;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 3 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },

  composer: { marginTop: 16, marginBottom: 16 },
  input: { minHeight: 44, color: colors.text, textAlignVertical: "top", fontSize: 15 },
  composerRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  attachText: { color: colors.primary, fontWeight: "600", marginLeft: 6 },
  previewWrap: { marginTop: 12, borderRadius: radius.md, overflow: "hidden", position: "relative" },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
  removeImg: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { alignItems: "center", marginTop: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ECECF2", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 4 },
  emptyText: { textAlign: "center", color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  author: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", marginRight: 10, borderWidth: 2, borderColor: "#EDE9FE" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  authorName: { fontWeight: "700", color: colors.text, fontSize: 15 },
  time: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  deleteBtn: { padding: 6 },
  content: { color: colors.text, lineHeight: 22, marginBottom: 12, fontSize: 15 },
  postImage: { width: "100%", height: 240, borderRadius: radius.md, marginBottom: 12, backgroundColor: colors.border },

  actions: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 2 },
  action: { flexDirection: "row", alignItems: "center", marginRight: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bg },
  actionLiked: { backgroundColor: "#FEE2E2" },
  actionOpen: { backgroundColor: "#EDE9FE" },
  actionText: { color: colors.textMuted, marginLeft: 6, fontWeight: "700", fontSize: 13 },

  commentSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  noComments: { color: colors.textMuted, fontSize: 13, marginBottom: 10, fontStyle: "italic" },

  comment: { flexDirection: "row", marginBottom: 12 },
  commentNested: { marginTop: 12, marginBottom: 0 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", marginRight: 8 },
  commentAvatarText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  commentBubble: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  commentName: { fontWeight: "700", color: colors.text, fontSize: 13 },
  commentText: { color: colors.text, fontSize: 14, marginTop: 2, lineHeight: 19 },
  commentMeta: { flexDirection: "row", alignItems: "center", marginTop: 4, marginLeft: 4 },
  commentTime: { color: colors.textMuted, fontSize: 11, marginRight: 16 },
  replyBtn: { color: colors.primary, fontSize: 12, fontWeight: "700" },

  replyingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replyingText: { color: colors.textMuted, fontSize: 13, flex: 1, marginRight: 8 },

  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  commentInput: { flex: 1, color: colors.text, fontSize: 14, maxHeight: 100, paddingVertical: 6 },
  sendBtn: { padding: 8, marginLeft: 4 },
});
