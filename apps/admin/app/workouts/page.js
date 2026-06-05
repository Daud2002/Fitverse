"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

const EMPTY = { name: "", category: "Cardio", durationMin: 30, caloriesEst: 200, level: "easy", exercises: [] };

export default function Workouts() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  async function load() {
    const d = await api("/admin/workouts?limit=100");
    setItems(d.items);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function save() {
    const body = {
      name: editing.name,
      category: editing.category,
      durationMin: Number(editing.durationMin),
      caloriesEst: Number(editing.caloriesEst),
      level: editing.level,
      exercises: editing.exercises.map((e) => ({
        name: e.name,
        sets: Number(e.sets) || 3,
        reps: Number(e.reps) || 10,
        restSeconds: Number(e.restSeconds) || 30,
        timerSeconds: e.timerSeconds ? Number(e.timerSeconds) : null,
        videoUrl: e.videoUrl || null,
      })),
    };
    if (editing.id) await api(`/admin/workouts/${editing.id}`, { method: "PUT", body });
    else await api("/admin/workouts", { method: "POST", body });
    setEditing(null);
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this plan?")) return;
    await api(`/admin/workouts/${id}`, { method: "DELETE" });
    load();
  }

  function setEx(i, k, v) {
    setEditing((s) => {
      const ex = [...s.exercises];
      ex[i] = { ...ex[i], [k]: v };
      return { ...s, exercises: ex };
    });
  }

  return (
    <Shell title="Workout Plans">
      <div className="toolbar">
        <button className="btn" onClick={() => setEditing({ ...EMPTY, exercises: [] })}>+ New stock plan</button>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{editing.id ? "Edit plan" : "New plan"}</h3>
          <input className="input" placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <div className="form-grid">
            <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              {["Cardio", "Strength", "Flexibility"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="input" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value })}>
              {["easy", "medium", "hard"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="input" type="number" placeholder="Duration (min)" value={editing.durationMin} onChange={(e) => setEditing({ ...editing, durationMin: e.target.value })} />
            <input className="input" type="number" placeholder="Calories" value={editing.caloriesEst} onChange={(e) => setEditing({ ...editing, caloriesEst: e.target.value })} />
          </div>

          <h4>Exercises (with video URLs)</h4>
          {editing.exercises.map((ex, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" placeholder="Name" value={ex.name} onChange={(e) => setEx(i, "name", e.target.value)} />
              <input className="input" style={{ maxWidth: 70 }} placeholder="sets" value={ex.sets || ""} onChange={(e) => setEx(i, "sets", e.target.value)} />
              <input className="input" style={{ maxWidth: 70 }} placeholder="reps" value={ex.reps || ""} onChange={(e) => setEx(i, "reps", e.target.value)} />
              <input className="input" style={{ maxWidth: 90 }} placeholder="timer s" value={ex.timerSeconds || ""} onChange={(e) => setEx(i, "timerSeconds", e.target.value)} />
              <input className="input" placeholder="video URL" value={ex.videoUrl || ""} onChange={(e) => setEx(i, "videoUrl", e.target.value)} />
            </div>
          ))}
          <button className="btn secondary sm" onClick={() => setEditing({ ...editing, exercises: [...editing.exercises, { name: "", sets: 3, reps: 10 }] })}>+ Add exercise</button>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Level</th><th>Duration</th><th>Exercises</th><th>Owner</th><th></th></tr></thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id}>
                <td>
                  {w.name}{" "}
                  {w.isAiGenerated ? (
                    <span className="tag tag-ai">AI</span>
                  ) : w.isStock ? (
                    <span className="tag tag-stock">Stock</span>
                  ) : null}
                </td>
                <td>{w.category}</td>
                <td style={{ textTransform: "capitalize" }}>{w.level}</td>
                <td>{w.durationMin} min</td>
                <td>{w.exercises.length}</td>
                <td>{w.user?.name || "Stock"}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn sm secondary" onClick={() => setEditing({ ...w, durationMin: w.durationMin, caloriesEst: w.caloriesEst })}>Edit</button>
                  <button className="btn sm danger" onClick={() => remove(w.id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <p className="empty">No workout plans yet.</p>}
      </div>
    </Shell>
  );
}
