import { z } from "zod";
import { EMBEDDING_DIMS, HASH_MODEL, hashEmbedding } from "./hash-embedding";

// Embedding providers. Voyage when VOYAGE_API_KEY is set, otherwise the
// offline hash model. One run uses one model; clusters only compare against
// embeddings from the same model, so the two never mix.

export interface EmbedText {
  title: string;
  description: string | null;
}

export interface Embedder {
  model: string;
  embed(texts: EmbedText[]): Promise<number[][]>;
}

export const hashEmbedder: Embedder = {
  model: HASH_MODEL,
  embed: async (texts) =>
    texts.map((t) => hashEmbedding(t.title, t.description)),
};

export const VOYAGE_MODEL = "voyage-4-lite";
/** API maximum is 1,000 inputs; keep batches small enough for low-tier TPM. */
const MAX_BATCH_ITEMS = 128;
const MAX_BATCH_TOKENS = 6_000;
const MAX_RETRIES = 4;

const voyageResponse = z.object({
  data: z.array(
    z.object({
      index: z.number().int(),
      embedding: z.array(z.number()).length(EMBEDDING_DIMS),
    }),
  ),
});

const toInput = (t: EmbedText) =>
  t.description ? `${t.title}. ${t.description}` : t.title;

/** Rough token estimate (~4 chars per token) used only for batch sizing. */
const estimateTokens = (s: string) => Math.ceil(s.length / 4) + 2;

/** Splits inputs into batches under both the item and token budgets. */
export function planBatches(inputs: string[]): number[][] {
  const batches: number[][] = [];
  let current: number[] = [];
  let tokens = 0;
  inputs.forEach((s, i) => {
    const t = estimateTokens(s);
    if (
      current.length > 0 &&
      (current.length >= MAX_BATCH_ITEMS || tokens + t > MAX_BATCH_TOKENS)
    ) {
      batches.push(current);
      current = [];
      tokens = 0;
    }
    current.push(i);
    tokens += t;
  });
  if (current.length) batches.push(current);
  return batches;
}

export interface VoyageOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (msg: string) => void;
}

export function voyageEmbedder(
  apiKey: string,
  {
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    log = () => {},
  }: VoyageOptions = {},
): Embedder {
  async function request(input: string[]): Promise<number[][]> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input_type: "document",
          output_dimension: EMBEDDING_DIMS,
          input,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      // Rate limited (low tiers allow ~3 requests/min) or transient: back off.
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 20_000 * (attempt + 1);
        log(
          `voyage HTTP ${res.status}; retrying in ${Math.round(wait / 1000)}s`,
        );
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 200);
        throw new Error(`Voyage HTTP ${res.status}: ${detail}`);
      }
      const { data } = voyageResponse.parse(await res.json());
      const out: number[][] = new Array(input.length);
      for (const d of data) out[d.index] = d.embedding;
      if (out.some((v) => !v))
        throw new Error("Voyage response missing embeddings");
      return out;
    }
  }

  return {
    model: VOYAGE_MODEL,
    async embed(texts) {
      const inputs = texts.map(toInput);
      const out: number[][] = new Array(texts.length);
      for (const batch of planBatches(inputs)) {
        const vectors = await request(batch.map((i) => inputs[i]));
        batch.forEach((i, k) => (out[i] = vectors[k]));
      }
      return out;
    },
  };
}

export function getEmbedder(
  voyageApiKey: string | undefined,
  options?: VoyageOptions,
): Embedder {
  return voyageApiKey ? voyageEmbedder(voyageApiKey, options) : hashEmbedder;
}
