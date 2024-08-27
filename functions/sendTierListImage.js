const fs = require("fs");
const path = require("path");

async function sendTierListImage(client, channelId) {
  try {
    const imagePath = path.join(__dirname, "tierlist.png");
    const channel = await client.channels.fetch(channelId);

    if (fs.existsSync(imagePath)) {
      await channel.send({
        files: [imagePath],
      });
      console.log("Image envoyée avec succès !");
    } else {
      await channel.send(
        "Erreur : l'image de la tier list est introuvable. Veuillez générer l'image d'abord."
      );
      console.error("Erreur : l'image de la tier list est introuvable.");
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'image de la tier list:", error);
  }
}

module.exports = { sendTierListImage };
