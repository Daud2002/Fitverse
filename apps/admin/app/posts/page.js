"use client";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { api } from "../../lib/api";

export default function Posts() {
  const [items, setItems] = useState([]);
  async function load() {
    const d = await api("/admin/posts");
    setItems(d.items);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function remove(id) {
    if (!confirm("Remove this post?")) return;
    await api(`/admin/posts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Shell title="Social Moderation">
      <div className="card card-pad-0">
        <div className="table-wrap">
        <table>
          <thead><tr><th>Author</th><th>Content</th><th>Posted</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.user?.name} (@{p.user?.username})</td>
                <td style={{ maxWidth: 500 }}>{p.content}</td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td><button className="btn sm danger" onClick={() => remove(p.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {items.length === 0 && <p className="empty">No posts yet.</p>}
      </div>
    </Shell>
  );
}
