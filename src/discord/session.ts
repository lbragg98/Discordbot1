export type MenuAction =
  | "pull"
  | "collection"
  | "evolve"
  | "pve"
  | "shop"
  | "profile"
  | "party_manage"
  | "team_manage"
  | "quest_start_common"
  | "quest_start_uncommon"
  | "quest_start_rare"
  | "quest_start_epic"
  | "quest_start_legendary"
  | "quest_collect"
  | "daily_claim"
  | "weekly_claim"
  | "monthly_claim"
  | "reset_pulls";

const validActions = new Set<MenuAction>([
  "pull",
  "collection",
  "evolve",
  "pve",
  "shop",
  "profile",
  "party_manage",
  "team_manage",
  "quest_start_common",
  "quest_start_uncommon",
  "quest_start_rare",
  "quest_start_epic",
  "quest_start_legendary",
  "quest_collect",
  "daily_claim",
  "weekly_claim",
  "monthly_claim",
  "reset_pulls",
]);

export function buildActionId(userId: string, action: MenuAction): string {
  return `play:${userId}:${action}`;
}

export function parseActionId(customId: string):
  | { valid: true; userId: string; action: MenuAction }
  | { valid: false } {
  const [prefix, userId, action] = customId.split(":");
  if (prefix !== "play" || !userId || !action) {
    return { valid: false };
  }
  if (!validActions.has(action as MenuAction)) {
    return { valid: false };
  }
  return { valid: true, userId, action: action as MenuAction };
}
