import type { GameData } from "../data/schema.js";

const REQUIRED_PARTY_ARCHETYPES = ["Warrior", "Mage", "Ranger", "Patron"];

export class LoadoutService {
  constructor(private readonly gameData: GameData) {}

  validateTeam(cardIds: string[]): { valid: boolean; reason?: string } {
    if (cardIds.length < 1) return { valid: false, reason: "Team requires at least 1 card." };
    if (cardIds.length > 4) return { valid: false, reason: "Team supports up to 4 cards." };

    for (const cardId of cardIds) {
      const card = this.gameData.cards.find((c) => c.id === cardId);
      if (!card) return { valid: false, reason: `Unknown card ${cardId}` };
      if (card.archetype === "Support") {
        return { valid: false, reason: "Support cards are Party-only and cannot be on Team." };
      }
    }

    return { valid: true };
  }

  validateParty(cardIds: string[]): { valid: boolean; reason?: string } {
    if (cardIds.length < 4) return { valid: false, reason: "Party requires at least 4 cards." };
    if (cardIds.length > 6) return { valid: false, reason: "Party supports up to 6 cards." };

    const archetypes = cardIds
      .map((id) => this.gameData.cards.find((c) => c.id === id)?.archetype)
      .filter((x): x is string => Boolean(x));

    for (const required of REQUIRED_PARTY_ARCHETYPES) {
      if (!archetypes.includes(required)) {
        return { valid: false, reason: `Party must include at least one ${required}.` };
      }
    }

    return { valid: true };
  }

  buildAutoTeam(ownedCardIds: string[]): string[] {
    return ownedCardIds
      .map((id) => this.gameData.cards.find((c) => c.id === id))
      .filter((card): card is NonNullable<typeof card> => Boolean(card))
      .filter((card) => card.archetype !== "Support")
      .slice(0, 4)
      .map((card) => card.id);
  }

  buildAutoParty(ownedCardIds: string[]): string[] {
    const owned = ownedCardIds
      .map((id) => this.gameData.cards.find((c) => c.id === id))
      .filter((card): card is NonNullable<typeof card> => Boolean(card));

    const chosen: string[] = [];
    for (const archetype of REQUIRED_PARTY_ARCHETYPES) {
      const candidate = owned.find((card) => card.archetype === archetype && !chosen.includes(card.id));
      if (candidate) chosen.push(candidate.id);
    }

    const flex = owned
      .filter((card) => !chosen.includes(card.id))
      .slice(0, Math.max(0, 6 - chosen.length))
      .map((c) => c.id);

    return [...chosen, ...flex].slice(0, 6);
  }
}
