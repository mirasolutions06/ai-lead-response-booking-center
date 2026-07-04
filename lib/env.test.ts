import { describe, it, expect } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses valid env vars", () => {
    const result = loadEnv({ DATABASE_URL: "postgres://localhost/test" } as NodeJS.ProcessEnv);
    expect(result.DATABASE_URL).toBe("postgres://localhost/test");
    expect(result.OPENAI_API_KEY).toBeUndefined();
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow();
  });
});
