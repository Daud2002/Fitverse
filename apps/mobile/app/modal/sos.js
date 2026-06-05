import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme";
import { api } from "../../src/api";

export default function Sos() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const { contacts } = await api("/sos/contacts");
        setContacts(contacts);
      } catch (e) {
        console.warn(e.message);
      } finally {
        setLoadingContacts(false);
      }
    })();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  async function activate() {
    setSending(true);
    try {
      const res = await api("/sos", { method: "POST", body: {} });
      setConfirmation(res);
    } catch (e) {
      setConfirmation({ error: e.message });
    } finally {
      setSending(false);
    }
  }

  if (confirmation && !confirmation.error) {
    const anyReal = (confirmation.notified || []).some((c) => c.sent);
    return (
      <ScrollView style={styles.fillLight} contentContainerStyle={{ padding: spacing.lg, paddingTop: 60 }}>
        <View style={styles.okCircle}><Ionicons name="checkmark" size={44} color={colors.green} /></View>
        <Text style={styles.okTitle}>
          {confirmation.contactCount > 0 ? "Emergency Contacts Notified" : "SOS Recorded"}
        </Text>
        <Text style={styles.okSub}>
          {confirmation.contactCount > 0
            ? "Help is on the way. Stay calm and safe."
            : "No emergency contacts are set up yet. Add some so we can alert them next time."}
        </Text>

        {(confirmation.notified || []).map((c, i) => (
          <View key={i} style={styles.contactCard}>
            <View style={styles.cIcon}><Ionicons name="call" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cName}>{c.name} {c.relation ? `(${c.relation})` : ""}</Text>
              <Text style={styles.cMeta}>
                {c.sent ? "SMS sent" : "Queued (demo mode)"} • {c.phoneNumber}
              </Text>
            </View>
            <View style={[styles.dot, { backgroundColor: c.sent ? colors.green : colors.orange }]} />
          </View>
        ))}

        {!anyReal && confirmation.contactCount > 0 && (
          <Text style={styles.demoNote}>
            SMS delivery is in demo mode (Twilio not configured), so messages were logged on the server but not actually sent.
          </Text>
        )}

        <View style={styles.locCard}>
          <Ionicons name="location" size={18} color={colors.blue} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.locTitle}>Location</Text>
            <Text style={styles.locText}>{confirmation.address}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.fill}>
      <TouchableOpacity style={styles.topClose} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={styles.heading}>Emergency SOS</Text>
        <Text style={styles.subheading}>
          Press the button below to instantly alert your emergency contacts by SMS.
        </Text>

        <View style={styles.buttonArea}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
          <TouchableOpacity activeOpacity={0.85} style={styles.sosCircle} onPress={activate} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={colors.red} size="large" />
            ) : (
              <>
                <Ionicons name="warning" size={40} color={colors.red} />
                <Text style={styles.sosText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {loadingContacts ? (
          <ActivityIndicator color={colors.textMuted} style={{ marginTop: 24 }} />
        ) : contacts.length === 0 ? (
          <View style={styles.warnBox}>
            <Ionicons name="alert-circle" size={18} color={colors.orange} />
            <Text style={styles.warnText}>
              No emergency contacts yet. Add them in your profile so they can be alerted.
            </Text>
          </View>
        ) : (
          <Text style={styles.contactCount}>
            {contacts.length} emergency contact{contacts.length > 1 ? "s" : ""} will be notified
          </Text>
        )}

        {confirmation?.error && <Text style={styles.err}>{confirmation.error}</Text>}

        <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#fff" },
  fillLight: { flex: 1, backgroundColor: "#fff" },
  topClose: { position: "absolute", top: 48, right: 20, zIndex: 2, padding: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  heading: { fontSize: 26, fontWeight: "800", color: colors.text },
  subheading: { color: colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 21, paddingHorizontal: 12 },

  buttonArea: { width: 260, height: 260, alignItems: "center", justifyContent: "center", marginVertical: 36 },
  pulseRing: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(239,68,68,0.12)" },
  sosCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FEF2F2",
    borderWidth: 6,
    borderColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.red,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sosText: { color: colors.red, fontSize: 46, fontWeight: "900", letterSpacing: 2, marginTop: 4 },

  contactCount: { color: colors.text, fontWeight: "600", marginTop: 4 },
  warnBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF7ED", borderRadius: radius.md, padding: 14, marginTop: 4 },
  warnText: { color: "#9A3412", marginLeft: 10, flex: 1, fontSize: 13, lineHeight: 18 },
  err: { color: colors.red, marginTop: 16, textAlign: "center" },
  cancel: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 40, borderRadius: radius.md, backgroundColor: "#F1F5F9" },
  cancelText: { color: colors.text, fontWeight: "700" },

  okCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#DCFCE7", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  okTitle: { fontSize: 22, fontWeight: "800", color: colors.green, textAlign: "center" },
  okSub: { color: colors.textMuted, textAlign: "center", marginTop: 6, marginBottom: 20, lineHeight: 20 },
  contactCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 12 },
  cName: { fontWeight: "700", color: colors.text },
  cMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  demoNote: { color: colors.orange, fontSize: 12.5, lineHeight: 18, marginTop: 2, marginBottom: 6 },
  locCard: { flexDirection: "row", backgroundColor: "#EFF6FF", borderRadius: radius.md, padding: 14, marginTop: 6 },
  locTitle: { fontWeight: "700", color: colors.blue },
  locText: { color: colors.blue, marginTop: 2, fontSize: 13 },
  closeBtn: { backgroundColor: "#0F172A", paddingVertical: 16, borderRadius: radius.md, alignItems: "center", marginTop: 20 },
  closeText: { color: "#fff", fontWeight: "700" },
});
