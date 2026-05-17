export interface Rating {
  id: string;
  entryId: string;
  entryType: "track" | "album" | "artist";
  title?: string | null;
  artistName?: string | null;
  albumName?: string | null;
  score: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function saveRating(
  entryId: string,
  entryType: "track" | "album" | "artist",
  score: number,
  notes?: string,
  title?: string,
  artistName?: string,
  albumName?: string
): Promise<Rating> {
  const response = await fetch("/api/ratings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      entryId,
      entryType,
      score,
      notes: notes || null,
      title: title || null,
      artistName: artistName || null,
      albumName: albumName || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save rating");
  }

  return response.json();
}

export async function getRating(
  entryId: string,
  entryType: "track" | "album" | "artist"
): Promise<Rating | null> {
  const params = new URLSearchParams({
    entryId,
    entryType,
  });

  const response = await fetch(`/api/ratings?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch rating");
  }

  const data = await response.json();
  return data.data || data;
}

export async function getAllRatings(opts?: { limit?: number; offset?: number; sort?: string }): Promise<Rating[]> {
  const params = new URLSearchParams();
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  else params.set("limit", "1000");
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts?.sort) params.set("sort", opts.sort);

  const response = await fetch(`/api/ratings?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch ratings");
  }

  const data: any = await response.json();
  // API returns { total, items }, extract items array
  return Array.isArray(data) ? data : (data.items || []);
}

export async function deleteRating(
  entryId: string,
  entryType: "track" | "album" | "artist"
): Promise<void> {
  const params = new URLSearchParams({
    entryId,
    entryType,
  });

  const response = await fetch(`/api/ratings?${params}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete rating");
  }
}
