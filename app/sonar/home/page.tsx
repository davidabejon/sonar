"use client";

import { useEffect, useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";
import { FloatingCardList } from "@/app/FloatingCard";

type Rating = { id: string; entryId: string; entryType: string; score: number; notes: string | null; createdAt: string };
type RatingWithMeta = Rating & { name: string; subtitle: string; image?: string; genres?: string[] };

const Icon = {
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
};

const AlbumArt = memo(function AlbumArt({ src, size = 52, fallback = "🎵" }: { src?: string | null; size?: number; fallback?: string }) {
  return (
    <div className="album-art" style={{ width: size, height: size, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? <img src={src} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: size * 0.4 }}>{fallback}</span>}
    </div>
  );
});

const Stars = memo(function Stars({ score }: { score: number }) {
  const full = Math.floor(score / 2);
  const half = score % 2 >= 1 ? 1 : 0;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? "#FBBF24" : i === full && half ? "#FBBF24" : "rgba(255,255,255,0.15)", fontSize: 15 }}>
          {i < full ? "★" : i === full && half ? "⯨" : "☆"}
        </span>
      ))}
    </div>
  );
});

const StatCard = memo(function StatCard({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <div className="glass-card" style={{ flex: 1, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 300, marginBottom: 4, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
});

const GenreTag = memo(function GenreTag({ genre }: { genre: string }) {
  return <span className="tag">{genre}</span>;
});

export default function Home() {
  const router = useRouter();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);

  const [userName, setUserName] = useState<string | null>(null);
  const [recent, setRecent] = useState<RatingWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoized lookup function
  const lookupEntry = useCallback(async (entryId: string, entryType: string) => {
    try {
      const url = '/api/spotify?action=lookup&lite=1&type=' + encodeURIComponent(String(entryType)) + '&id=' + encodeURIComponent(String(entryId));
      const res = await fetch(url);
      if (!res.ok) throw new Error("lookup failed");
      const d = await res.json();
      const image = d.image ?? (d.album?.images?.[0]?.url) ?? null;
      return { name: d.name ?? entryId, subtitle: d.artist ?? d.album ?? "", image, genres: d.genres || [] };
    } catch (err) {
      return { name: entryId, subtitle: entryType, image: undefined, genres: [] };
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const [userRes, recentRes] = await Promise.all([
          fetch('/api/me', { signal: controller.signal }),
          fetch('/api/ratings?sort=createdAt&limit=6', { signal: controller.signal }),
        ]);

        const userData = await userRes.json();
        setUserName(userData?.username ?? null);

        const recentJson = await recentRes.json();

        // New response format: { total, items }
        const recentData: Rating[] = recentJson?.items ? recentJson.items : Array.isArray(recentJson) ? recentJson : [];
        const total = recentJson?.total ?? 0;

        setTotalCount(total);

        if (recentData.length > 0) {
          // Compute average from all ratings
          const avg = recentData.reduce((s, r) => s + Number(r.score), 0) / recentData.length;
          setAvgScore(Math.round(avg * 10) / 10);

          // Parallelize lookups efficiently
          const enriched = await Promise.all(
            recentData.map(async r => ({ ...r, ...(await lookupEntry(r.entryId, r.entryType)) }))
          );
          setRecent(enriched as RatingWithMeta[]);

          // Extract and deduplicate genres
          const allGenres = new Set<string>();
          enriched.forEach((e: any) => (e.genres || []).slice(0, 3).forEach((g: string) => allGenres.add(g)));
          setGenres(Array.from(allGenres).slice(0, 7));
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Home load error', err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort(); // Cancel requests on unmount
  }, [lookupEntry]);

  const handleNavigate = useCallback((entryType: string, entryId: string) => {
    router.push('/sonar/detail?type=' + encodeURIComponent(String(entryType)) + '&id=' + encodeURIComponent(String(entryId)));
  }, [router]);

  return (
    <>
      <div className="content-area" style={{ paddingTop: 24 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: COLORS.textTertiary, marginBottom: 4 }}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 style={{ fontSize: 26, fontWeight: 300, letterSpacing: -0.5 }}>Hola, {userName ?? 'amigo'} 👋</h2>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <StatCard label="Escuchadas" value={totalCount === null ? "…" : String(totalCount)} colors={COLORS} />
          <StatCard label="Promedio" value={avgScore === null ? "…" : String((avgScore/10).toFixed(1))} colors={COLORS} />
          <StatCard label="Géneros" value={String(genres.length)} colors={COLORS} />
        </div>

        <div style={{ marginBottom: 28 }}>
          {loading ? (
            <div className="glass-card" style={{ padding: "20px", textAlign: "center", color: COLORS.textTertiary }}>Cargando…</div>
          ) : recent.length === 0 ? (
            <div className="glass-card" style={{ padding: "20px", textAlign: "center", color: COLORS.textTertiary }}>Aún no hay entradas</div>
          ) : (
            <FloatingCardList
              cards={recent.map(r => ({
                thumbnail: r.image || "🎵",
                title: r.name,
                subtitle: r.subtitle,
                score: r.score/10,
                onClick: () => handleNavigate(r.entryType, r.entryId)
              }))}
              label="Recientes"
              theme={isDarkMode ? "dark" : "light"}
              maxWidth={600}
            />
          )}
        </div>

        <div>
          <div className="section-label">Tus géneros</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {genres.length === 0 ? <span className="tag">—</span> : genres.map(g => <GenreTag key={g} genre={g} />)}
          </div>
        </div>
      </div>
    </>
  );
}
