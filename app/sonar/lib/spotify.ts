async function spotifyRequest(params: Record<string, string>) {
  const url = new URL("/api/spotify", window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Spotify request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function searchAll(query: string, limit: number = 10) {
  try {
    const data = await spotifyRequest({ action: "search", q: query, limit: String(limit) });
    return data || [];
  } catch (error) {
    console.error("Spotify searchAll error:", error);
    return [];
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
