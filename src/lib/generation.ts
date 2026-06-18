import type { GenerateRequest } from "./deck";

/** Survives React Strict Mode remounts and prevents duplicate submit() calls. */
let generationEpoch = 0;
let lastSubmittedEpoch = -1;

export function nextGenerationEpoch(): number {
  return ++generationEpoch;
}

export function shouldSubmit(epoch: number): boolean {
  if (epoch <= lastSubmittedEpoch) return false;
  lastSubmittedEpoch = epoch;
  return true;
}

export function resetGenerationGuard() {
  lastSubmittedEpoch = -1;
}

export type StoredRequest = GenerateRequest & { _epoch?: number };
