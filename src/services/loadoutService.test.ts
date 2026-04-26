import { describe, expect, it } from "vitest";
import { createFixtureGameData } from "../test/fixtureGameData.js";
import { LoadoutService } from "./loadoutService.js";

describe("LoadoutService", () => {
  const svc = new LoadoutService(createFixtureGameData());

  it("validates party archetype constraints", () => {
    expect(svc.validateParty(["#001", "#002", "#003", "#004"]).valid).toBe(true);
    expect(svc.validateParty(["#001", "#002", "#003"]).valid).toBe(false);
  });

  it("rejects support card on team", () => {
    const res = svc.validateTeam(["#001", "#005"]);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/Support cards/);
  });
});
