/**
 * In-memory cache for GET requests to the ClauseGuard API.
 *
 * - A cached response is returned immediately, so pages you have already
 *   opened (dashboard, leases, reports, timeline) load without waiting.
 * - When the cached copy is older than FRESH_MS it is still returned, and a
 *   fresh copy is fetched in the background for next time.
 * - Copies older than MAX_AGE_MS are not used: the page waits for fresh data.
 * - Identical requests made at the same time share one network call.
 * - Any change made through the API (upload, delete, edit) clears the cache,
 *   so you never see an out-of-date version of your own changes. Signing
 *   out, or another account signing in, clears it too.
 * - Memory only: nothing is written to browser storage, and a full page
 *   reload starts with an empty cache.
 */

export const FRESH_MS = 30_000;
export const MAX_AGE_MS = 10 * 60_000;

type Entry = { value: unknown; at: number };

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
// Bumped on every clear, so a request that started before a change cannot
// put pre-change data back into the cache when it finishes.
let generation = 0;

function copy<T>(value: T): T {
  return value === undefined || value === null ? value : structuredClone(value);
}

export function clearApiCache() {
  entries.clear();
  inFlight.clear();
  generation += 1;
}

function load<T>(key: string, fetcher: () => Promise<T>, now: () => number): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending.then(copy) as Promise<T>;

  const startedIn = generation;
  const promise: Promise<T> = fetcher()
    .then((value) => {
      if (startedIn === generation) entries.set(key, { value: copy(value), at: now() });
      return value;
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

/** Return the cached value for `key` when usable, otherwise fetch it. Errors are never cached. */
export function cachedGet<T>(key: string, fetcher: () => Promise<T>, now: () => number = Date.now): Promise<T> {
  const hit = entries.get(key);
  const age = hit ? now() - hit.at : Infinity;
  if (hit && age < MAX_AGE_MS) {
    if (age >= FRESH_MS) load(key, fetcher, now).catch(() => undefined);
    return Promise.resolve(copy(hit.value as T));
  }
  return load(key, fetcher, now);
}
