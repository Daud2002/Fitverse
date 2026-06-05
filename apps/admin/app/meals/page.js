"use client";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import Shell from "../../components/Shell";
import { api, API_URL } from "../../lib/api";

export default function Meals() {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/admin/meals?limit=100").then((d) => setItems(d.items)).catch(() => {}); }, []);

  const recognized = items.filter((m) => m.source === "photo");
  const avgConf = recognized.length
    ? Math.round((recognized.reduce((s, m) => s + (m.aiConfidence || 0), 0) / recognized.length) * 100)
    : 0;

  return (
    <Shell title="Meals">
      <div className="cards">
        <div className="stat-card"><div className="value">{items.length}</div><div className="label">Total meals</div></div>
        <div className="stat-card"><div className="value">{recognized.length}</div><div className="label">Photo-recognized</div></div>
        <div className="stat-card"><div className="value">{avgConf}%</div><div className="label">Avg recognition confidence</div></div>
      </div>
      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Photo</th><th>User</th><th>Meal</th><th>Type</th><th>Calories</th><th>P/C/F</th><th>Source</th><th>When</th></tr></thead>
          <tbody>
            {items.map((m) => (
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
                <td>{m.user?.name}</td>
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
        {items.length === 0 && <p className="empty">No meals logged yet.</p>}
      </div>
    </Shell>
  );
}
