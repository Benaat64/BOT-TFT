const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const { checkMatchStatus } = require("./functions/checkMatchStatus");
const {
  getLatestPatchNoteImage,
} = require("./functions/getLatestPatchNoteImage");
const { sendTierListImage } = require("./functions/sendTierListImage");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

client.once("ready", async () => {
  console.log("Bot est en ligne!");

  checkMatchStatus(client, CHANNEL_ID);
  setInterval(() => checkMatchStatus(client, CHANNEL_ID), 1 * 60 * 1000); // Vérifie toutes les 1 min
});

client.on("messageCreate", async (message) => {
  console.log("Message reçu:", message.content);

  if (message.content.trim() === "!patch") {
    await getLatestPatchNoteImage(client, CHANNEL_ID);
  }

  if (message.content.trim() === "!tierlist") {
    await sendTierListImage(client, CHANNEL_ID);
  }
});

client.login(DISCORD_TOKEN);
