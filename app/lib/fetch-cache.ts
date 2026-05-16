/**
 * Simple in-memory cache for API requests
 * Deduplicates concurrent requests to the same URL
 */

interface CacheEntry {
  promise: Promise<Response>;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<Response>>();

/**
 * Fetch with automatic deduplication and caching
 * @param url The URL to fetch
 * @param options Fetch options
 * @param ttl Cache time-to-live in milliseconds (default: 5 minutes)
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): Promise<Response> {
  // Only cache Spotify API requests; all other requests should be fresh
  const isSpotifyRequest = url.includes("/api/spotify");
  
  if (!isSpotifyRequest) {
    // For non-Spotify requests, always fetch fresh without caching
    return fetch(url, { ...options, cache: "no-store" });
  }

  const cacheKey = url + JSON.stringify(options || {});

  // Check if response is still in cache and not expired
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.promise.then(r => r.clone());
  }

  // Check if request is already in flight
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!.then(r => r.clone());
  }

  // Make new request
  const fetchPromise = fetch(url, options);
  pendingRequests.set(cacheKey, fetchPromise);

  try {
    const response = await fetchPromise;
    // Only cache successful responses
    if (response.ok) {
      const clonedResponse = response.clone();
      cache.set(cacheKey, {
        promise: Promise.resolve(clonedResponse),
        timestamp: Date.now(),
        ttl,
      });
    }
    return response;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.clear();
  pendingRequests.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(url: string) {
  cache.delete(url);
}
