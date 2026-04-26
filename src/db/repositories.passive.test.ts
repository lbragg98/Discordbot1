import { describe, expect, it } from "vitest";
import { createTestPlayerRepo } from "../test/testDb.js";

describe("PlayerRepository pull windows and claims", () => {
  it("tracks 6-hour free pull cap and reset availability", () => {
    const { db, repo } = createTestPlayerRepo();
    repo.ensurePlayer("u1");
    for (let i = 0; i < 5; i += 1) repo.consumeFreePull("u1", new Date());
    expect(() => repo.consumeFreePull("u1", new Date())).toThrow();
    repo.addItem("u1", "premium_hour", 1);
    const state = repo.resetPullWindowWithPremiumHour("u1", new Date());
    expect(state.freePullsUsed).toBe(0);
    db.close();
  });

  it("enforces claim cooldown", () => {
    const { db, repo } = createTestPlayerRepo();
    repo.ensurePlayer("u2");
    repo.claimPassive("u2", "daily", new Date());
    expect(() => repo.claimPassive("u2", "daily", new Date())).toThrow(/Claim not ready/);
    db.close();
  });
});
