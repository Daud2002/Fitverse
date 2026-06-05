"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

const EMPTY = { title: "", description: "", type: "personal", goalValue: 100, unit: "points", points: 100, durationDays: 30 };

export default function Challenges() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);

  async function load() {
    const d = await api("/admin/challenges");
    setItems(d.items);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function save() {
    await api("/admin/challenges", {
      method: "POST",
      body: {
        ...form,
        goalValue: Number(form.goalValue),
        points: Number(form.points),
        durationDays: Number(form.durationDays),
      },
    });
    setForm(null);
    load();
  }

  async function remove(id) {
    if (!confirm("Delete challenge?")) return;
    await api(`/admin/challenges/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Shell title="Challenges">
      <div className="toolbar">
        <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ New challenge</button>
      </div>

      {form && (
        <div className="card" style={{ marginBottom: 20 }}>
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="form-grid">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="personal">personal</option>
              <option value="community">community</option>
            </select>
            <input className="input" placeholder="Goal value" type="number" value={form.goalValue} onChange={(e) => setForm({ ...form, goalValue: e.target.value })} />
            <input className="input" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <input className="input" placeholder="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
            <input className="input" placeholder="Days" type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Goal</th><th>Points</th><th>Days</th><th>Participants</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.type}</td>
                <td>{c.goalValue} {c.unit}</td>
                <td>{c.points}</td>
                <td>{c.durationDays}</td>
                <td>{c._count?.participants ?? 0}</td>
                <td><button className="btn sm danger" onClick={() => remove(c.id)}>Del</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <p className="empty">No challenges yet.</p>}
      </div>
    </Shell>
  );
}
