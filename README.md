# Discord Gacha Bot V1.1

TypeScript + discord.js + SQLite bot implementing:
- Pull system with pity (guaranteed Rare+ at 50 pulls)
- Duplicate to shard conversion (1 duplicate = 1 shard)
- 6-hour free pull window (5 pulls) + premium-hour reset
- Party and Team loadout systems
- Active passive quests (start/collect by rarity)
- True passive daily/weekly/monthly claims
- Evolution flow using rarity-based cost tables
- Deterministic PvE wave battles (Team-gated)
- Button-driven `/play` menu
- Spreadsheet extraction pipeline from `Copy of Danteria Bot.xlsx`

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill Discord credentials.
3. Run data and DB setup:
   - `npm run extract:data`
   - `npm run migrate`
   - `npm run seed`
4. Register slash commands:
   - `npm run register:commands`
5. Start bot:
   - `npm run dev`

## Environment
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `BOT_DB_PATH` (default `./data/runtime/gacha.sqlite`)
- `SPREADSHEET_PATH` (default `C:/Users/lbrag/Downloads/Copy of Danteria Bot.xlsx`)

## Commands
- `/play`: Opens the interactive menu.
- `/admin seed-status`: Returns seed row counts.

## Test
- `npm test`
