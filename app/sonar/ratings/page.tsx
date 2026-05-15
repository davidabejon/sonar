"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";
import { FloatingCard } from "@/app/FloatingCard";
import { useSearch } from "../SearchContext";

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

function scoreToColor(score: number): string {
  const t = Math.min(Math.max(score, 0), 10) / 10;
  if (t <= 0.5) {
    const s = t * 2;
    const r = Math.round(220 + (255 - 220) * (1 - s));
    const g = Math.round(70 + (185 - 70) * s);
    const b = Math.round(50 + (30 - 50) * s);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(255 - (255 - 80) * s);
    const g = Math.round(185 + (210 - 185) * s);
    const b = Math.round(30 + (80 - 30) * s);
    return `rgb(${r},${g},${b})`;
  }
}

function ScoreRing({ score, isDarkMode }: { score: number; isDarkMode: boolean }) {
  const RADIUS = 20;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const color = scoreToColor(score);
  const offset = CIRCUMFERENCE * (1 - score / 10);
  
  const trackStroke = isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(80,60,160,0.15)";

  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg
        width={48}
        height={48}
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
            transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1), stroke 0.6s ease",
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
          fontSize: 12,
          fontWeight: 600,
          color,
          letterSpacing: "-0.5px",
          transition: "color 0.6s ease",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function AllRatingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Use context for persistent state
  const {
    ratingsSearch,
    setRatingsSearch,
    ratingsFilterType,
    setRatingsFilterType,
    ratingsSortBy,
    setRatingsSortBy,
    ratingsPage,
    setRatingsPage,
  } = useSearch();

  const [ratings, setRatings] = useState<RatingWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Local state for debouncing
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Store context setters in a ref to avoid listener recreation
  const settersRef = useRef({
    setRatingsPage,
    setRatingsSearch,
    setRatingsFilterType,
    setRatingsSortBy,
    setDebouncedQuery,
  });

  useEffect(() => {
    settersRef.current = {
      setRatingsPage,
      setRatingsSearch,
      setRatingsFilterType,
      setRatingsSortBy,
      setDebouncedQuery,
    };
  }, [setRatingsPage, setRatingsSearch, setRatingsFilterType, setRatingsSortBy]);

  // Initialize state from URL params on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const filterType = searchParams.get("filterType") || "";
    const sort = searchParams.get("sort") || "createdAt";

    setRatingsPage(page);
    setRatingsSearch(search);
    setRatingsFilterType(filterType);
    setRatingsSortBy(sort);
    setDebouncedQuery(search);
  }, []);

  // Helper to build URL from state
  const buildUrl = (page: number, search: string, filterType: string, sort: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (search) params.set("search", search);
    if (filterType) params.set("filterType", filterType);
    if (sort !== "createdAt") params.set("sort", sort);
    
    const queryString = params.toString();
    return queryString ? `/sonar/ratings?${queryString}` : "/sonar/ratings";
  };

  // Sync state changes to URL
  useEffect(() => {
    if (!isInitialized.current) return;

    const newUrl = buildUrl(ratingsPage, ratingsSearch, ratingsFilterType, ratingsSortBy);
    window.history.replaceState(null, "", newUrl);
  }, [ratingsPage, ratingsSearch, ratingsFilterType, ratingsSortBy]);

  // Listen for back/forward navigation - only set up once
  useEffect(() => {
    const handlePopState = () => {
      const searchStr = new URLSearchParams(window.location.search);
      const page = parseInt(searchStr.get("page") || "1");
      const search = searchStr.get("search") || "";
      const filterType = searchStr.get("filterType") || "";
      const sort = searchStr.get("sort") || "createdAt";

      settersRef.current.setRatingsPage(page);
      settersRef.current.setRatingsSearch(search);
      settersRef.current.setRatingsFilterType(filterType);
      settersRef.current.setRatingsSortBy(sort);
      settersRef.current.setDebouncedQuery(search);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const offset = (ratingsPage - 1) * PAGE_SIZE;

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(ratingsSearch);
      setRatingsPage(1); // Reset to page 1 when search changes
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [ratingsSearch, setRatingsPage]);

  // Reset page when filters change
  useEffect(() => {
    setRatingsPage(1);
  }, [ratingsFilterType, ratingsSortBy, setRatingsPage]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
          sort: ratingsSortBy,
        });

        if (ratingsFilterType) params.append("filterType", ratingsFilterType);
        if (debouncedQuery) params.append("q", debouncedQuery);

        const res = await fetch(`/api/ratings?${params.toString()}`);
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
  }, [ratingsPage, debouncedQuery, ratingsFilterType, ratingsSortBy]);

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

    .filters-container {
      padding: 16px; background: ${COLORS.surface}; border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;
    }

    .filter-row {
      display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    }

    .search-input {
      flex: 1; min-width: 150px;
      background: ${COLORS.surface}; border: 0.5px solid ${COLORS.glassBorder}; border-radius: 12px;
      color: ${COLORS.text}; padding: 8px 12px; font-size: 14px; outline: none;
      transition: all 0.2s;
    }
    .search-input:focus { border-color: ${COLORS.accent}; box-shadow: 0 0 0 2px rgba(167,139,250,0.15); }
    .search-input::placeholder { color: ${COLORS.textTertiary}; }

    .filter-select {
      background: ${COLORS.surface}; border: 0.5px solid ${COLORS.glassBorder}; border-radius: 12px;
      color: ${COLORS.text}; padding: 8px 12px; font-size: 13px; cursor: pointer; outline: none;
      transition: all 0.2s;
    }
    .filter-select:focus { border-color: ${COLORS.accent}; box-shadow: 0 0 0 2px rgba(167,139,250,0.15); }



    .filter-label {
      font-size: 12px; color: ${COLORS.textSecondary}; white-space: nowrap; font-weight: 500;
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
          {/* Filters */}
          <div className="filters-container">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre..."
              value={ratingsSearch}
              onChange={(e) => setRatingsSearch(e.target.value)}
            />
            <div className="filter-row">
              <label className="filter-label">Tipo:</label>
              <select
                className="filter-select"
                value={ratingsFilterType}
                onChange={(e) => setRatingsFilterType(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="track">Canción</option>
                <option value="album">Álbum</option>
                <option value="artist">Artista</option>
              </select>

              <label className="filter-label" style={{ marginLeft: "auto" }}>Ordenar por:</label>
              <select
                className="filter-select"
                value={ratingsSortBy}
                onChange={(e) => setRatingsSortBy(e.target.value)}
              >
                <option value="createdAt">Fecha</option>
                <option value="score">Puntuación</option>
              </select>
            </div>
          </div>

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
                    <ScoreRing score={r.score / 10} isDarkMode={isDarkMode} />
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
                    disabled={ratingsPage === 1}
                    onClick={() => setRatingsPage(Math.max(1, ratingsPage - 1))}
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => {
                    const page = i + 1;
                    const isNear = Math.abs(page - ratingsPage) <= 1;
                    const isFirst = page === 1;
                    const isLast = page === totalPages;
                    return isNear || isFirst || isLast ? (
                      <button
                        key={page}
                        className={`pagination-btn ${page === ratingsPage ? "active" : ""}`}
                        onClick={() => setRatingsPage(page)}
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
                    disabled={ratingsPage === totalPages}
                    onClick={() => setRatingsPage(Math.min(totalPages, ratingsPage + 1))}
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

export default function AllRatings() {
  return (
    <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "#999" }}>Cargando...</div>}>
      <AllRatingsContent />
    </Suspense>
  );
}
