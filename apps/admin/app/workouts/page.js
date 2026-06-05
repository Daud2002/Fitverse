"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api, API_URL } from "../../lib/api";

const EMPTY = { name: "", category: "Cardio", durationMin: 30, caloriesEst: 200, level: "easy", exercises: [] };

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
      ...(editing.imageBase64 ? { imageBase64: editing.imageBase64 } : {}),
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

  async function onImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setEditing((s) => ({ ...s, imageBase64: dataUrl }));
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

          <Field label="Plan name" hint="Shown as the workout title">
            <input className="input" placeholder="e.g. Full Body Strength" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>

          <div className="form-grid">
            <Field label="Category">
              <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {["Cardio", "Strength", "Flexibility"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Difficulty level">
              <select className="input" value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value })}>
                {["easy", "medium", "hard"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Duration (minutes)">
              <input className="input" type="number" placeholder="30" value={editing.durationMin} onChange={(e) => setEditing({ ...editing, durationMin: e.target.value })} />
            </Field>
            <Field label="Calories burned">
              <input className="input" type="number" placeholder="200" value={editing.caloriesEst} onChange={(e) => setEditing({ ...editing, caloriesEst: e.target.value })} />
            </Field>
          </div>

          <div className="workout-image-field">
            <label className="field-label">Cover image</label>
            <p className="field-hint">Saved to the backend and shown on the workout card in the mobile app.</p>
            <div className="workout-image-row">
              {(editing.imageBase64 || editing.imageUrl) ? (
                <img
                  src={editing.imageBase64 || `${API_URL}${editing.imageUrl}`}
                  alt="Workout cover"
                  className="workout-image-preview"
                />
              ) : (
                <div className="workout-image-preview workout-image-empty">No image</div>
              )}
              <div>
                <input id="workout-image" type="file" accept="image/*" onChange={onImage} style={{ display: "none" }} />
                <label htmlFor="workout-image" className="btn secondary sm" style={{ cursor: "pointer" }}>
                  {(editing.imageBase64 || editing.imageUrl) ? "Change image" : "Upload image"}
                </label>
                {(editing.imageBase64 || editing.imageUrl) && (
                  <button
                    type="button"
                    className="btn sm danger"
                    style={{ marginLeft: 8 }}
                    onClick={() => setEditing((s) => ({ ...s, imageBase64: null, imageUrl: null }))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <h4 style={{ marginBottom: 4 }}>Exercises</h4>
          <p className="field-hint" style={{ marginTop: 0 }}>Each exercise can include a YouTube video URL for a demo.</p>
          {editing.exercises.length > 0 && (
            <div className="ex-grid ex-grid-head">
              <span>Exercise name</span>
              <span>Sets</span>
              <span>Reps</span>
              <span>Timer (s)</span>
              <span>Video URL</span>
              <span></span>
            </div>
          )}
          {editing.exercises.map((ex, i) => (
            <div key={i} className="ex-grid">
              <input className="input" placeholder="e.g. Push-ups" value={ex.name} onChange={(e) => setEx(i, "name", e.target.value)} />
              <input className="input" type="number" placeholder="3" value={ex.sets || ""} onChange={(e) => setEx(i, "sets", e.target.value)} />
              <input className="input" type="number" placeholder="10" value={ex.reps || ""} onChange={(e) => setEx(i, "reps", e.target.value)} />
              <input className="input" type="number" placeholder="—" value={ex.timerSeconds || ""} onChange={(e) => setEx(i, "timerSeconds", e.target.value)} />
              <input className="input" placeholder="https://youtube.com/watch?v=..." value={ex.videoUrl || ""} onChange={(e) => setEx(i, "videoUrl", e.target.value)} />
              <button type="button" className="btn sm danger" title="Remove exercise" onClick={() => setEditing((s) => ({ ...s, exercises: s.exercises.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          <button className="btn secondary sm" style={{ marginTop: 4 }} onClick={() => setEditing({ ...editing, exercises: [...editing.exercises, { name: "", sets: 3, reps: 10 }] })}>+ Add exercise</button>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Level</th><th>Duration</th><th>Exercises</th><th>Owner</th><th></th></tr></thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id}>
                <td>
                  {w.imageUrl ? (
                    <img src={`${API_URL}${w.imageUrl}`} alt={w.name} className="meal-thumb" />
                  ) : (
                    <span className="meal-thumb meal-thumb-empty">—</span>
                  )}
                </td>
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

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
