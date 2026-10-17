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
const VOYAGE_BATCH = 128;

const voyageResponse = z.object({
  data: z.array(
    z.object({
      index: z.number().int(),
      embedding: z.array(z.number()).length(EMBEDDING_DIMS),
    }),
  ),
});

export function voyageEmbedder(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Embedder {
  async function batch(texts: EmbedText[]): Promise<number[][]> {
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
        input: texts.map((t) =>
          t.description ? `${t.title}. ${t.description}` : t.title,
        ),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new Error(`Voyage HTTP ${res.status}: ${detail}`);
    }
    const { data } = voyageResponse.parse(await res.json());
    const out: number[][] = new Array(texts.length);
    for (const d of data) out[d.index] = d.embedding;
    if (out.some((v) => !v))
      throw new Error("Voyage response missing embeddings");
    return out;
  }

  return {
    model: VOYAGE_MODEL,
    async embed(texts) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += VOYAGE_BATCH) {
        out.push(...(await batch(texts.slice(i, i + VOYAGE_BATCH))));
      }
      return out;
    },
  };
}

export function getEmbedder(voyageApiKey: string | undefined): Embedder {
  return voyageApiKey ? voyageEmbedder(voyageApiKey) : hashEmbedder;
}
