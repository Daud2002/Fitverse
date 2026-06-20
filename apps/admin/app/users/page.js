"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

export default function Users() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  async function load() {
    const d = await api(`/admin/users?q=${encodeURIComponent(q)}&limit=100`);
    setItems(d.items);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function toggle(u) {
    await api(`/admin/users/${u.id}`, { method: "PATCH", body: { isActive: !u.isActive } });
    load();
  }

  return (
    <Shell title="Users">
      <div className="toolbar">
        <input className="input" style={{ marginBottom: 0, maxWidth: 320 }} placeholder="Search name, email, username" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => load()}>Search</button>
      </div>
      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Email</th><th>Gender</th><th>Role</th><th>Points</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td><Link href={`/users/${u.id}`} className="user-link">{u.name}</Link></td>
                <td>@{u.username}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: "capitalize" }}>{u.gender}</td>
                <td>{u.role}</td>
                <td>{u.points}</td>
                <td><span className={`badge ${u.isActive ? "on" : "off"}`}>{u.isActive ? "Active" : "Disabled"}</span></td>
                <td>
                  <Link href={`/users/${u.id}`} className="btn sm secondary">View</Link>
                  {u.role !== "admin" && (
                    <button className={`btn sm ${u.isActive ? "danger" : "secondary"}`} style={{ marginLeft: 8 }} onClick={() => toggle(u)}>
                      {u.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <p className="empty">No users found.</p>}
      </div>
    </Shell>
  );
}
