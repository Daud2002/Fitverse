"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { api, setToken } from "../../lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@fitverse.com");
  const [password, setPassword] = useState("Pass123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api("/auth/login", { method: "POST", body: { email, password } });
      if (user.role !== "admin") throw new Error("This account is not an admin.");
      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="login-mark"><Activity size={24} strokeWidth={2.5} /></span>
          <h1>FitVerse Admin</h1>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>Sign in to manage the platform</p>
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
