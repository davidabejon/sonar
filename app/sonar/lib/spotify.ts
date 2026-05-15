import { cachedFetch } from "@/app/lib/fetch-cache";

async function spotifyRequest(params: Record<string, string>) {
  const url = new URL("/api/spotify", window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await cachedFetch(url.toString(), undefined, 10 * 60 * 1000); // 10 min cache
  if (!response.ok) {
    throw new Error(`Spotify request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function searchAll(query: string, limit: number = 10) {
  try {
    const data = await spotifyRequest({ action: "search", q: query, limit: String(limit) });
    // if endpoint returns { items, total }, return items for compatibility
    if (data && typeof data === "object" && Array.isArray(data.items)) {
      return data.items;
    }
    return data || [];
  } catch (error) {
    console.error("Spotify searchAll error:", error);
    return [];
  }
}

export async function searchPaged(query: string, limit: number = 50, offset: number = 0) {
  try {
    const data = await spotifyRequest({ action: "search", q: query, limit: String(limit), offset: String(offset) });
    // Expect { items, total, offset, limit }
    if (data && typeof data === "object") {
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: typeof data.total === "number" ? data.total : (Array.isArray(data.items) ? data.items.length : 0),
        offset: typeof data.offset === "number" ? data.offset : offset,
        limit: typeof data.limit === "number" ? data.limit : limit,
      };
    }
    return { items: Array.isArray(data) ? data : [], total: Array.isArray(data) ? data.length : 0, offset, limit };
  } catch (error) {
    console.error("Spotify searchPaged error:", error);
    return { items: [], total: 0, offset, limit };
  }
}

export async function lookupTrack(id: string) {
  try {
    return await spotifyRequest({ action: "lookup", type: "track", id });
  } catch (error) {
    console.error("Spotify lookupTrack error:", error);
    return null;
  }
}

export async function lookupArtist(id: string) {
  try {
    return await spotifyRequest({ action: "lookup", type: "artist", id });
  } catch (error) {
    console.error("Spotify lookupArtist error:", error);
    return null;
  }
}

export async function lookupAlbum(id: string) {
  try {
    return await spotifyRequest({ action: "lookup", type: "album", id });
  } catch (error) {
    console.error("Spotify lookupAlbum error:", error);
    return null;
  }
}
