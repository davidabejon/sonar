import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // Expire 60 seconds before actual expiry to avoid edge cases
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken!;
}

async function spotifyFetch(path: string, params: Record<string, string> = {}) {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "search") {
      const q = searchParams.get("q") || "";

      if (!q.trim()) {
        return NextResponse.json([]);
      }

      const data = await spotifyFetch("/search", {
        q,
        type: "track,artist,album",
        limit: "50",
      });

      // Normalize results
      interface SearchResult {
        id: string;
        name: string;
        artist?: string;
        artistId?: string;
        album?: string;
        albumId?: string;
        image?: string | null;
        duration_ms?: number;
        popularity?: number;
        preview_url?: string;
        explicit?: boolean;
        release_date?: string;
        genres?: string[];
        followers?: number;
        total_tracks?: number;
        album_type?: string;
        type: "track" | "artist" | "album";
        _score?: number;
      }

      const results: SearchResult[] = [];
      const queryLower = q.toLowerCase().trim();

      // Calculate score based on exact match + popularity
      const calculateScore = (popularity: number, name: string, typeMultiplier: number): number => {
        let score = popularity || 0;
        // Boost for exact match (name matches query exactly)
        if (name.toLowerCase() === queryLower) {
          score *= 2.0; // 100% boost for exact match
        }
        // Apply type-based multiplier
        score *= typeMultiplier;
        return score;
      };

      // Add artists with exact match + popularity score
      (data.artists?.items || []).forEach((a: any) => {
        results.push({
          id: a.id,
          name: a.name,
          image: a.images?.[0]?.url || null,
          genres: a.genres || [],
          followers: a.followers?.total || 0,
          popularity: a.popularity,
          type: "artist",
          _score: calculateScore(a.popularity || 0, a.name, 1.2),
        });
      });

      // Add tracks with exact match + popularity score
      (data.tracks?.items || []).forEach((t: any) => {
        results.push({
          id: t.id,
          name: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          artistId: t.artists?.[0]?.id || "",
          album: t.album?.name || "",
          albumId: t.album?.id || "",
          image: t.album?.images?.[0]?.url || null,
          duration_ms: t.duration_ms,
          popularity: t.popularity,
          preview_url: t.preview_url,
          explicit: t.explicit,
          release_date: t.album?.release_date || "",
          type: "track",
          _score: calculateScore(t.popularity || 0, t.name, 1.0),
        });
      });

      // Add albums with exact match + popularity score
      (data.albums?.items || []).forEach((a: any) => {
        results.push({
          id: a.id,
          name: a.name,
          artist: a.artists?.map((ar: any) => ar.name).join(", ") || "",
          artistId: a.artists?.[0]?.id || "",
          image: a.images?.[0]?.url || null,
          release_date: a.release_date || "",
          total_tracks: a.total_tracks,
          album_type: a.album_type,
          popularity: a.popularity,
          type: "album",
          _score: calculateScore(a.popularity || 0, a.name, 0.9),
        });
      });

      // Sort by score (descending)
      results.sort((a, b) => (b._score || 0) - (a._score || 0));

      // Get top result's artist ID to boost matching tracks
      const topResult = results[0];
      let topArtistId: string | null = null;
      if (topResult?.type === "artist") {
        topArtistId = topResult.id;
      } else if (topResult?.type === "track") {
        topArtistId = topResult.artistId || null;
      }

      // Boost tracks that share artist with top result
      if (topArtistId) {
        results.forEach(r => {
          if (r.type === "track" && r.artistId === topArtistId) {
            r._score = (r._score || 0) * 1.5; // 50% boost for matching artist
          }
        });
        // Re-sort after applying artist boost
        results.sort((a, b) => (b._score || 0) - (a._score || 0));
      }

      // Remove _score before sending (keep all results for client-side pagination)
      results.forEach(r => delete r._score);

      return NextResponse.json(results);
    }

    if (action === "lookup") {
      const type = searchParams.get("type");
      const id = searchParams.get("id");

      if (!type || !id) {
        return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
      }

      if (type === "track") {
        const t = await spotifyFetch(`/tracks/${id}`);
        return NextResponse.json({
          id: t.id,
          name: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          artistId: t.artists?.[0]?.id || "",
          album: t.album?.name || "",
          albumId: t.album?.id || "",
          image: t.album?.images?.[0]?.url || null,
          duration_ms: t.duration_ms,
          popularity: t.popularity,
          preview_url: t.preview_url,
          explicit: t.explicit,
          release_date: t.album?.release_date || "",
          disc_number: t.disc_number,
          track_number: t.track_number,
          isrc: t.external_ids?.isrc || "",
          type: "track",
        });
      }

      if (type === "artist") {
        const a = await spotifyFetch(`/artists/${id}`);
        
        let albums = [];
        let topTracks = [];
        let relatedArtists = [];
        
        try {
          const albumsResp = await spotifyFetch(`/artists/${id}/albums`, { limit: "20" });
          albums = (albumsResp.items || []).map((alb: any) => ({
            id: alb.id,
            name: alb.name,
            image: alb.images?.[0]?.url || null,
            release_date: alb.release_date || "",
            album_type: alb.album_type,
            type: "album",
          }));
        } catch (err) {
          console.error("Error fetching artist albums:", err);
        }
        
        try {
          const topTracksResp = await spotifyFetch(`/artists/${id}/top-tracks`, { market: "ES" });
          topTracks = (topTracksResp.tracks || []).slice(0, 10).map((t: any) => ({
            id: t.id,
            name: t.name,
            duration_ms: t.duration_ms,
            preview_url: t.preview_url,
            type: "track",
          }));
        } catch (err) {
          console.error("Error fetching artist top tracks:", err);
        }
        
        try {
          const relatedResp = await spotifyFetch(`/artists/${id}/related-artists`);
          relatedArtists = (relatedResp.artists || []).slice(0, 6).map((ar: any) => ({
            id: ar.id,
            name: ar.name,
            image: ar.images?.[0]?.url || null,
            genres: ar.genres || [],
            type: "artist",
          }));
        } catch (err) {
          console.error("Error fetching related artists:", err);
        }

        return NextResponse.json({
          id: a.id,
          name: a.name,
          image: a.images?.[0]?.url || null,
          genres: a.genres || [],
          followers: a.followers?.total || 0,
          popularity: a.popularity,
          albums,
          topTracks,
          relatedArtists,
          type: "artist",
        });
      }

      if (type === "album") {
        const a = await spotifyFetch(`/albums/${id}`);

        // Separate call to ensure we fetch the album's tracks list
        const tracksResp = await spotifyFetch(`/albums/${id}/tracks`, { limit: "50" });
        const tracks = (tracksResp.items || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          duration_ms: t.duration_ms,
          track_number: t.track_number,
          disc_number: t.disc_number,
          preview_url: t.preview_url,
          artists: t.artists?.map((ar: any) => ar.name).join(", ") || "",
          artistId: t.artists?.[0]?.id || "",
          type: "track",
        }));

        return NextResponse.json({
          id: a.id,
          name: a.name,
          artist: a.artists?.map((ar: any) => ar.name).join(", ") || "",
          artistId: a.artists?.[0]?.id || "",
          image: a.images?.[0]?.url || null,
          release_date: a.release_date || "",
          total_tracks: a.total_tracks,
          album_type: a.album_type,
          genres: a.genres || [],
          popularity: a.popularity,
          label: a.label || "",
          copyrights: a.copyrights?.map((c: any) => c.text).join("; ") || "",
          tracks,
          type: "album",
        });
      }

      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Spotify API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
