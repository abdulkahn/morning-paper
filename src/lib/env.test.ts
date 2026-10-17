import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("boots with no secrets in fixture mode", () => {
    const env = parseEnv({});
    expect(env.LLM_MODE).toBe("fixture");
    expect(env.DEMO_MODE).toBe(false);
    expect(env.LLM_WRITER_MODEL).toBe("claude-opus-5-5");
    expect(env.LLM_BULK_MODEL).toBe("claude-haiku-5-5");
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({ ANTHROPIC_API_KEY: "", LLM_MODE: "" });
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.LLM_MODE).toBe("fixture");
  });

  it("requires an Anthropic key in live mode", () => {
    expect(() => parseEnv({ LLM_MODE: "live" })).toThrow(/ANTHROPIC_API_KEY/);
    expect(
      parseEnv({ LLM_MODE: "live", ANTHROPIC_API_KEY: "k" }).LLM_MODE,
    ).toBe("live");
  });

  it("rejects malformed values", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
    expect(() => parseEnv({ DEMO_MODE: "maybe" })).toThrow(/DEMO_MODE/);
  });
});
