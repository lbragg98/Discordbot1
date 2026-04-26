import { describe, expect, it } from "vitest";
import { PveEngine } from "./pveEngine.js";
import { createFixtureGameData } from "../test/fixtureGameData.js";
import { createTestPlayerRepo } from "../test/testDb.js";
import { FixedRandom } from "../test/fixedRandom.js";

describe("PveEngine", () => {
  it("wins early wave with team card", () => {
    const { db, repo } = createTestPlayerRepo();
    const data = createFixtureGameData();
    repo.addCardCopy("u1", "#001", false);
    const engine = new PveEngine(data, repo, new FixedRandom([0.5]));
    const result = engine.runWave("u1", 1, ["#001"]);
    expect(result.outcome).toBe("win");
    expect(result.rewards.gold).toBeGreaterThan(0);
    db.close();
  });
});
