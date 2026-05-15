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

      // Default pagination: limit=10 to match frontend
      const clientLimit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10);
      const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
      const fetchLimit = 50; // fetch a larger pool so we can balance types reliably (Spotify max ~50)
      const data = await spotifyFetch("/search", {
        q,
        type: "track,artist,album",
        limit: String(fetchLimit),
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
      // New scoring: reduce raw popularity influence and favor exact name matches
      const calculateScore = (popularity: number, name: string, typeMultiplier: number): number => {
        const pop = popularity || 0;
        // Compress popularity influence (reduce weight)
        const popScore = pop * 0.35; // reduced weight
        // Strong additive boost for exact matches
        const exactBoost = name.toLowerCase() === queryLower ? 60 : 0;
        // Combine and apply type multiplier
        const combined = (popScore + exactBoost) * typeMultiplier;
        return combined;
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

      // Get top result's artist ID to boost matching tracks (apply boost before balancing)
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

      // Balance top results by type according to desired proportions
      const L = Math.min(clientLimit, results.length);
      const proportions = { track: 0.6, artist: 0.2, album: 0.2 };
      const desired: Record<string, number> = {
        track: Math.floor(L * proportions.track),
        artist: Math.floor(L * proportions.artist),
        album: Math.floor(L * proportions.album),
      };
      // Distribute remainder to tracks first, then artists, then albums
      let allocated = desired.track + desired.artist + desired.album;
      const orderTypes = ["track", "artist", "album"];
      let i = 0;
      while (allocated < L) {
        desired[orderTypes[i % orderTypes.length]] += 1;
        allocated += 1;
        i += 1;
      }

      // Create buckets preserving score order
      const buckets: Record<string, any[]> = { track: [], artist: [], album: [] };
      results.forEach(r => { if (buckets[r.type]) buckets[r.type].push(r); });

      const chosen = new Set();
      const balanced: any[] = [];
      // Round-robin extract according to desired quotas
      while (balanced.length < L) {
        let progress = false;
        for (const t of orderTypes) {
          if (balanced.length >= L) break;
          if (desired[t] > 0 && buckets[t].length > 0) {
            const item = buckets[t].shift();
            balanced.push(item);
            chosen.add(item.id + "::" + item.type);
            desired[t] -= 1;
            progress = true;
          }
        }
        if (!progress) break; // no more items available in buckets
      }

      // Append remaining items in original sorted order, excluding chosen
      const remaining = results.filter(r => !chosen.has(r.id + "::" + r.type));
      const finalResults = balanced.concat(remaining);

      // Remove _score before sending (keep all results for client-side pagination)
      finalResults.forEach(r => delete r._score);

      // Apply pagination requested by client (limit + offset)
      const paged = finalResults.slice(offset, offset + clientLimit);
      const total = finalResults.length;
      return NextResponse.json({ items: paged, total, offset, limit: clientLimit });
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
