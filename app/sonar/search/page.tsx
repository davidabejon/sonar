"use client";

import { useState, useEffect, memo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { useSearch } from "../SearchContext";
import { getTheme } from "../theme";
import { searchAll, searchPaged } from "../lib/spotify";

const Icon = {
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

const AlbumArt = memo(function AlbumArt({ color, size = 52, emoji = "🎵" }: { color: string; size?: number; emoji?: string }) {
  return (
    <div className="album-art" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}33, ${color}11)`, borderColor: `${color}22` }}>
      <span style={{ fontSize: size * 0.4 }}>{emoji}</span>
    </div>
  );
});

const SearchResultRow = memo(function SearchResultRow({ 
  item, 
  color, 
  colors,
  index,
  COLORS,
  onNavigate 
}: any) {
  if (item.type === "track") {
    return (
      <div key={item.id} className="list-row" onClick={() => onNavigate(item.id, 'track')} style={{ cursor: 'pointer' }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} loading="lazy" />
          : <AlbumArt color={colors[index % colors.length]} size={52} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{item.artist}</div>
          <div style={{ fontSize: 11, color: COLORS.textTertiary, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {item.album && <span className="tag">{item.album}</span>}
            {item.release_date && <span className="tag">{item.release_date.substring(0, 4)}</span>}
            {item.duration_ms > 0 && <span className="tag">{Math.floor(item.duration_ms / 60000)}:{String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(2, "0")}</span>}
            {item.explicit && <span className="tag">E</span>}
          </div>
        </div>
        <div style={{ color: COLORS.textTertiary, width: 18, height: 18, flexShrink: 0 }}><Icon.ChevronRight /></div>
      </div>
    );
  } else if (item.type === "artist") {
    return (
      <div key={item.id} className="list-row" onClick={() => onNavigate(item.id, 'artist')} style={{ cursor: 'pointer' }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} loading="lazy" />
          : <AlbumArt color={colors[index % colors.length]} size={52} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{item.genres?.slice(0, 2).join(", ") || "Artista"}</div>
          <div style={{ fontSize: 11, color: COLORS.textTertiary, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {item.followers > 0 && <span className="tag">{item.followers.toLocaleString()} seguidores</span>}
            {item.popularity > 0 && <span className="tag">Pop: {item.popularity}</span>}
          </div>
        </div>
        <div style={{ color: COLORS.textTertiary, width: 18, height: 18, flexShrink: 0 }}><Icon.ChevronRight /></div>
      </div>
    );
  } else if (item.type === "album") {
    return (
      <div key={item.id} className="list-row" onClick={() => onNavigate(item.id, 'album')} style={{ cursor: 'pointer' }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} loading="lazy" />
          : <AlbumArt color={colors[index % colors.length]} size={52} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>{item.artist}</div>
          <div style={{ fontSize: 11, color: COLORS.textTertiary, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {item.album_type && <span className="tag">{item.album_type}</span>}
            {item.release_date && <span className="tag">{item.release_date.substring(0, 4)}</span>}
            {item.total_tracks && <span className="tag">{item.total_tracks} pistas</span>}
          </div>
        </div>
        <div style={{ color: COLORS.textTertiary, width: 18, height: 18, flexShrink: 0 }}><Icon.ChevronRight /></div>
      </div>
    );
  }
  return null;
});

export default function Search() {
  const router = useRouter();
  const { isDarkMode } = useThemeClient();
  const { query, setQuery } = useSearch();
  const COLORS = getTheme(isDarkMode);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offsetRef = useRef(0);
  
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(10);

  const colors = ["#FF6B6B", "#A78BFA", "#34D399", "#FBBF24", "#F97316", "#60A5FA"];

  // Improved debounce with ref to avoid memory leaks
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      setSearched(false);
      setResults([]);
      setDebouncing(false);
      return;
    }

    setDebouncing(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setDebouncing(false);
    }, 500); // Reduced from 800ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Auto-search when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    offsetRef.current = 0;
    setLoading(true);
    setSearched(true);
    setDisplayLimit(10);
    
    try {
      const page = await searchPaged(searchQuery, 10, 0);
      setResults(page.items || []);
      setTotalResults(page.total || (page.items || []).length);
      offsetRef.current = (page.items || []).length;
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNavigate = useCallback((id: string, type: string) => {
    router.push(`/sonar/detail?id=${id}&type=${type}`);
  }, [router]);

  const handleLoadMore = useCallback(async () => {
    if (!debouncedQuery.trim()) return;
    setIsLoadingMore(true);
    try {
      const page = await searchPaged(debouncedQuery, 10, offsetRef.current);
      const incoming = page.items || [];
      offsetRef.current += incoming.length;
      setResults(prev => [...prev, ...incoming]);
      setDisplayLimit(prev => prev + incoming.length);
      setTotalResults(page.total || offsetRef.current);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [debouncedQuery]);

  const css = `
    .glass-card {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 20px;
      transition: all 0.2s;
    }
    .glass-card:hover { background: ${COLORS.surfaceHover}; }

    .tag {
      display: inline-flex; align-items: center;
      padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 500;
      background: rgba(167,139,250,0.12);
      border: 0.5px solid rgba(167,139,250,0.25);
      color: ${COLORS.accent};
    }

    .list-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-bottom: 0.5px solid ${COLORS.glassBorder};
      transition: opacity 0.15s;
    }
    .list-row:hover { opacity: 0.75; }
    .list-row:last-child { border-bottom: none; }

    .album-art {
      border-radius: 12px; overflow: hidden;
      flex-shrink: 0; background: ${COLORS.surface};
      display: flex; align-items: center; justify-content: center;
      border: 0.5px solid ${COLORS.glassBorder};
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: ${COLORS.textTertiary};
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="content-area" style={{ paddingTop: 20 }}>
        {debouncing ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="5" />
            </svg>
            <p style={{ color: COLORS.textSecondary }}>Escribiendo...</p>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ animation: "spin 2s linear infinite" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p>Buscando...</p>
          </div>
        ) : searched ? (
          <>
            {results.length > 0 ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 13, color: COLORS.textSecondary }}>Resultados encontrados: {totalResults}</p>
                </div>
                <div className="glass-card" style={{ padding: "0 16px", marginBottom: 24 }}>
                  {results.slice(0, displayLimit).map((item, i) => (
                    <SearchResultRow 
                      key={item.id}
                      item={item}
                      color={colors[i % colors.length]}
                      colors={colors}
                      index={i}
                      COLORS={COLORS}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
                {displayLimit < totalResults && (
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      marginBottom: 24,
                      background: COLORS.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: isLoadingMore ? "not-allowed" : "pointer",
                      opacity: isLoadingMore ? 0.6 : 1,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => !isLoadingMore && ((e.target as HTMLButtonElement).style.opacity = "0.8")}
                    onMouseLeave={(e) => !isLoadingMore && ((e.target as HTMLButtonElement).style.opacity = "1")}
                  >
                    {isLoadingMore ? "Cargando..." : `Cargar 10 más (${displayLimit} de ${totalResults})`}
                  </button>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p style={{ fontSize: 15, marginBottom: 8 }}>No se encontraron resultados para "{query}"</p>
                <p style={{ fontSize: 13 }}>Intenta con otro término</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Busca artistas, canciones o álbumes</p>
          </div>
        )}
      </div>
    </>
  );
}
