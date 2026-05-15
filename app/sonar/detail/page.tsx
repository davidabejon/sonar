"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";
import { lookupTrack, lookupArtist, lookupAlbum } from "../lib/spotify";
import { saveRating, getRating, deleteRating } from "../lib/ratings";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreToColor(score: number): string {
  const t = Math.min(Math.max(score, 0), 10) / 10;
  if (t <= 0.5) {
    const s = t * 2;
    const r = Math.round(220 + (255 - 220) * (1 - s));
    const g = Math.round(70  + (185 - 70)  * s);
    const b = Math.round(50  + (30  - 50)  * s);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(255 - (255 - 80)  * s);
    const g = Math.round(185 + (210 - 185) * s);
    const b = Math.round(30  + (80  - 30)  * s);
    return `rgb(${r},${g},${b})`;
  }
}

function ScoreRing({ score, isDark }: { score: number; isDark: boolean }) {
  const color = scoreToColor(score);
  const offset = CIRCUMFERENCE * (1 - score / 10);
  const trackStroke = isDark ? "rgba(255,255,255,0.15)" : "rgba(80,60,160,0.15)";

  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg
        width={56}
        height={56}
        viewBox="0 0 48 48"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={24} cy={24} r={RADIUS}
          fill="none"
          stroke={trackStroke}
          strokeWidth={3.5}
        />
        <circle
          cx={24} cy={24} r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.4s cubic-bezier(.4,0,.2,1), stroke 0.4s ease",
          }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          color,
          letterSpacing: "-0.5px",
          transition: "color 0.4s ease",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function AlbumArt({ color, size = 52, src, alt }: { color: string; size?: number; src?: string | null; alt?: string }) {
  return (
    <div className="album-art" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}33, ${color}11)`, borderColor: `${color}22`, overflow: 'hidden' }}>
      {src ? (
        <img src={src} alt={alt || "cover"} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : null}
    </div>
  );
}

const Icon = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

export default function Detail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);
  
  const entityId = searchParams.get("id");
  const entityType = searchParams.get("type") || "track";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(5);
  const [scoreInput, setScoreInput] = useState("5");
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = ["#FF6B6B", "#A78BFA", "#34D399", "#FBBF24", "#F97316", "#60A5FA"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  useEffect(() => {
    const fetchData = async () => {
      if (!entityId) return;
      setLoading(true);
      setError(null);
      
      try {
        let result = null;
        
        if (entityType === "track") {
          result = await lookupTrack(entityId);
        } else if (entityType === "artist") {
          result = await lookupArtist(entityId);
        } else if (entityType === "album") {
          result = await lookupAlbum(entityId);
        }
        
        setData(result);

        // Cargar rating existente
        try {
          const existingRating = await getRating(entityId, entityType as "track" | "album" | "artist");
          if (existingRating && typeof existingRating.score === "number") {
            const normalized = existingRating.score / 10;
            setScore(normalized);
            setScoreInput(normalized.toFixed(1));
            setNote(existingRating.notes ?? "");
            setAdded(true);
          }
        } catch (err) {
          console.error("Error loading existing rating:", err);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("No se pudo cargar la información");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entityId, entityType]);

  const css = `
    .glass-card {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 20px;
      backdrop-filter: blur(20px);
      transition: all 0.2s;
    }
    .glass-card:hover { background: ${COLORS.surfaceHover}; }

    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      color: ${COLORS.textTertiary}; text-transform: uppercase;
      margin-bottom: 12px;
    }

    .tag {
      display: inline-flex; align-items: center;
      padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 500;
      background: rgba(167,139,250,0.12);
      border: 0.5px solid rgba(167,139,250,0.25);
      color: ${COLORS.accent};
    }

    .score-badge {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #A78BFA22, #6366F122);
      border: 1px solid rgba(167,139,250,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 600; color: ${COLORS.accent};
    }

    .list-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-bottom: 0.5px solid ${COLORS.glassBorder};
      cursor: pointer; transition: opacity 0.15s;
    }
    .list-row:hover { opacity: 0.75; }
    .list-row:last-child { border-bottom: none; }

    .album-art {
      border-radius: 12px; overflow: hidden;
      flex-shrink: 0; background: ${COLORS.surface};
      display: flex; align-items: center; justify-content: center;
      border: 0.5px solid ${COLORS.glassBorder};
    }

    .btn-primary {
      background: linear-gradient(135deg, #A78BFA, #6366F1);
      border: none; border-radius: 14px;
      color: white; font-size: 15px; font-weight: 500;
      padding: 14px 24px; width: 100%; cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      box-shadow: 0 8px 32px rgba(99,102,241,0.35);
    }
    .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary.success { background: linear-gradient(135deg, #34D399, #059669) !important; box-shadow: 0 8px 32px rgba(52,211,153,0.3) !important; }

    .input-field {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 14px; color: ${COLORS.text};
      font-size: 16px; padding: 16px 18px; width: 100%;
      outline: none; transition: border-color 0.2s, background 0.2s;
      font-family: inherit;
    }
    .input-field:focus { border-color: rgba(167,139,250,0.5); background: ${COLORS.surfaceHover}; }
    .input-field::placeholder { color: ${COLORS.textTertiary}; }

    textarea.input-field { resize: none; min-height: 90px; }

    .score-input {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 14px; color: ${COLORS.text};
      font-size: 18px; padding: 14px 16px; width: 100%;
      outline: none;
      backdrop-filter: blur(16px) saturate(1.6);
      -webkit-backdrop-filter: blur(16px) saturate(1.6);
      box-shadow: ${COLORS.cardShadow};
      text-align: center; font-weight: 500; font-family: monospace;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    }
    .score-input:focus { border-color: rgba(167,139,250,0.55); background: ${COLORS.surfaceHover}; box-shadow: 0 0 0 3px ${COLORS.accentGlow}, ${COLORS.cardShadow}; }
    .score-input::placeholder { color: ${COLORS.textTertiary}; }

    .loader {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; gap: 16px;
    }
    .loader svg { animation: spin 2s linear infinite; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  const handleAdd = async () => {
    if (!entityId) return;

    setSaving(true);
    setError(null);

    try {
      await saveRating(entityId, entityType as "track" | "album" | "artist", Math.round(score * 10), note);
      setAdded(true);
    } catch (err: any) {
      setError(err.message || "Error al guardar la valoración");
      console.error("Error saving rating:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="loader">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 40, height: 40, color: COLORS.accent }}>
              <circle cx="12" cy="12" r="10" />
            </svg>
            <p style={{ color: COLORS.textTertiary }}>Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <style>{css}</style>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="loader">
            <p style={{ color: COLORS.textTertiary }}>
              {error || "No se pudo cargar la información"}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Renderizar según tipo de entidad
  let title = "", subtitle = "", description = "";
  
  if (entityType === "track") {
    title = data.name;
    subtitle = data.artist;
    description = `${data.album} · ${data.release_date?.substring(0, 4) || ""}`;
  } else if (entityType === "artist") {
    title = data.name;
    subtitle = data.genres?.slice(0, 2).join(", ") || "Artista";
    description = data.followers > 0 ? `${data.followers.toLocaleString()} seguidores` : "";
  } else if (entityType === "album") {
    title = data.name;
    subtitle = data.artist;
    description = `${data.album_type || "Album"} · ${data.release_date?.substring(0, 4) || ""}`;
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Hero */}
        <div style={{
          background: `linear-gradient(180deg, ${randomColor}22 0%, transparent 100%)`,
          padding: "32px 20px 24px",
          display: "flex", gap: 20, alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <AlbumArt color={randomColor} size={100} src={data?.image} alt={title} />
          <div style={{ flex: 1 }}>
            <div className="tag" style={{ marginBottom: 8, fontSize: 11 }}>{entityType === "track" ? "Canción" : entityType === "artist" ? "Artista" : "Álbum"}</div>
            <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: -0.3, lineHeight: 1.2, marginBottom: 6 }}>{title}</h2>
            {entityType === "track" ? (
              <div>
                <a
                  onClick={() => data?.artistId && router.push(`/sonar/detail?id=${data.artistId}&type=artist`)}
                  style={{ fontSize: 16, color: COLORS.accent, fontWeight: 300, cursor: data?.artistId ? 'pointer' : 'default', textDecoration: data?.artistId ? 'underline' : 'none' }}
                >
                  {subtitle}
                </a>
                {description && <p style={{ fontSize: 13, color: COLORS.textTertiary, marginTop: 4 }}>{description}</p>}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 16, color: COLORS.textSecondary, fontWeight: 300 }}>{subtitle}</p>
                {description && <p style={{ fontSize: 13, color: COLORS.textTertiary, marginTop: 4 }}>{description}</p>}
              </>
            )}
          </div>
        </div>

        <div className="content-area">
          {/* Info cards */}
          {entityType === "track" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Duración", value: data.duration_ms > 0 ? `${Math.floor(data.duration_ms / 60000)}:${String(Math.floor((data.duration_ms % 60000) / 1000)).padStart(2, "0")}` : "—", icon: null },
                  { label: "Popularidad", value: data.popularity ?? "—", icon: null },
                  { label: "Explicit", value: data.explicit ? "Sí" : "No", icon: null },
                ].map(s => (
                  <div key={s.label} className="glass-card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
                    {s.icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>}
                    <div style={{ fontSize: 15, fontWeight: 400, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Información de la canción
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Álbum", value: data.album, id: data.albumId },
                    { label: "Año", value: data.release_date?.substring(0, 4) || "—" },
                    { label: "Pista", value: data.track_number ? `${data.track_number} / Disco ${data.disc_number}` : "—" },
                    { label: "ISRC", value: data.isrc || "—" },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                      <span style={{ color: COLORS.textTertiary }}>{item.label}</span>
                      <span style={{ fontWeight: 500, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                        {item.label === "Álbum" && item.id ? (
                          <a
                            onClick={() => router.push(`/sonar/detail?id=${item.id}&type=album`)}
                            style={{ color: COLORS.accent, textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            {item.value}
                          </a>
                        ) : (
                          item.value
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {data.preview_url && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                    Vista previa
                  </div>
                  <audio controls src={data.preview_url} style={{ width: "100%" }} />
                </div>
              )}
            </>
          )}

          {entityType === "artist" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Seguidores", value: data.followers > 0 ? data.followers.toLocaleString() : "—", icon: null },
                  { label: "Popularidad", value: data.popularity ?? "—", icon: null },
                  { label: "Géneros", value: data.genres?.length || 0, icon: null },
                ].map(s => (
                  <div key={s.label} className="glass-card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
                    {s.icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>}
                    <div style={{ fontSize: 15, fontWeight: 400, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {data.genres?.length > 0 && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                    Géneros
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {data.genres.map((g: string) => (
                      <span key={g} className="tag">{g}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.topTracks?.length > 0 && (
                <div className="glass-card" style={{ padding: 0, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, padding: 16, paddingBottom: 12 }}>
                    Top Tracks
                  </div>
                  <div style={{ padding: "0 16px 12px" }}>
                    {data.topTracks.map((t: any, idx: number) => (
                      <div key={t.id || idx} className="list-row" onClick={() => t.id && router.push(`/sonar/detail?id=${t.id}&type=track`)}>
                        <div style={{ width: 34, textAlign: "right", color: COLORS.textTertiary, fontSize: 13 }}>{idx + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                        </div>
                        <div style={{ color: COLORS.textTertiary, flexShrink: 0, marginLeft: 8 }}>{t.duration_ms ? `${Math.floor(t.duration_ms/60000)}:${String(Math.floor((t.duration_ms%60000)/1000)).padStart(2, "0")}` : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.albums?.length > 0 && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                    Álbumes
                  </div>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                    {data.albums.map((alb: any) => (
                      <div key={alb.id} onClick={() => router.push(`/sonar/detail?id=${alb.id}&type=album`)} style={{ cursor: "pointer", flex: "0 0 120px", textAlign: "center" }}>
                        {alb.image ? (
                          <img src={alb.image} alt={alb.name} style={{ width: 120, height: 120, borderRadius: 8, objectFit: "cover", marginBottom: 8 }} />
                        ) : (
                          <div style={{ width: 120, height: 120, borderRadius: 8, background: COLORS.surface, marginBottom: 8, border: `0.5px solid ${COLORS.glassBorder}` }} />
                        )}
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alb.name}</div>
                        <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{alb.release_date?.substring(0, 4)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.relatedArtists?.length > 0 && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                    Artistas Relacionados
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    {data.relatedArtists.map((ar: any) => (
                      <div key={ar.id} onClick={() => router.push(`/sonar/detail?id=${ar.id}&type=artist`)} style={{ cursor: "pointer", textAlign: "center" }}>
                        {ar.image ? (
                          <img src={ar.image} alt={ar.name} style={{ width: "100%", height: 100, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }} />
                        ) : (
                          <div style={{ width: "100%", height: 100, borderRadius: "50%", background: COLORS.surface, marginBottom: 8, border: `0.5px solid ${COLORS.glassBorder}` }} />
                        )}
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ar.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {entityType === "album" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Año", value: data.release_date?.substring(0, 4) || "—", icon: null },
                  { label: "Pistas", value: data.total_tracks ?? "—", icon: null },
                  { label: "Popularidad", value: data.popularity ?? "—", icon: null },
                ].map(s => (
                  <div key={s.label} className="glass-card" style={{ flex: 1, padding: "12px 10px", textAlign: "center" }}>
                    {s.icon && <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>}
                    <div style={{ fontSize: 15, fontWeight: 400, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.textTertiary }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Detalles del álbum
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Tipo", value: data.album_type || "—" },
                    { label: "Sello", value: data.label || "—" },
                    { label: "Géneros", value: data.genres?.join(", ") || "—" },
                    { label: "Copyright", value: data.copyrights || "—" },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                      <span style={{ color: COLORS.textTertiary }}>{item.label}</span>
                      <span style={{ fontWeight: 500, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {data.tracks && data.tracks.length > 0 && (
                <div className="glass-card" style={{ padding: 0, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.5, padding: 16 }}>
                    Pistas
                  </div>
                  <div style={{ padding: "0 16px 12px" }}>
                    {data.tracks.map((t: any, idx: number) => (
                      <div key={t.id || idx} className="list-row" onClick={() => t.id && router.push(`/sonar/detail?id=${t.id}&type=track`)}>
                        <div style={{ width: 34, textAlign: "right", color: COLORS.textTertiary, fontSize: 13 }}>{t.track_number || idx + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: COLORS.textTertiary }}>{t.artists || data.artist}</div>
                        </div>
                        <div style={{ color: COLORS.textTertiary, flexShrink: 0, marginLeft: 8 }}>{t.duration_ms ? `${Math.floor(t.duration_ms/60000)}:${String(Math.floor((t.duration_ms%60000)/1000)).padStart(2, "0")}` : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add to listened */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5, color: COLORS.textTertiary, textTransform: "uppercase", marginBottom: 20 }}>
              Mi valoración
            </div>

            {/* Score */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, color: COLORS.textSecondary, display: "block", marginBottom: 12 }}>Puntuación (0-10)</label>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={scoreInput}
                  onChange={e => {
                    const val = e.target.value;
                    setScoreInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setScore(Math.min(Math.max(num, 0), 10));
                    }
                  }}
                  className="score-input"
                  placeholder="5.0"
                />
                <ScoreRing score={score} isDark={isDarkMode} />
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, color: COLORS.textSecondary, display: "block", marginBottom: 10 }}>Nota personal</label>
              <textarea
                className="input-field"
                placeholder="¿Qué te transmite esto?"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              className={`btn-primary ${added ? "success" : ""}`}
              onClick={handleAdd}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            >
              guardar
            </button>

            {error && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(239, 68, 68, 0.06)", border: "0.5px solid rgba(239, 68, 68, 0.12)", color: "#EF4444", fontSize: 13 }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
