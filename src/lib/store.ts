import type { GenerateRequest } from "./deck";
import { nextGenerationEpoch, type StoredRequest } from "./generation";

const KEY = "corsair-deck:request";

/** Stash the brief so the studio route can pick it up and start streaming. */
export function stashRequest(req: GenerateRequest) {
  try {
    const stored: StoredRequest = { ...req, _epoch: nextGenerationEpoch() };
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* ignore quota / SSR */
  }
}

export function takeRequest(): StoredRequest | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredRequest) : null;
  } catch {
    return null;
  }
}

/** Clear the brief after a successful generation so refresh doesn't re-trigger. */
export function clearRequest() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
