# Discord Bot — Nexus Mods Collection Diff

This bot compares two revisions of a Nexus Mods collection and lists the differences:
- **Added** mods
- **Removed** mods
- **Updated** mods (version changes)

Target collection (NCR & ADR) for Cyberpunk 2077:
- https://www.nexusmods.com/games/cyberpunk2077/collections/rcuccp

---

## Prerequisites

- **Node.js** v18+ (tested with Node 22)
- A **Discord bot** (token from the [Discord Developer Portal](https://discord.com/developers/applications))
- A **Nexus Mods API key** (from your Nexus Mods account)
---

## Setup

1. **Clone or create the project folder** and place the bot script inside (e.g. `discord_bot_best_practices.js`).
2. **Install dependencies**:
   ```bash
   npm install discord.js axios dotenv

## .env files

NEXUS_API_KEY=your-nexus-api-key
DISCORD_BOT_TOKEN=your-discord-bot-token
APP_NAME=CollectionDiffBot
APP_VERSION=1.0.0


## Run 

node ncr_diff.js

## Usage
   ```bash
!diff rcupp <revisionA> <revisionB> for NRC
!diff srpv39 <revisionA> <revisionB> for ADR
!diff vfy7w1 <revisionA> <revisionB> for NCR Lite 
!diff ezxduq <revisionA> <revisionB> for ADR Lite


