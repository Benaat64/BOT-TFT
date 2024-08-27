const axios = require("axios");
const cheerio = require("cheerio");
const { EmbedBuilder } = require("discord.js");

async function getLatestPatchNoteImage(client, CHANNEL_ID) {
  try {
    const newsUrl = "https://teamfighttactics.leagueoflegends.com/fr-fr/news/";

    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const patchLink = $("a")
      .filter((i, el) => $(el).text().toLowerCase().includes("notes de patch"))
      .first()
      .attr("href");

    if (patchLink) {
      const baseUrl = "https://teamfighttactics.leagueoflegends.com";
      const fullPatchUrl = `${baseUrl}${patchLink}`;

      const patchResponse = await axios.get(fullPatchUrl);
      const patchPage = cheerio.load(patchResponse.data);

      const patchImageUrl = patchPage("a.skins.cboxElement").attr("href");

      if (patchImageUrl) {
        const embedMessage = new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("Dernier Patch Note Teamfight Tactics")
          .setImage(patchImageUrl)
          .setURL(fullPatchUrl)
          .setDescription(
            "Voici l'image du dernier patch note de Teamfight Tactics."
          );

        // Envoi du message
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (channel) {
          await channel.send({ embeds: [embedMessage] });
        } else {
          console.error("Canal introuvable ou inaccessible.");
        }
      } else {
        console.error(
          "Impossible de trouver l'image avec la classe 'skins cboxElement' dans le patch note."
        );
      }
    } else {
      console.error("Impossible de trouver le lien du dernier patch note.");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du patch note:", error);
  }
}

module.exports = { getLatestPatchNoteImage };
