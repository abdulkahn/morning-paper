import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMS } from "./hash-embedding";
import { getEmbedder, hashEmbedder, voyageEmbedder } from "./embedder";

const vec = (seed: number) =>
  Array.from({ length: EMBEDDING_DIMS }, (_, i) => (i === seed ? 1 : 0));

function fakeFetch(
  handler: (body: { input: string[] }) => Response,
): typeof fetch {
  return (async (_url: string, init?: RequestInit) =>
    handler(JSON.parse(String(init?.body)))) as typeof fetch;
}

describe("embedders", () => {
  it("falls back to the hash model without a key", () => {
    expect(getEmbedder(undefined).model).toBe(hashEmbedder.model);
    expect(getEmbedder("k").model).toBe("voyage-4-lite");
  });

  it("maps Voyage results back by index across batches", async () => {
    const calls: number[] = [];
    const embedder = voyageEmbedder(
      "k",
      fakeFetch(({ input }) => {
        calls.push(input.length);
        // Return out of order to prove we use `index`.
        const data = input
          .map((_, i) => ({ index: i, embedding: vec(i % 7) }))
          .reverse();
        return Response.json({ data });
      }),
    );
    const texts = Array.from({ length: 130 }, (_, i) => ({
      title: `t${i}`,
      description: null,
    }));
    const out = await embedder.embed(texts);
    expect(calls).toEqual([128, 2]);
    expect(out).toHaveLength(130);
    expect(out[3][3]).toBe(1);
  });

  it("surfaces API errors and malformed payloads", async () => {
    const failing = voyageEmbedder(
      "k",
      fakeFetch(() => new Response("rate limited", { status: 429 })),
    );
    await expect(
      failing.embed([{ title: "x", description: null }]),
    ).rejects.toThrow(/429/);

    const malformed = voyageEmbedder(
      "k",
      fakeFetch(() =>
        Response.json({ data: [{ index: 0, embedding: [1, 2] }] }),
      ),
    );
    await expect(
      malformed.embed([{ title: "x", description: null }]),
    ).rejects.toThrow();
  });
});
