import { describe, expect, it } from "vitest";
import { createFixtureGameData } from "../test/fixtureGameData.js";
import { createTestPlayerRepo } from "../test/testDb.js";
import { GameService } from "./gameService.js";

describe("GameService integration flow", () => {
  it("enforces pull cap and supports reset via premium hour", () => {
    const { db, repo } = createTestPlayerRepo();
    const service = new GameService(createFixtureGameData(), repo);

    for (let i = 0; i < 5; i += 1) {
      service.pull("u1");
    }
    expect(() => service.pull("u1")).toThrow(/No free pulls left/);

    service.claimPassive("u1", "daily");
    const msg = service.resetPullWindow("u1");
    expect(msg).toMatch(/Pull window reset/);
    expect(() => service.pull("u1")).not.toThrow();

    db.close();
  });

  it("requires valid party for quests and valid team for pve", () => {
    const { db, repo } = createTestPlayerRepo();
    const service = new GameService(createFixtureGameData(), repo);

    ["#001", "#002", "#003", "#004", "#005"].forEach((id) => repo.addCardCopy("u2", id, false));

    const party = service.autoAssignParty("u2");
    expect(party.validation.partyValid).toBe(true);

    const team = service.autoAssignTeam("u2");
    expect(team.validation.teamValid).toBe(true);

    const quest = service.startQuest("u2", "Common");
    expect(quest.rarity).toBe("Common");

    expect(() => service.collectQuest("u2")).toThrow(/still running/);
    expect(() => service.runPve("u2", 1)).not.toThrow();

    db.close();
  });
});
