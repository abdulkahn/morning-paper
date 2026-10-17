import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMS } from "./hash-embedding";
import {
  getEmbedder,
  hashEmbedder,
  planBatches,
  voyageEmbedder,
} from "./embedder";

const vec = (seed: number) =>
  Array.from({ length: EMBEDDING_DIMS }, (_, i) => (i === seed ? 1 : 0));

function fakeFetch(
  handler: (body: { input: string[] }) => Response,
): typeof fetch {
  return (async (_url: string, init?: RequestInit) =>
    handler(JSON.parse(String(init?.body)))) as typeof fetch;
}

const ok = ({ input }: { input: string[] }) =>
  Response.json({
    data: input.map((_, i) => ({ index: i, embedding: vec(i % 7) })).reverse(),
  });

const noSleep = async () => {};

describe("embedders", () => {
  it("falls back to the hash model without a key", () => {
    expect(getEmbedder(undefined).model).toBe(hashEmbedder.model);
    expect(getEmbedder("k").model).toBe("voyage-4-lite");
  });

  it("maps Voyage results back by index across batches", async () => {
    const calls: number[] = [];
    const embedder = voyageEmbedder("k", {
      fetchImpl: fakeFetch((body) => {
        calls.push(body.input.length);
        return ok(body); // returned out of order on purpose
      }),
    });
    const texts = Array.from({ length: 130 }, (_, i) => ({
      title: `t${i}`,
      description: null,
    }));
    const out = await embedder.embed(texts);
    expect(calls).toEqual([128, 2]);
    expect(out).toHaveLength(130);
    expect(out[3][3]).toBe(1);
  });

  it("keeps batches under the token budget", () => {
    const long = "word ".repeat(400); // ~500 tokens each
    const batches = planBatches(Array.from({ length: 30 }, () => long));
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat()).toEqual(Array.from({ length: 30 }, (_, i) => i));
    for (const b of batches) expect(b.length * 502).toBeLessThanOrEqual(6_000);
  });

  it("backs off and retries when rate limited", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const embedder = voyageEmbedder("k", {
      fetchImpl: fakeFetch((body) => {
        attempts++;
        return attempts < 3
          ? new Response("slow down", {
              status: 429,
              headers: { "retry-after": "2" },
            })
          : ok(body);
      }),
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    const out = await embedder.embed([{ title: "x", description: null }]);
    expect(out).toHaveLength(1);
    expect(waits).toEqual([2000, 2000]);
  });

  it("gives up after repeated failures and rejects malformed payloads", async () => {
    const failing = voyageEmbedder("k", {
      fetchImpl: fakeFetch(() => new Response("rate limited", { status: 429 })),
      sleep: noSleep,
    });
    await expect(
      failing.embed([{ title: "x", description: null }]),
    ).rejects.toThrow(/429/);

    const malformed = voyageEmbedder("k", {
      fetchImpl: fakeFetch(() =>
        Response.json({ data: [{ index: 0, embedding: [1, 2] }] }),
      ),
    });
    await expect(
      malformed.embed([{ title: "x", description: null }]),
    ).rejects.toThrow();
  });
});
