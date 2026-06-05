"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Heart, MessageSquare, ImageOff } from "lucide-react";
import Shell from "../../components/Shell";
import { api, API_URL } from "../../lib/api";

export default function Posts() {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);

  async function load() {
    const d = await api("/admin/posts");
    setItems(d.items);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function remove(id) {
    if (!confirm("Remove this post?")) return;
    await api(`/admin/posts/${id}`, { method: "DELETE" });
    if (openId === id) setOpenId(null);
    load();
  }

  function toggle(id) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <Shell title="Social Moderation">
      <div className="card card-pad-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Author</th>
                <th>Content</th>
                <th>Media</th>
                <th>Engagement</th>
                <th>Posted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const open = openId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr className="post-row" onClick={() => toggle(p.id)}>
                      <td>
                        <span className="post-chevron">
                          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                      </td>
                      <td>{p.user?.name} <span className="muted">@{p.user?.username}</span></td>
                      <td style={{ maxWidth: 420 }}>
                        <span className="post-snippet">{p.content?.trim() || <span className="muted">(no text)</span>}</span>
                      </td>
                      <td>
                        {p.imageUrl
                          ? <span className="tag tag-ai">Image</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td className="muted">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginRight: 12 }}>
                          <Heart size={14} /> {p.likeCount}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <MessageSquare size={14} /> {p.commentCount}
                        </span>
                      </td>
                      <td className="muted">{new Date(p.createdAt).toLocaleString()}</td>
                      <td>
                        <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); remove(p.id); }}>Remove</button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="post-detail-row">
                        <td colSpan={7}>
                          <div className="post-detail">
                            <div className="post-detail-media">
                              {p.imageUrl ? (
                                <a href={`${API_URL}${p.imageUrl}`} target="_blank" rel="noreferrer">
                                  <img src={`${API_URL}${p.imageUrl}`} alt="Post media" className="post-detail-img" />
                                </a>
                              ) : (
                                <div className="post-detail-img post-detail-img-empty">
                                  <ImageOff size={28} strokeWidth={1.6} />
                                  <span>No image</span>
                                </div>
                              )}
                            </div>
                            <div className="post-detail-body">
                              <div className="post-detail-author">
                                {p.user?.name} <span className="muted">@{p.user?.username}</span>
                              </div>
                              {p.user?.email && <div className="muted" style={{ fontSize: 13 }}>{p.user.email}</div>}
                              <p className="post-detail-content">{p.content?.trim() || <span className="muted">(no text content)</span>}</p>
                              <div className="post-detail-stats">
                                <span className="post-stat"><Heart size={15} /> {p.likeCount} likes</span>
                                <span className="post-stat"><MessageSquare size={15} /> {p.commentCount} comments</span>
                                <span className="badge on" style={{ textTransform: "capitalize" }}>{p.visibility}</span>
                              </div>
                              <div className="post-detail-meta">
                                <span><strong>Posted:</strong> {new Date(p.createdAt).toLocaleString()}</span>
                              </div>
                              <button className="btn sm danger" style={{ marginTop: 14 }} onClick={() => remove(p.id)}>Remove post</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <p className="empty">No posts yet.</p>}
      </div>
    </Shell>
  );
}
