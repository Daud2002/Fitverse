"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

export default function Sos() {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/admin/sos").then((d) => setItems(d.items)).catch(() => {}); }, []);

  return (
    <Shell title="SOS Incident Log">
      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Status</th><th>Location</th><th>Contact Notified</th><th>When</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.user?.name} (@{s.user?.username})</td>
                <td><span className={`badge ${s.status === "no_contact" ? "off" : "on"}`}>{s.status}</span></td>
                <td>{s.address || `${s.lat}, ${s.lng}`}</td>
                <td>{s.contactNotified ? "Yes" : "No"}</td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <p className="empty">No SOS incidents recorded.</p>}
      </div>
    </Shell>
  );
}
