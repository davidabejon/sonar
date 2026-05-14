const API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Sonar/1.0.0 (https://github.com/user/sonar)";

interface FetchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

// Mejora la query para usar sintaxis Lucene de MusicBrainz
function improveQuery(query: string): string {
  // Usa búsqueda flexible sin comillas para mayor cobertura
  // Reemplaza caracteres especiales que podrían causar problemas
  return query.trim().replace(/[?!]/g, '');
}

async function fetchMusicBrainz(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  url.searchParams.append("fmt", "json");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.statusText}`);
  }

  return response.json();
}

export async function searchArtists(options: FetchOptions) {
  try {
    const data = await fetchMusicBrainz("/artist", {
      query: improveQuery(options.query),
      limit: options.limit || 10,
      offset: options.offset || 0,
    });

    return (data.artists || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      country: artist["life-span"]?.["begin"] || "",
      type: artist.type || "Person",
      score: artist.score,
      disambiguation: artist.disambiguation || "",
    }));
  } catch (error) {
    console.error("Error searching artists:", error);
    return [];
  }
}

export async function searchRecordings(options: FetchOptions) {
  try {
    const data = await fetchMusicBrainz("/recording", {
      query: improveQuery(options.query),
      limit: options.limit || 10,
      offset: options.offset || 0,
    });

    return (data.recordings || []).map((recording: any) => {
      const artists = recording["artist-credit"]
        ? recording["artist-credit"].map((ac: any) => ac.name || ac.artist?.name).join(", ")
        : "Unknown Artist";

      return {
        id: recording.id,
        title: recording.title,
        artist: artists,
        duration: recording.length ? Math.round(recording.length / 1000) : 0,
        isrc: recording.isrcs?.[0] || "",
        score: recording.score,
        disambiguation: recording.disambiguation || "",
        year: recording["first-release-date"]?.split("-")[0] || "",
      };
    });
  } catch (error) {
    console.error("Error searching recordings:", error);
    return [];
  }
}

export async function searchReleaseGroups(options: FetchOptions) {
  try {
    const data = await fetchMusicBrainz("/release-group", {
      query: improveQuery(options.query),
      limit: options.limit || 10,
      offset: options.offset || 0,
    });

    return (data["release-groups"] || []).map((rg: any) => {
      const artists = rg["artist-credit"]
        ? rg["artist-credit"].map((ac: any) => ac.name || ac.artist?.name).join(", ")
        : "Unknown Artist";

      return {
        id: rg.id,
        title: rg.title,
        artist: artists,
        year: rg["first-release-date"]?.split("-")[0] || "",
        type: rg["primary-type"] || "Album",
        score: rg.score,
        disambiguation: rg.disambiguation || "",
      };
    });
  } catch (error) {
    console.error("Error searching release groups:", error);
    return [];
  }
}

export async function searchAll(query: string, limit: number = 10) {
  try {
    const [artists, recordings, releaseGroups] = await Promise.all([
      searchArtists({ query, limit: limit * 3 }),
      searchRecordings({ query, limit: limit * 3 }),
      searchReleaseGroups({ query, limit: limit * 3 }),
    ]);
    
    // Ordena por score de relevancia (MusicBrainz devuelve score de 0-100)
    recordings.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    artists.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    releaseGroups.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

    return {
      artists: artists.slice(0, Math.ceil(limit / 2)),
      recordings: recordings.slice(0, limit),
      releaseGroups: releaseGroups.slice(0, Math.ceil(limit / 2)),
    };
  } catch (error) {
    console.error("Error in search all:", error);
    return {
      artists: [],
      recordings: [],
      releaseGroups: [],
    };
  }
}

export async function lookupRecording(id: string) {
  try {
    const data = await fetchMusicBrainz(`/recording/${id}`, {
      inc: "releases+artists+isrcs",
    });

    const artists = data["artist-credit"]
      ? data["artist-credit"].map((ac: any) => ac.name || ac.artist?.name).join(", ")
      : "Unknown Artist";

    const release = data.releases?.[0];
    const releaseCountries = data.releases?.map((r: any) => r.country).filter(Boolean) || [];
    const releaseFormats = data.releases?.map((r: any) => r.media?.[0]?.format).filter(Boolean) || [];

    return {
      id: data.id,
      title: data.title,
      artist: artists,
      duration: data.length ? Math.round(data.length / 1000) : 0,
      isrc: data.isrcs?.[0] || "",
      album: release?.title || "Unknown Album",
      albumYear: release?.date?.split("-")[0] || data["first-release-date"]?.split("-")[0] || "",
      formats: [...new Set(releaseFormats)].slice(0, 3).join(", ") || "Digital",
      countries: [...new Set(releaseCountries)].slice(0, 2).join(", ") || "Various",
      releaseCount: data.releases?.length || 0,
      video: data.video || false,
      disambiguation: data.disambiguation || "",
    };
  } catch (error) {
    console.error("Error looking up recording:", error);
    return null;
  }
}

export async function lookupArtist(id: string) {
  try {
    const data = await fetchMusicBrainz(`/artist/${id}`, {
      inc: "recordings+releases",
    });

    const areaName = data.area?.name || data["end-area"]?.name || "Unknown";
    const beginDate = data["life-span"]?.begin || "";
    const endDate = data["life-span"]?.end || "";
    const isActive = !data["life-span"]?.ended;

    let activeStatus = "Active";
    if (beginDate && !isActive) {
      activeStatus = `${beginDate} – ${endDate}`;
    } else if (beginDate && isActive) {
      activeStatus = `Desde ${beginDate}`;
    }

    return {
      id: data.id,
      name: data.name,
      country: data.country || areaName,
      type: data.type || "Person",
      disambiguation: data.disambiguation || "",
      sortName: data["sort-name"] || data.name,
      recordingCount: data.recordings?.length || 0,
      releaseCount: data.releases?.length || 0,
      activeStatus: activeStatus,
      gender: data.gender || null,
      beginArea: data["begin-area"]?.name || null,
      area: data.area?.name || null,
    };
  } catch (error) {
    console.error("Error looking up artist:", error);
    return null;
  }
}

export async function lookupReleaseGroup(id: string) {
  try {
    const data = await fetchMusicBrainz(`/release-group/${id}`, {
      inc: "artists+releases",
    });

    const artists = data["artist-credit"]
      ? data["artist-credit"].map((ac: any) => ac.name || ac.artist?.name).join(", ")
      : "Unknown Artist";

    const releases = data.releases || [];
    const countries = releases.map((r: any) => r.country).filter(Boolean);
    const formats = releases.flatMap((r: any) => r.media?.map((m: any) => m.format) || []);
    const statuses = releases.map((r: any) => r.status).filter(Boolean);

    const latestRelease = releases.sort((a: any, b: any) => {
      const dateA = new Date(b.date || b["release-events"]?.[0]?.date || "").getTime();
      const dateB = new Date(a.date || a["release-events"]?.[0]?.date || "").getTime();
      return dateA - dateB;
    })[0];

    return {
      id: data.id,
      title: data.title,
      artist: artists,
      year: data["first-release-date"]?.split("-")[0] || "",
      type: data["primary-type"] || "Album",
      disambiguation: data.disambiguation || "",
      releaseCount: releases.length,
      countries: [...new Set(countries)].slice(0, 3).join(", ") || "Various",
      formats: [...new Set(formats)].slice(0, 3).join(", ") || "Digital",
      status: [...new Set(statuses)].slice(0, 1).join(", ") || "Unknown",
      latestReleaseDate: latestRelease?.date || latestRelease?.["release-events"]?.[0]?.date || "",
    };
  } catch (error) {
    console.error("Error looking up release group:", error);
    return null;
  }
}
