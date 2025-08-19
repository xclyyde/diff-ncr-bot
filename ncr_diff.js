require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const API_URL = 'https://api-router.nexusmods.com/graphql';
// Your personal API key for Nexus Mods. Must be set in the `.env` file or
const API_KEY = process.env.NEXUS_API_KEY;
const APP_NAME = process.env.APP_NAME || 'CollectionDiffBot';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function fetchRevision(slug, revision) {
  const query = `
    query Revision($slug: String!, $revision: Int) {
      collectionRevision(slug: $slug, revision: $revision, viewAdultContent: true) {
        revisionNumber
        modFiles {
          fileId
          optional
          file {
            fileId
            name
            version
            mod {
              modId
              name
            }
          }
        }
      }
    }
  `;
  const variables = { slug, revision };
  const headers = {
    'Content-Type': 'application/json',
    apikey: API_KEY,
    'Application-Name': APP_NAME,
    'Application-Version': APP_VERSION,
  };

  const response = await axios.post(API_URL, { query, variables }, { headers });
  if (response.data.errors) {
    // Forward the error messages from the API in a single exception. The caller
    // should handle this and present a user-friendly message.
    throw new Error(JSON.stringify(response.data.errors));
  }
  return response.data.data.collectionRevision;
}

function computeDiff(oldMods, newMods) {
  // Convert arrays into maps keyed by ID for constant time lookups. The IDs
  // are cast to strings to ensure consistent key types in the Map.
  const oldMap = new Map(oldMods.map((m) => [String(m.id), m]));
  const newMap = new Map(newMods.map((m) => [String(m.id), m]));

  const added = [];
  const removed = [];
  const updated = [];

  // Check for added or updated mods by iterating over the new map.
  for (const [id, mod] of newMap.entries()) {
    if (!oldMap.has(id)) {
      added.push(mod);
    } else {
      const oldMod = oldMap.get(id);
      if (oldMod.version !== mod.version) {
        updated.push({ before: oldMod, after: mod });
      }
    }
  }

  // Check for removed mods by iterating over the old map.
  for (const [id, mod] of oldMap.entries()) {
    if (!newMap.has(id)) {
      removed.push(mod);
    }
  }

  return { added, removed, updated };
}


async function sendLongMessage(channel, content) {
  // Match any characters including newlines into segments up to 1 900 chars.
  const chunks = content.match(/[\s\S]{1,1900}/g) || [];
  for (const chunk of chunks) {
    await channel.send(chunk);
  }
}

// -----------------------------------------------------------------------------
//  Discord client setup
// -----------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});


client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!diff')) return;

  const args = message.content.split(/\s+/);
  if (args.length < 4) {
    await message.reply('Utilisation : `!diff <slug> <révisionA> <révisionB>`');
    return;
  }

  const slug = args[1];
  const oldRev = parseInt(args[2], 10);
  const newRev = parseInt(args[3], 10);
  if (isNaN(oldRev) || isNaN(newRev)) {
    await message.reply('Les numéros de révision doivent être des entiers.');
    return;
  }

  try {
    const [oldData, newData] = await Promise.all([
      fetchRevision(slug, oldRev),
      fetchRevision(slug, newRev),
    ]);

    const oldMods = oldData.modFiles
      .filter((mf) => mf.file && mf.file.mod)
      .map((mf) => ({
        id: mf.file.mod?.modId ?? mf.file.fileId,
        name: mf.file.mod?.name ?? mf.file.name,
        version: mf.file.version,
      }));
    const newMods = newData.modFiles
      .filter((mf) => mf.file && mf.file.mod)
      .map((mf) => ({
        id: mf.file.mod?.modId ?? mf.file.fileId,
        name: mf.file.mod?.name ?? mf.file.name,
        version: mf.file.version,
      }));

    const diffs = computeDiff(oldMods, newMods);
    let reply = `diff  **${slug}** between version **${oldRev}** and **${newRev}**\n`;

    if (diffs.added.length) {
      reply += '\n**new :**\n' + diffs.added.map((m) => `• ${m.name} (v${m.version})`).join('\n');
    }
    if (diffs.removed.length) {
      reply += '\n\n**removed :**\n' + diffs.removed.map((m) => `• ${m.name} (v${m.version})`).join('\n');
    }
    if (diffs.updated.length) {
      reply += '\n\n**updated :**\n' + diffs.updated.map((u) => `• ${u.before.name} : v${u.before.version} → v${u.after.version}`).join('\n');
    }
    if (!diffs.added.length && !diffs.removed.length && !diffs.updated.length) {
      reply += '\nsame.';
    }

    // Send the response, splitting into multiple messages if needed.
    await sendLongMessage(message.channel, reply);
  } catch (err) {
    console.error(err);
    await message.reply('error check version number.');
  }
});

client.login(BOT_TOKEN);