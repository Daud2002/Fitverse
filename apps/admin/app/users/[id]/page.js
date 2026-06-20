"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ImageOff, ArrowLeft } from "lucide-react";
import Shell from "../../../components/Shell";
import { api, API_URL } from "../../../lib/api";

function TableSkeleton() {
  return (
    <div className="card">
      <div className="skeleton skel-row w40" />
      <div className="skeleton skel-row" />
      <div className="skeleton skel-row w60" />
      <div className="skeleton skel-row" />
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  useEffect(() => {
    if (!id) return;
    api(`/admin/users/${id}`).then((d) => setUser(d.user)).catch(() => {});
    api(`/admin/users/${id}/meals?limit=100`)
      .then((d) => setMeals(d.items))
      .catch(() => {})
      .finally(() => setLoadingMeals(false));
    api(`/admin/users/${id}/workouts?limit=100`)
      .then((d) => setWorkouts(d.items))
      .catch(() => {})
      .finally(() => setLoadingWorkouts(false));
  }, [id]);

  const done = workouts.filter((w) => w.completedAt).length;

  return (
    <Shell title={user ? user.name : "User"}>
      <div className="toolbar">
        <Link href="/users" className="btn secondary sm"><ArrowLeft size={14} strokeWidth={2} /> Back to users</Link>
      </div>

      <div className="card user-head">
        <div className="user-head-id">
          <div className="user-head-name">{user?.name || "—"}</div>
          <div className="user-head-meta">@{user?.username}</div>
          <div className="user-head-meta user-head-email">{user?.email}</div>
        </div>
        <div className="user-head-stats">
          <div className="user-stat"><span className="user-stat-num">{user?.points ?? 0}</span><span className="user-stat-lbl">Points</span></div>
          <div className="user-stat"><span className="user-stat-num">{meals.length}</span><span className="user-stat-lbl">Meals logged</span></div>
          <div className="user-stat"><span className="user-stat-num">{done}</span><span className="user-stat-lbl">Workouts done</span></div>
        </div>
      </div>

      <h2 className="section-title">Meal Log</h2>
      {loadingMeals ? (
        <TableSkeleton />
      ) : (
        <div className="card card-pad-0">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Photo</th><th>Meal</th><th>Type</th><th>Calories</th><th>P/C/F</th><th>Source</th><th>When</th></tr></thead>
              <tbody>
                {meals.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.imageUrl ? (
                        <a href={`${API_URL}${m.imageUrl}`} target="_blank" rel="noreferrer" className="meal-thumb-link">
                          <img src={`${API_URL}${m.imageUrl}`} alt={m.name} className="meal-thumb" />
                        </a>
                      ) : (
                        <span className="meal-thumb meal-thumb-empty"><ImageOff size={16} strokeWidth={2} /></span>
                      )}
                    </td>
                    <td>{m.name}</td>
                    <td>{m.mealType}</td>
                    <td>{m.calories}</td>
                    <td>{m.protein}/{m.carbs}/{m.fat}g</td>
                    <td>{m.source}{m.aiConfidence ? ` (${Math.round(m.aiConfidence * 100)}%)` : ""}</td>
                    <td>{new Date(m.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meals.length === 0 && <p className="empty">No meals logged yet.</p>}
        </div>
      )}

      <h2 className="section-title">Workouts Done</h2>
      {loadingWorkouts ? (
        <TableSkeleton />
      ) : (
        <div className="card card-pad-0">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Workout</th><th>Category</th><th>Level</th><th>Status</th><th>Calories</th><th>Progress</th><th>When</th></tr></thead>
              <tbody>
                {workouts.map((w) => (
                  <tr key={w.id}>
                    <td>{w.workoutPlan?.name || "—"}</td>
                    <td>{w.workoutPlan?.category || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{w.workoutPlan?.level || "—"}</td>
                    <td><span className={`badge ${w.completedAt ? "on" : "off"}`}>{w.completedAt ? "Done" : "In progress"}</span></td>
                    <td>{w.caloriesBurned}</td>
                    <td>{w.exercisesDone}/{w.exercisesTotal}</td>
                    <td>{new Date(w.completedAt || w.startedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {workouts.length === 0 && <p className="empty">No workouts recorded yet.</p>}
        </div>
      )}
    </Shell>
  );
}
