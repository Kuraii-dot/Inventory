import client from './client.js';

const responseCache = new Map();
const pendingRequests = new Map();

function stableParams(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right));
}

function cacheKey(url, params) {
  return `${url}?${JSON.stringify(stableParams(params))}`;
}

export async function cachedGet(url, { params = {}, ttl = 30_000, force = false } = {}) {
  const key = cacheKey(url, params);
  const now = Date.now();
  const cached = responseCache.get(key);

  if (!force && cached && now - cached.savedAt < ttl) return cached.data;
  if (!force && pendingRequests.has(key)) return pendingRequests.get(key);

  const request = client.get(url, { params })
    .then(response => {
      responseCache.set(key, { data: response.data, savedAt: Date.now() });
      return response.data;
    })
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
}

export function invalidateApiCache(prefixes = []) {
  const normalized = Array.isArray(prefixes) ? prefixes : [prefixes];
  if (normalized.length === 0) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (normalized.some(prefix => key.startsWith(prefix))) responseCache.delete(key);
  }
}

