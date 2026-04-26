import { describe, expect, it } from "vitest";
import { EvolutionEngine } from "./evolutionEngine.js";
import { createFixtureGameData } from "../test/fixtureGameData.js";
import { createTestPlayerRepo } from "../test/testDb.js";

describe("EvolutionEngine", () => {
  it("consumes shard and increases stage", () => {
    const { db, repo } = createTestPlayerRepo();
    const data = createFixtureGameData();
    repo.ensurePlayer("u1");
    repo.addCardCopy("u1", "#001", false);
    repo.addCardCopy("u1", "#001", false); // duplicate => 1 shard

    const engine = new EvolutionEngine(data, repo);
    const result = engine.evolve({ playerId: "u1", cardId: "#001" });
    const state = repo.getCardState("u1", "#001");

    expect(result.fromStage).toBe(0);
    expect(result.toStage).toBe(1);
    expect(state.stage).toBe(1);
    expect(state.shards).toBe(0);
    db.close();
  });
});
