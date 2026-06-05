import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme";
import { api } from "../../src/api";

export default function Sos() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  async function activate() {
    setSending(true);
    try {
      const res = await api("/sos", { method: "POST", body: { lat: 40.7128, lng: -74.006 } });
      setConfirmation(res);
    } catch (e) {
      setConfirmation({ error: e.message });
    } finally {
      setSending(false);
    }
  }

  if (confirmation && !confirmation.error) {
    return (
      <ScrollView style={styles.fillLight} contentContainerStyle={{ padding: spacing.lg, paddingTop: 60 }}>
        <View style={styles.okCircle}><Ionicons name="call" size={40} color={colors.green} /></View>
        <Text style={styles.okTitle}>Emergency Contacts Notified</Text>
        <Text style={styles.okSub}>Help is on the way. Stay calm and safe.</Text>

        <View style={[styles.contactCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
          <View style={[styles.cIcon, { backgroundColor: "#DCFCE7" }]}><Ionicons name="call" size={18} color={colors.green} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cName}>Emergency Services</Text>
            <Text style={styles.cMeta}>Dispatched • ETA 8 min</Text>
          </View>
          <View style={styles.dot} />
        </View>

        {(confirmation.notified || []).map((c, i) => (
          <View key={i} style={styles.contactCard}>
            <View style={styles.cIcon}><Ionicons name="person" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cName}>{c.name} {c.relation ? `(${c.relation})` : ""}</Text>
              <Text style={styles.cMeta}>Notified • {c.phoneNumber}</Text>
            </View>
            <View style={styles.dot} />
          </View>
        ))}

        <View style={styles.locCard}>
          <Ionicons name="location" size={18} color={colors.blue} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.locTitle}>Location Shared</Text>
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
      <View style={styles.modal}>
        <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.redHeader}>
          <View style={styles.redIcon}><Ionicons name="warning" size={22} color="#fff" /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.redTitle}>Emergency SOS</Text>
            <Text style={styles.redSub}>Quick emergency assistance</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        </LinearGradient>

        <View style={{ padding: spacing.md }}>
          <View style={styles.alertBox}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Ionicons name="heart" size={18} color={colors.red} />
              <Text style={styles.alertTitle}>  Medical Emergency</Text>
            </View>
            <Text style={styles.alertText}>If you're experiencing a health emergency during your workout, activate SOS to alert emergency contacts.</Text>
          </View>

          <Text style={styles.whatTitle}>What happens when you activate SOS:</Text>
          {[
            ["call", "Emergency contacts will be called immediately"],
            ["location", "Your current location will be shared"],
            ["pulse", "Your health data will be sent to responders"],
          ].map(([icon, text]) => (
            <View key={icon} style={styles.bullet}>
              <Ionicons name={icon} size={16} color={colors.primary} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}

          {confirmation?.error && <Text style={styles.err}>{confirmation.error}</Text>}

          <TouchableOpacity style={styles.activate} onPress={activate} disabled={sending}>
            <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.activateInner}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.activateText}>Activate Emergency SOS</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", padding: spacing.md },
  fillLight: { flex: 1, backgroundColor: "#fff" },
  modal: { backgroundColor: "#fff", borderRadius: radius.xl, overflow: "hidden" },
  redHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  redIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  redTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  redSub: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  alertBox: { backgroundColor: "#FEF2F2", borderRadius: radius.md, padding: 14, marginBottom: 16 },
  alertTitle: { color: colors.red, fontWeight: "800" },
  alertText: { color: "#B91C1C", lineHeight: 20 },
  whatTitle: { fontWeight: "800", color: colors.text, fontSize: 16, marginBottom: 12 },
  bullet: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  bulletText: { color: colors.text, marginLeft: 10, flex: 1 },
  err: { color: colors.red, marginVertical: 8 },
  activate: { marginTop: 12 },
  activateInner: { paddingVertical: 16, borderRadius: radius.md, alignItems: "center" },
  activateText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cancel: { marginTop: 10, paddingVertical: 14, borderRadius: radius.md, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelText: { color: colors.text, fontWeight: "700" },
  okCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#DCFCE7", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  okTitle: { fontSize: 22, fontWeight: "800", color: colors.green, textAlign: "center" },
  okSub: { color: colors.textMuted, textAlign: "center", marginTop: 6, marginBottom: 20 },
  contactCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 12 },
  cName: { fontWeight: "700", color: colors.text },
  cMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  locCard: { flexDirection: "row", backgroundColor: "#EFF6FF", borderRadius: radius.md, padding: 14, marginTop: 6 },
  locTitle: { fontWeight: "700", color: colors.blue },
  locText: { color: colors.blue, marginTop: 2, fontSize: 13 },
  closeBtn: { backgroundColor: "#0F172A", paddingVertical: 16, borderRadius: radius.md, alignItems: "center", marginTop: 20 },
  closeText: { color: "#fff", fontWeight: "700" },
});
