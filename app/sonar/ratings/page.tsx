"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";
import { FloatingCard } from "@/app/FloatingCard";

type Rating = { id: string; entryId: string; entryType: string; score: number; notes: string | null; createdAt: string };
type RatingWithMeta = Rating & { name: string; subtitle: string; image?: string };

const TYPE_EMOJI: Record<string, string> = { track: "🎵", album: "💿", artist: "🎤" };
const PAGE_SIZE = 10;

async function lookupEntry(entryId: string, entryType: string): Promise<{ name: string; subtitle: string; image?: string }> {
  try {
    const res = await fetch(`/api/spotify?action=lookup&type=${entryType}&id=${entryId}`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    const image = d.image ?? (d.album?.images?.[0]?.url) ?? null;

    if (entryType === "artist") return { name: d.name ?? entryId, subtitle: "Artista", image: d.image ?? null };
    return { name: d.name ?? entryId, subtitle: d.artist ?? d.album ?? "", image };
  } catch {
    return { name: entryId, subtitle: entryType, image: undefined };
  }
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

export default function AllRatings() {
  const router = useRouter();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);

  const [ratings, setRatings] = useState<RatingWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const offset = (currentPage - 1) * PAGE_SIZE;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ratings?limit=${PAGE_SIZE}&offset=${offset}&sort=createdAt`
        );
        const data = await res.json();
        const ratingsArr = data?.items || [];
        setTotalCount(data?.total || 0);

        // Enrich each rating with metadata
        const enriched = await Promise.all(
          ratingsArr.map(async (r: Rating) => ({
            ...r,
            ...(await lookupEntry(r.entryId, r.entryType)),
          }))
        );
        setRatings(enriched as RatingWithMeta[]);
      } catch (err) {
        console.error("Error loading ratings", err);
        setRatings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage]);

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

    .rating-row {
      padding: 16px;
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .rating-row:hover {
      background: ${COLORS.surfaceHover};
      transform: translateY(-1px);
    }

    .rating-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .rating-title {
      font-size: 14px; font-weight: 600; color: ${COLORS.text};
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .rating-score {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #A78BFA22, #6366F122);
      border: 1px solid rgba(167,139,250,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600; color: ${COLORS.accent};
    }

    .rating-subtitle {
      font-size: 12px; color: ${COLORS.textSecondary};
      margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .rating-notes {
      font-size: 12px; color: ${COLORS.textTertiary};
      font-style: italic; margin-bottom: 6px;
    }

    .rating-time {
      font-size: 11px; color: ${COLORS.textTertiary};
    }

    .pagination {
      display: flex; justify-content: center; gap: 8px; margin-top: 24px; margin-bottom: 32px;
    }

    .pagination-btn {
      padding: 8px 12px; border-radius: 8px; border: 0.5px solid ${COLORS.glassBorder};
      background: ${COLORS.surface}; color: ${COLORS.text};
      font-size: 13px; cursor: pointer; transition: all 0.2s;
    }
    .pagination-btn:hover:not(:disabled) { background: ${COLORS.surfaceHover}; }
    .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .pagination-btn.active { background: ${COLORS.accent}; color: white; }
  `;

  return (
    <>
      <style>{css}</style>
      <>
        {/* Header */}
        <div style={{ padding: "20px 20px", borderBottom: `0.5px solid ${COLORS.glassBorder}` }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: COLORS.text }}>
            Todos los registros
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: "4px 0 0" }}>
            {totalCount} entradas en total
          </p>
        </div>

        <div className="content-area">
          {loading ? (
            <div className="glass-card" style={{ padding: "32px 20px", textAlign: "center", color: COLORS.textTertiary }}>
              Cargando…
            </div>
          ) : ratings.length === 0 ? (
            <div className="glass-card" style={{ padding: "32px 20px", textAlign: "center", color: COLORS.textTertiary }}>
              No hay registros
            </div>
          ) : (
            <>
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className="rating-row"
                  onClick={() => router.push(`/sonar/detail?type=${r.entryType}&id=${r.entryId}`)}
                >
                  <div className="rating-header">
                    <div style={{ fontSize: 20 }}>
                      {r.image ? (
                        <img
                          src={r.image}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
                        />
                      ) : (
                        TYPE_EMOJI[r.entryType] || "🎵"
                      )}
                    </div>
                    <div className="rating-title">{r.name}</div>
                    <div className="rating-score">{(r.score / 10).toFixed(1)}</div>
                  </div>
                  <div className="rating-subtitle">{r.subtitle}</div>
                  {r.notes && <div className="rating-notes">&ldquo;{r.notes}&rdquo;</div>}
                  <div className="rating-time">{timeAgo(r.createdAt)}</div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => {
                    const page = i + 1;
                    const isNear = Math.abs(page - currentPage) <= 1;
                    const isFirst = page === 1;
                    const isLast = page === totalPages;
                    return isNear || isFirst || isLast ? (
                      <button
                        key={page}
                        className={`pagination-btn ${page === currentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ) : page === 2 || page === totalPages - 1 ? (
                      <span key={`dots-${page}`} style={{ color: COLORS.textTertiary }}>
                        …
                      </span>
                    ) : null;
                  })}
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </>
    </>
  );
}
