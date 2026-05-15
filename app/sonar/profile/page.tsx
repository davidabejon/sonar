"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";
import { FloatingCard, FloatingCardList } from "@/app/FloatingCard";

type User = { id: string; email: string; username: string; createdAt: string };
type Rating = { id: string; entryId: string; entryType: string; score: number; notes: string | null; createdAt: string };
type RatingWithMeta = Rating & { name: string; subtitle: string; image?: string };

const TYPE_EMOJI: Record<string, string> = { track: "🎵", album: "💿", artist: "🎤" };
const ACCENT_COLORS = ["#A78BFA", "#6366F1", "#34D399", "#F59E0B", "#EC4899"];

async function lookupEntry(entryId: string, entryType: string): Promise<{ name: string; subtitle: string; image?: string }> {
  try {
    const res = await fetch(`/api/spotify?action=lookup&type=${entryType}&id=${entryId}`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    const image = d.image ?? (d.album?.images?.[0]?.url) ?? null;

    if (entryType === "artist") return { name: d.name ?? entryId, subtitle: "Artista", image: d.image ?? null };
    // track and album both provide `image` in the API route
    return { name: d.name ?? entryId, subtitle: d.artist ?? d.album ?? "", image };
  } catch {
    return { name: entryId, subtitle: entryType, image: undefined };
  }
}

function ScoreBadge({ score, COLORS }: { score: number; COLORS: ReturnType<typeof getTheme> }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 12, flexShrink: 0,
      background: "linear-gradient(135deg, #A78BFA22, #6366F122)",
      border: "1px solid rgba(167,139,250,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 600, color: COLORS.accent,
    }}>{score}</div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months !== 1 ? "es" : ""}`;
}

export default function Profile() {
  const router = useRouter();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);

  const [user, setUser] = useState<User | null>(null);
  const [topRated, setTopRated] = useState<RatingWithMeta[]>([]);
  const [latest, setLatest] = useState<RatingWithMeta | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [userRes, topRes, latestRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/ratings?limit=5&sort=score"),
          fetch("/api/ratings?limit=1&sort=createdAt"),
        ]);

        const userData = await userRes.json();
        setUser(userData);

        const topJson = await topRes.json();
        const latestJson = await latestRes.json();

        // New response format: { total, items }
        const topData: Rating[] = topJson?.items ? topJson.items : Array.isArray(topJson) ? topJson : [];
        const latestDataArr: Rating[] = latestJson?.items ? latestJson.items : Array.isArray(latestJson) ? latestJson : [];
        const total = topJson?.total ?? latestJson?.total ?? 0;

        setTotalCount(total);

        // Enrich top rated
        const topEnriched = await Promise.all(topData.map(async r => ({ ...r, ...(await lookupEntry(r.entryId, r.entryType)) })));
        setTopRated(topEnriched as RatingWithMeta[]);

        // Enrich latest (first item)
        if (latestDataArr.length > 0) {
          const l = latestDataArr[0];
          const enrichedLatest = { ...l, ...(await lookupEntry(l.entryId, l.entryType)) } as RatingWithMeta;
          setLatest(enrichedLatest);
        } else {
          setLatest(null);
        }

      } catch (err) {
        console.error("Profile load error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const css = `
    .glass-card {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 20px;
      transition: all 0.2s;
    }

    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      color: ${COLORS.textTertiary}; text-transform: uppercase;
      margin-bottom: 12px;
    }

    .list-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-bottom: 0.5px solid ${COLORS.glassBorder};
      cursor: pointer; transition: opacity 0.15s;
    }
    .list-row:hover { opacity: 0.75; }
    .list-row:last-child { border-bottom: none; }

    .entry-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; border: 0.5px solid ${COLORS.glassBorder};
    }

    .btn-ghost {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 14px; color: ${COLORS.text};
      font-size: 14px; font-weight: 400; padding: 12px 20px;
      width: 100%; cursor: pointer; transition: all 0.2s;
      margin-top: 10px;
    }
    .btn-ghost:hover { background: ${COLORS.surfaceHover}; }
  `;

  return (
    <>
      <style>{css}</style>
      <>
        {/* Profile hero */}
        <div style={{ padding: "32px 20px 24px", textAlign: "center" }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, #A78BFA, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, border: `2.5px solid ${COLORS.glassBorder}`,
            boxShadow: "0 0 40px rgba(167,139,250,0.3)", color: "white",
          }}>{user ? user.username[0].toUpperCase() : "·"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 4 }}>{user?.username ?? "…"}</h2>
          <p style={{ fontSize: 14, color: COLORS.textSecondary }}>{user?.email ?? "…"}</p>
        </div>

        <div className="content-area">
          {/* Stats */}
          <div style={{ marginBottom: 28 }}>
            <div className="glass-card" style={{ padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 4 }}>
                {totalCount === null ? "…" : totalCount}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textTertiary }}>Entradas</div>
            </div>
          </div>

          {/* Top rated */}
          <div style={{ marginBottom: 10 }}>
            {loading ? (
              <div className="glass-card" style={{ padding: "20px 0", textAlign: "center", color: COLORS.textTertiary, fontSize: 14 }}>Cargando…</div>
            ) : topRated.length === 0 ? (
              <div className="glass-card" style={{ padding: "20px 0", textAlign: "center", color: COLORS.textTertiary, fontSize: 14 }}>Aún no hay entradas</div>
            ) : (
              <FloatingCardList
                cards={topRated.map((r) => ({
                  thumbnail: r.image || TYPE_EMOJI[r.entryType] || "🎵",
                  title: r.name,
                  subtitle: r.subtitle,
                  score: (typeof r.score === 'number') ? r.score / 10 : 0,
                  onClick: () => router.push(`/sonar/detail?type=${r.entryType}&id=${r.entryId}`),
                }))}
                label="Mejor valoradas"
                theme={isDarkMode ? "dark" : "light"}
                maxWidth={720}
              />
            )}
            {(totalCount ?? 0) > 0 && (
              <button className="btn-ghost" onClick={() => router.push("/sonar/ratings")}>
                Ver todos los registros
              </button>
            )}
          </div>

          {/* Latest entry */}
          {latest && (
            <div style={{ marginTop: 28 }}>
              <div className="section-label">Última entrada</div>
                <div className="glass-card" style={{ padding: 20 }}>
                  <div onClick={() => router.push(`/sonar/detail?type=${latest.entryType}&id=${latest.entryId}`)} style={{ cursor: "pointer" }}>
                    <FloatingCard
                      thumbnail={latest.image || TYPE_EMOJI[latest.entryType] || "🎵"}
                      title={latest.name}
                      subtitle={latest.subtitle}
                      score={(typeof latest.score === 'number') ? latest.score / 10 : 0}
                      theme={isDarkMode ? "dark" : "light"}
                      onClick={() => router.push(`/sonar/detail?type=${latest.entryType}&id=${latest.entryId}`)}
                    />
                  </div>
                  {latest.notes && (
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6, fontStyle: "italic", marginTop: 14 }}>
                      &ldquo;{latest.notes}&rdquo;
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 10 }}>{timeAgo(latest.createdAt)}</p>
                </div>
            </div>
          )}
        </div>
      </>
    </>
  );
}

