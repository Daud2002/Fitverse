"use client";
import { useEffect, useState } from "react";
import { Users, Dumbbell, UtensilsCrossed, Trophy, MessageSquare, Siren } from "lucide-react";
import Shell from "../../components/Shell";
import { TrendChart, DonutChart, BarList } from "../../components/Charts";
import { api } from "../../lib/api";

const CARDS = [
  { key: "users", label: "Users", Icon: Users, tint: "#6c5ce7" },
  { key: "workouts", label: "Workout Plans", Icon: Dumbbell, tint: "#4a6cf7" },
  { key: "meals", label: "Meals Logged", Icon: UtensilsCrossed, tint: "#22c55e" },
  { key: "challenges", label: "Challenges", Icon: Trophy, tint: "#f97316" },
  { key: "posts", label: "Social Posts", Icon: MessageSquare, tint: "#ec4899" },
  { key: "sos", label: "SOS Alerts", Icon: Siren, tint: "#ef4444" },
];

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    api("/admin/analytics").then((d) => setCounts(d.counts)).catch(() => {});
    api("/admin/analytics/charts").then(setCharts).catch(() => {});
  }, []);

  return (
    <Shell title="Dashboard">
      <div className="cards">
        {CARDS.map((c) => (
          <div className="stat-card" key={c.key}>
            <span className="stat-ico" style={{ background: `${c.tint}1a`, color: c.tint }}>
              <c.Icon size={24} strokeWidth={2.2} />
            </span>
            <div className="stat-body">
              <div className="value">{counts[c.key] ?? "—"}</div>
              <div className="label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="chart-header">
          <h3 style={{ margin: 0 }}>Activity — last 14 days</h3>
          <span className="muted" style={{ fontSize: 13 }}>New signups &amp; meals logged per day</span>
        </div>
        {charts ? (
          <TrendChart
            data={charts.trend}
            series={[
              { key: "users", label: "New users" },
              { key: "meals", label: "Meals logged" },
            ]}
          />
        ) : (
          <div className="skeleton skel-card" style={{ height: 240 }} />
        )}
      </div>

      {/* Breakdowns */}
      <div className="chart-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Meals by type</h3>
          {charts ? <BarList data={charts.mealsByType} /> : <div className="skeleton skel-card" />}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Meal source</h3>
          {charts ? <DonutChart data={charts.mealsBySource} /> : <div className="skeleton skel-card" />}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Users by gender</h3>
          {charts ? <DonutChart data={charts.usersByGender} /> : <div className="skeleton skel-card" />}
        </div>
      </div>
    </Shell>
  );
}
