import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { fetch as expoFetch } from "expo/fetch";
import Markdown from "react-native-markdown-display";
import { gradients, colors, spacing, radius } from "../../src/theme";
import { API_URL, getToken } from "../../src/api";

const GREETING = {
  role: "assistant",
  content:
    "Hi! I'm your FitVerse Coach. 💪\n\nAsk me anything about meal planning or workouts — like \"a high-protein lunch idea\" or \"a 20-minute home workout\".",
};

const SUGGESTIONS = [
  "Suggest a high-protein breakfast",
  "Plan a 30-min full-body workout",
  "Healthy snacks under 200 calories",
];

export default function Coach() {
  const [messages, setMessages] = useState([GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  // Append a text delta to the most recent assistant message (the one being streamed).
  const appendToLast = useCallback((delta) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, content: last.content + delta };
      return copy;
    });
  }, []);

  async function send(textArg) {
    const text = (textArg ?? draft).trim();
    if (!text || sending) return;

    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    // Add the user message + an empty assistant placeholder we'll stream into.
    setMessages([...next, { role: "assistant", content: "" }]);
    setDraft("");
    setSending(true);
    scrollToEnd();

    try {
      const history = next
        .filter((m) => m !== GREETING)
        .map((m) => ({ role: m.role, content: m.content }));
      const token = await getToken();

      const res = await expoFetch(`${API_URL}/coach/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotError = null;

      // Parse the SSE stream: "data: {json}\n\n" frames.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.delta) {
              appendToLast(evt.delta);
              scrollToEnd();
            } else if (evt.error) {
              gotError = evt.error;
            }
          } catch {
            // ignore partial/keep-alive frames
          }
        }
      }

      if (gotError) appendToLast(gotError);
    } catch (e) {
      // Replace the empty placeholder with an error message.
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) {
          copy[copy.length - 1] = { ...last, content: "Sorry, something went wrong. Please try again." };
        }
        return copy;
      });
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={gradients.header} style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles" size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>FitVerse Coach</Text>
          <Text style={styles.headerSub}>Meals & workouts • powered by AI</Text>
        </View>
      </LinearGradient>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 16 }}
        renderItem={({ item, index }) => (
          <Bubble
            role={item.role}
            content={item.content}
            pending={item.role === "assistant" && !item.content && index === messages.length - 1}
          />
        )}
        onContentSizeChange={scrollToEnd}
      />

      {showSuggestions && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.chip} onPress={() => send(s)} activeOpacity={0.8}>
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          placeholder="Ask about meals or workouts…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          multiline
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          onPress={() => send()}
          disabled={sending || !draft.trim()}
          style={[styles.sendBtn, { opacity: draft.trim() && !sending ? 1 : 0.5 }]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ role, content, pending }) {
  const isUser = role === "user";
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowEnd : styles.rowStart]}>
      {!isUser && (
        <View style={styles.coachAvatar}>
          <Ionicons name="fitness" size={15} color="#fff" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {pending ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.typing}>Coach is typing…</Text>
          </View>
        ) : isUser ? (
          <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{content}</Markdown>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, maxWidth: "100%" },
  rowStart: { justifyContent: "flex-start" },
  rowEnd: { justifyContent: "flex-end" },
  coachAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: 8 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
  bubbleAssistant: { backgroundColor: "#fff", borderTopLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  bubbleTextUser: { color: "#fff" },
  typing: { color: colors.textMuted, fontSize: 13, marginLeft: 8 },

  suggestions: { paddingHorizontal: spacing.md, paddingBottom: 8, flexDirection: "row", flexWrap: "wrap" },
  chip: { backgroundColor: "#EDE9FE", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipText: { color: colors.primary, fontWeight: "600", fontSize: 13 },

  inputBar: { flexDirection: "row", alignItems: "flex-end", padding: spacing.md, paddingTop: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginLeft: 8 },
});

// Markdown rendering for assistant bubbles (bold, headings, lists, etc.).
const markdownStyles = {
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 4, marginBottom: 6 },
  heading2: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 4, marginBottom: 4 },
  strong: { fontWeight: "800", color: colors.text },
  em: { fontStyle: "italic" },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  bullet_list_icon: { color: colors.primary },
  ordered_list_icon: { color: colors.primary, fontWeight: "700" },
  code_inline: { backgroundColor: colors.bg, color: colors.primary, paddingHorizontal: 4, borderRadius: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  code_block: { backgroundColor: colors.bg, padding: 10, borderRadius: radius.sm, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  fence: { backgroundColor: colors.bg, padding: 10, borderRadius: radius.sm, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  link: { color: colors.primary, textDecorationLine: "underline" },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 8 },
};
