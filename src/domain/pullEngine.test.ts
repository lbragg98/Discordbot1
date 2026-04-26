import { describe, expect, it } from "vitest";
import { PullEngine } from "./pullEngine.js";
import { createFixtureGameData } from "../test/fixtureGameData.js";
import { createTestPlayerRepo } from "../test/testDb.js";
import { FixedRandom } from "../test/fixedRandom.js";

describe("PullEngine", () => {
  it("resets pity when Rare+ is pulled", () => {
    const { db, repo } = createTestPlayerRepo();
    const gameData = createFixtureGameData();
    const random = new FixedRandom([0.95, 0.3, 0.3]); // rolls Rare in fixture odds
    const engine = new PullEngine(gameData, repo, random);

    const result = engine.pull("u1");
    const pity = repo.getPity("u1");
    expect(result.rarity).toBe("Rare");
    expect(pity.pityCounter).toBe(0);
    db.close();
  });

  it("guarantees Rare+ when pity cap reached", () => {
    const { db, repo } = createTestPlayerRepo();
    const gameData = createFixtureGameData();
    repo.ensurePlayer("u2");
    db.prepare("UPDATE pull_counters SET pity_counter = 49, pity_max = 50 WHERE player_id = 'u2'").run();
    const random = new FixedRandom([0.0, 0.1, 0.1]);
    const engine = new PullEngine(gameData, repo, random);

    const result = engine.pull("u2");
    expect(["Rare", "Epic", "Superior", "Legendary", "Ultimate"]).toContain(result.rarity);
    db.close();
  });
});
