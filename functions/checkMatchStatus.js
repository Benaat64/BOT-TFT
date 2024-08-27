const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const { puuids } = require("../puuids.json");

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = "europe";
const RECENT_TIME_LIMIT = 5 * 60 * 1000; // 1 heure

let lastMatchIds = {};

async function checkMatchStatus(client, CHANNEL_ID) {
  try {
    console.log("Vérification de l'état du jeu...");

    const now = Date.now();

    const tacticianDataResponse = await axios.get(
      "https://ddragon.leagueoflegends.com/cdn/13.24.1/data/en_US/tft-tactician.json"
    );
    const tacticianData = tacticianDataResponse.data.data;

    for (const { puuid, discordId } of puuids) {
      console.log(`Vérification des matchs pour le PUUID: ${puuid}`);

      const matchListResponse = await axios.get(
        `https://${REGION}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids`,
        {
          headers: {
            "X-Riot-Token": RIOT_API_KEY,
          },
        }
      );

      const matchList = matchListResponse.data;

      if (!matchList || matchList.length === 0) {
        console.log(`Aucun match trouvé pour ${puuid}.`);
        continue;
      }

      for (const matchId of matchList) {
        if (lastMatchIds[puuid] === matchId) {
          break;
        }

        const { data: matchDetails } = await axios.get(
          `https://${REGION}.api.riotgames.com/tft/match/v1/matches/${matchId}`,
          {
            headers: {
              "X-Riot-Token": RIOT_API_KEY,
            },
          }
        );

        const matchTime = matchDetails.info.game_datetime;

        if (now - matchTime <= RECENT_TIME_LIMIT) {
          const participant = matchDetails.info.participants.find(
            (p) => p.puuid === puuid
          );

          if (participant) {
            const placement = participant.placement;
            const tacticianId = participant.companion.item_ID; // ID du Tactician

            const tacticianInfo = tacticianData[tacticianId];
            let tacticianImageURL;

            if (tacticianInfo) {
              tacticianImageURL = `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/tft-tactician/${tacticianInfo.image.full}`;
            } else {
              console.error(
                `Tactician non trouvé pour le skin_ID: ${tacticianId}`
              );
              tacticianImageURL = null; // Aucune image si le tactician n'est pas trouvé
            }

            const mention = `<@${discordId}>`;

            // Récupération des données de classement et LP
            const summonerResponse = await axios.get(
              `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
              {
                headers: {
                  "X-Riot-Token": RIOT_API_KEY,
                },
              }
            );
            const summonerId = summonerResponse.data.id;
            const leagueResponse = await axios.get(
              `https://euw1.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerId}`,
              {
                headers: {
                  "X-Riot-Token": RIOT_API_KEY,
                },
              }
            );

            const leagueData = leagueResponse.data.find(
              (entry) => entry.queueType === "RANKED_TFT"
            );
            const currentLp = leagueData ? leagueData.leaguePoints : null;

            const rank = leagueData
              ? `${leagueData.tier} ${leagueData.rank}`
              : "Unranked";

            let message;
            let embedColor;

            if (placement === 1) {
              message = `**Tiens ${mention}, tu as fait tomber ça 👑** Tu as terminé **${placement} er** !! \n\nRang: **${rank}** \nLP actuels: **${currentLp} / 100** `;
              embedColor = "#00FF00"; // Vert pour la 1ère place
            } else if (placement <= 4) {
              message = `**Félicitations ${mention} !** 🎉 Tu as terminé **${placement} ème** ! \n\nRang: **${rank}** \nLP actuels: **${currentLp} / 100** `;
              embedColor = "#00FF00"; // Couleur par défaut pour les top 4
            } else if (placement === 8) {
              message = `🫵🫵😂😂**HAHAHA, ESPECE DE GROSSE MERDE ${mention}...** Tu as terminé **${placement} ème** !! Peut-être que tu devrais désinstaller ce jeu, il n'est pas fait pour toi ! \n\nRang: **${rank}**. Continue d'essayer ! \nLP actuels: **${currentLp} / 100** `;
              embedColor = "#FF0000"; // Rouge pour la 8ème place
            } else {
              message = `🫵🫵**ATTENTION, on te voit ${mention}...** Tu as terminé **${placement} ème** . Songe à désinstaller ce jeu ! \n\nRang: **${rank}** \nLP actuels: **${currentLp} / 100** \nContinue d'essayer !`;
              embedColor = "#FF0000"; // Rouge pour les positions entre 5 et 7
            }

            const embedMessage = new EmbedBuilder()
              .setColor(embedColor)
              .setTitle(`Résultat de la Partie`)
              .setDescription(message);

            if (tacticianImageURL) {
              embedMessage.setThumbnail(tacticianImageURL); // Ajouter l'image seulement si elle est disponible
            }

            // Envoi du message
            const channel = client.channels.cache.get(CHANNEL_ID);
            if (channel) {
              await channel.send({ embeds: [embedMessage] });
            } else {
              console.error("Canal introuvable ou inaccessible.");
            }

            lastMatchIds[puuid] = matchId;
          }
        } else {
          break;
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'état du jeu:", error);
  }
}

module.exports = { checkMatchStatus };
