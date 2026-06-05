import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api("/auth/me");
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const { token, user } = await api("/auth/login", { method: "POST", auth: false, body: { email, password } });
    await setToken(token);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { token, user } = await api("/auth/register", { method: "POST", auth: false, body: payload });
    await setToken(token);
    setUser(user);
    return user;
  }

  async function logout() {
    await setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
