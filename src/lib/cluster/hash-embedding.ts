import { createHash } from "node:crypto";
import { tokens } from "./text";

// Deterministic, offline "embedding": signed feature hashing of title and
// description unigrams + bigrams. Much weaker than a learned model, but free,
// instant and dependency-free — used in tests, fixture mode, and as the
// fallback when the embedding API is unavailable.

export const HASH_MODEL = "hash-v1";
export const EMBEDDING_DIMS = 1024;

function bucket(feature: string): { index: number; sign: 1 | -1 } {
  const h = createHash("md5").update(feature).digest();
  const n = h.readUInt32LE(0);
  return { index: n % EMBEDDING_DIMS, sign: h[4] & 1 ? 1 : -1 };
}

function addFeatures(vec: Float64Array, text: string, weight: number) {
  const toks = tokens(text);
  const counts = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    counts.set(toks[i], (counts.get(toks[i]) ?? 0) + 1);
    if (i + 1 < toks.length) {
      const bigram = `${toks[i]}_${toks[i + 1]}`;
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
    }
  }
  for (const [feature, count] of counts) {
    const { index, sign } = bucket(feature);
    vec[index] += sign * weight * (1 + Math.log(count));
  }
}

export function normalize(vec: ArrayLike<number>): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  return Array.from(vec, (v) => (norm > 0 ? v / norm : 0));
}

export function hashEmbedding(
  title: string,
  description?: string | null,
): number[] {
  const vec = new Float64Array(EMBEDDING_DIMS);
  addFeatures(vec, title, 2);
  if (description) addFeatures(vec, description, 1);
  return normalize(vec);
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}
