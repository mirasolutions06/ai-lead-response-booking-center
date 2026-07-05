import { describe, it, expect } from "vitest";
import { getStalenessLevel } from "./staleness";

describe("getStalenessLevel", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("returns normal for a lead received under 4 hours ago", () => {
    const createdAt = new Date("2026-07-05T09:00:00Z");
    expect(getStalenessLevel(createdAt, now)).toBe("normal");
  });

  it("returns warning for a lead received between 4 and 24 hours ago", () => {
    const createdAt = new Date("2026-07-05T02:00:00Z");
    expect(getStalenessLevel(createdAt, now)).toBe("warning");
  });

  it("returns stale for a lead received over 24 hours ago", () => {
    const createdAt = new Date("2026-07-03T12:00:00Z");
    expect(getStalenessLevel(createdAt, now)).toBe("stale");
  });

  it("treats exactly 4 hours as warning, not normal", () => {
    const createdAt = new Date("2026-07-05T08:00:00Z");
    expect(getStalenessLevel(createdAt, now)).toBe("warning");
  });

  it("treats exactly 24 hours as stale, not warning", () => {
    const createdAt = new Date("2026-07-04T12:00:00Z");
    expect(getStalenessLevel(createdAt, now)).toBe("stale");
  });
});
