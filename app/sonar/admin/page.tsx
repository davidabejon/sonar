"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";

type User = { id: string; email: string; username: string; createdAt: string };
type Rating = { id: string; userId: string; entryId: string; entryType: string; score: number; notes?: string; createdAt: string; title?: string; image?: string; user?: { username: string; email?: string } };

const Icon = {
  ChevronLeft: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Trash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  Edit: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19H4v-3L16.5 3.5z" />
    </svg>
  ),
};

export default function AdminPanel() {
  const router = useRouter();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"users" | "ratings">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<{ username?: string; email?: string }>({});
  const [userPage, setUserPage] = useState(1);
  const [ratingPage, setRatingPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [ratingTotal, setRatingTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const itemsPerPage = 10;

  // Check if admin
  useEffect(() => {
    fetch("/api/admin/check")
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin) {
          router.push("/sonar/settings");
        } else {
          setIsAdmin(true);
          loadData();
        }
        setLoading(false);
      })
      .catch(() => router.push("/sonar/settings"));
  }, []);

  // Load users when page changes
  useEffect(() => {
    if (tab === "users" && isAdmin) loadUsers();
  }, [userPage, isAdmin, tab]);

  // Load ratings when page changes
  useEffect(() => {
    if (tab === "ratings" && isAdmin) loadRatings();
  }, [ratingPage, isAdmin, tab]);

  // Debounce search query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 500);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${userPage}&limit=${itemsPerPage}${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""}`);
      const data = await res.json();
      setUsers(data.items || []);
      setUserTotal(data.total || 0);
    } catch (e) {
      console.error("Error loading users:", e);
    }
  };

  const loadRatings = async () => {
    try {
      const res = await fetch(`/api/admin/ratings?page=${ratingPage}&limit=${itemsPerPage}${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""}`);
      const data = await res.json();
      const items: Rating[] = data.items || [];
      // Enrich ratings with Spotify metadata in parallel
      try {
        const spotify = await import("../lib/spotify");
        const lookups = items.map(async (r) => {
          try {
            if (r.entryType === "track") {
              const t = await spotify.lookupTrack(r.entryId);
              const imageUrl = t?.image ?? t?.album?.images?.[0]?.url ?? t?.images?.[0]?.url ?? null;
              return { ...r, title: t?.name ?? r.entryId, image: imageUrl };
            }
            if (r.entryType === "album") {
              const a = await spotify.lookupAlbum(r.entryId);
              const imageUrl = a?.image ?? a?.images?.[0]?.url ?? null;
              return { ...r, title: a?.name ?? r.entryId, image: imageUrl };
            }
            if (r.entryType === "artist") {
              const ar = await spotify.lookupArtist(r.entryId);
              const imageUrl = ar?.image ?? ar?.images?.[0]?.url ?? null;
              return { ...r, title: ar?.name ?? r.entryId, image: imageUrl };
            }
          } catch (e) {
            return r;
          }
          return r;
        });
        const enriched = await Promise.all(lookups);
        setRatings(enriched as Rating[]);
      } catch (e) {
        // If spotify helper fails, fall back to raw items
        console.error("Spotify enrichment failed:", e);
        setRatings(items);
      }
      setRatingTotal(data.total || 0);
    } catch (e) {
      console.error("Error loading ratings:", e);
    }
  };

  const loadData = async () => {
    await loadUsers();
    await loadRatings();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setUserTotal(userTotal - 1);
        alert("Usuario eliminado correctamente");
      } else {
        alert("Error al eliminar usuario");
      }
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  const handleEditUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserData),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map(u => u.id === id ? { ...u, email: updated.email, username: updated.username } : u));
        setEditingUserId(null);
        setEditUserData({});
        alert("Usuario actualizado correctamente");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Error al actualizar usuario");
      }
    } catch (e) {
      console.error("Error updating user:", e);
    }
  };

  const handleDeleteRating = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este rating?")) return;
    try {
      const res = await fetch(`/api/ratings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRatings(ratings.filter(r => r.id !== id));
        setRatingTotal(ratingTotal - 1);
        alert("Rating eliminado correctamente");
      } else {
        alert("Error al eliminar rating");
      }
    } catch (e) {
      console.error("Error deleting rating:", e);
    }
  };

  const handleEditRating = async (id: string) => {
    try {
      const res = await fetch(`/api/ratings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setRatings(ratings.map(r => r.id === id ? updated : r));
        setEditingId(null);
        setEditData({});
        alert("Rating actualizado correctamente");
      } else {
        alert("Error al actualizar rating");
      }
    } catch (e) {
      console.error("Error updating rating:", e);
    }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: COLORS.text }}>Cargando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const css = `
    .tab-button {
      padding: 12px 20px; border: none; background: none; cursor: pointer;
      font-size: 15px; font-weight: 500; border-bottom: 2px solid transparent;
      transition: all 0.2s; color: ${COLORS.textTertiary};
    }
    .tab-button.active {
      color: ${COLORS.accent}; border-bottom-color: ${COLORS.accent};
    }

    .admin-card {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 14px; padding: 16px;
      margin-bottom: 12px;
    }

    .admin-row {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; flex-wrap: wrap;
    }

    .admin-action {
      display: flex; gap: 8px;
    }

    .btn-small {
      padding: 8px 12px; border: none; border-radius: 8px;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
      background: ${COLORS.surface}; color: ${COLORS.text};
      border: 0.5px solid ${COLORS.glassBorder};
    }

    .btn-small:hover { background: ${COLORS.surfaceHover}; }
    .btn-small.danger { color: #FF6B6B; }

    .input-small {
      padding: 8px 12px; border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 8px; background: ${COLORS.surface};
      color: ${COLORS.text}; font-size: 14px;
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="content-area" style={{ paddingTop: 12, maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `0.5px solid ${COLORS.glassBorder}`, marginBottom: 24 }}>
          <button
            className={`tab-button ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            Usuarios
          </button>
          <button
            className={`tab-button ${tab === "ratings" ? "active" : ""}`}
            onClick={() => setTab("ratings")}
          >
            Ratings
          </button>
        </div>

        {/* (Search input removed — title & back button are in top bar) */}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <p style={{ color: COLORS.textSecondary, marginBottom: 16 }}>
              Total de usuarios: {userTotal}
            </p>
            {users.map(user => (
              <div key={user.id} className="admin-card">
                {editingUserId === user.id ? (
                  <div className="admin-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
                    <input
                      className="input-small"
                      value={editUserData.username ?? user.username}
                      onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                      placeholder="Nombre de usuario"
                    />
                    <input
                      className="input-small"
                      value={editUserData.email ?? user.email}
                      onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                      placeholder="Correo electrónico"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-small" onClick={() => handleEditUser(user.id)} style={{ background: COLORS.accent, color: "white" }}>Guardar</button>
                      <button className="btn-small" onClick={() => { setEditingUserId(null); setEditUserData({}); }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-row">
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.username}</div>
                      <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{user.email}</div>
                    </div>
                    <div className="admin-action">
                      <button className="btn-small" onClick={() => { setEditingUserId(user.id); setEditUserData({ username: user.username, email: user.email }); }}>
                        <Icon.Edit />
                      </button>
                      <button
                        className="btn-small danger"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Icon.Trash />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, color: COLORS.textSecondary, fontSize: 14 }}>
              <button
                onClick={() => setUserPage(Math.max(1, userPage - 1))}
                disabled={userPage === 1}
                style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${COLORS.glassBorder}`, background: COLORS.surface, cursor: userPage === 1 ? "default" : "pointer", opacity: userPage === 1 ? 0.5 : 1 }}
              >
                Anterior
              </button>
              <span>Página {userPage} de {Math.ceil(userTotal / itemsPerPage)}</span>
              <button
                onClick={() => setUserPage(userPage + 1)}
                disabled={userPage >= Math.ceil(userTotal / itemsPerPage)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${COLORS.glassBorder}`, background: COLORS.surface, cursor: userPage >= Math.ceil(userTotal / itemsPerPage) ? "default" : "pointer", opacity: userPage >= Math.ceil(userTotal / itemsPerPage) ? 0.5 : 1 }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {tab === "ratings" && (
          <div>
            <p style={{ color: COLORS.textSecondary, marginBottom: 16 }}>
              Total de ratings: {ratingTotal}
            </p>
            {ratings.map(rating => (
              <div key={rating.id} className="admin-card">
                {editingId === rating.id ? (
                  <div className="admin-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: "100%", display: "flex", gap: 12 }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input-small"
                        value={editData.score ?? rating.score}
                        onChange={(e) => setEditData({ ...editData, score: parseInt(e.target.value) })}
                        style={{ flex: 1 }}
                        placeholder="Score"
                      />
                    </div>
                    <input
                      type="text"
                      className="input-small"
                      value={editData.notes ?? rating.notes ?? ""}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      style={{ width: "100%" }}
                      placeholder="Notas"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-small"
                        onClick={() => handleEditRating(rating.id)}
                        style={{ background: COLORS.accent, color: "white" }}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn-small"
                        onClick={() => {
                          setEditingId(null);
                          setEditData({});
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: COLORS.surface, flex: "0 0 56px" }}>
                        {rating.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rating.image} alt={rating.title ?? rating.entryId} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textTertiary, fontSize: 12 }}>
                            {rating.entryType}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{rating.title ?? `${rating.entryType}: ${rating.entryId}`}</div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                          <span style={{ marginRight: 8 }}>Score: {rating.score}/100</span>
                          · {rating.notes ? `Notas: ${rating.notes}` : "Sin notas"}
                        </div>
                        {rating.user && (
                          <div style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 6 }}>
                            Usuario: {rating.user.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="admin-action">
                      <button
                        className="btn-small"
                        onClick={() => {
                          setEditingId(rating.id);
                          setEditData({ score: rating.score, notes: rating.notes });
                        }}
                      >
                        <Icon.Edit />
                      </button>
                      <button
                        className="btn-small danger"
                        onClick={() => handleDeleteRating(rating.id)}
                      >
                        <Icon.Trash />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, color: COLORS.textSecondary, fontSize: 14 }}>
              <button
                onClick={() => setRatingPage(Math.max(1, ratingPage - 1))}
                disabled={ratingPage === 1}
                style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${COLORS.glassBorder}`, background: COLORS.surface, cursor: ratingPage === 1 ? "default" : "pointer", opacity: ratingPage === 1 ? 0.5 : 1 }}
              >
                Anterior
              </button>
              <span>Página {ratingPage} de {Math.ceil(ratingTotal / itemsPerPage)}</span>
              <button
                onClick={() => setRatingPage(ratingPage + 1)}
                disabled={ratingPage >= Math.ceil(ratingTotal / itemsPerPage)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${COLORS.glassBorder}`, background: COLORS.surface, cursor: ratingPage >= Math.ceil(ratingTotal / itemsPerPage) ? "default" : "pointer", opacity: ratingPage >= Math.ceil(ratingTotal / itemsPerPage) ? 0.5 : 1 }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
