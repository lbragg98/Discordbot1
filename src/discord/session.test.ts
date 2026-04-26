import { describe, expect, it } from "vitest";
import { buildActionId, parseActionId } from "./session.js";

describe("session-safe interaction ids", () => {
  it("encodes and parses a user scoped action", () => {
    const id = buildActionId("123", "pull");
    const parsed = parseActionId(id);
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.userId).toBe("123");
      expect(parsed.action).toBe("pull");
    }
  });

  it("rejects malformed ids", () => {
    expect(parseActionId("bad")).toEqual({ valid: false });
  });
});
