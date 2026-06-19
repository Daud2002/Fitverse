import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { useAuth } from "./auth";
import { colors } from "./theme";

const POLL_MS = 60 * 1000; // poll every minute

// Wraps the app and enforces the LET_THEM_WORK kill-switch. Silently polls /system/status
// every minute. When the server reports letThemWork:false, the user is force-logged-out and
// a blocking "APP IS UNDER MAINTENANCE" screen is shown. It keeps polling so the app
// automatically recovers when the switch is turned back on.
export function MaintenanceGate({ children }) {
  const { logout } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const { letThemWork } = await api("/system/status", { auth: false });
        if (!active) return;
        if (letThemWork === false) {
          setBlocked(true);
          // Force logout so no session survives the maintenance window.
          try { await logoutRef.current?.(); } catch {}
        } else {
          setBlocked(false);
        }
      } catch {
        // Network/server error: do not lock the user out on a failed check.
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (blocked) return <MaintenanceScreen />;
  return children;
}

function MaintenanceScreen() {
  return (
    <View style={styles.fill}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={48} color="#fff" />
      </View>
      <Text style={styles.title}>APP ACCESS IS DENIED</Text>
      <Text style={styles.subtitle}>
        Access to the app is currently unavailable. Please check back shortly — the app will resume automatically.
      </Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 12, lineHeight: 20 },
});
