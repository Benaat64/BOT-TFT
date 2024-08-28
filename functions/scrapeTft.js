const puppeteer = require("puppeteer");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

// Fonction pour accepter les cookies
async function acceptCookies(page) {
  try {
    await page.waitForSelector(".css-47sehv", { timeout: 5000 });
    await page.click(".css-47sehv");
    console.log("Cookies acceptés !");
  } catch (error) {
    console.log(
      "Pas de bouton d'acceptation des cookies trouvé ou erreur lors du clic."
    );
  }
}

// Fonction pour faire scroll la page
async function scrollPage(page) {
  let previousHeight;
  try {
    while (true) {
      previousHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const currentHeight = await page.evaluate(
        () => document.body.scrollHeight
      );

      if (currentHeight === previousHeight) {
        console.log("Aucun contenu supplémentaire trouvé.");
        break;
      }
    }
  } catch (error) {
    console.error("Erreur lors du défilement de la page :", error);
  }
}

// Fonction pour extraire les données
async function scrapeTFTactics() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Accepter les cookies
  await page.goto("https://mobalytics.gg/tft/tier-list/team-comps", {
    waitUntil: "networkidle2",
  });
  await acceptCookies(page);

  // Faire défiler la page pour charger toutes les données
  await scrollPage(page);

  console.log("Données chargées, extraction des informations...");

  // Extraire les données de la tier list
  const data = await page.evaluate(() => {
    const comps = [];

    document.querySelectorAll(".m-naynqj .m-tm70h2").forEach((container) => {
      // Extraire le rang
      const rankElement = container.querySelector(".m-160b45j");
      const rank = rankElement ? rankElement.alt : "No Rank";

      // Extraire le nom de la composition
      const teamNameElement = container.querySelector(".m-1bpc5zi");
      const teamName = teamNameElement
        ? teamNameElement.innerText
        : "No Team Name";

      // Extraire les informations des champions et leurs étoiles
      const champs = Array.from(container.querySelectorAll(".m-0")).map(
        (champContainer, index) => {
          const img = champContainer.src;
          const name = champContainer.alt || "Unknown";
          const starContainer = container.querySelectorAll(".m-153mfzw")[index];
          const stars = starContainer
            ? starContainer.querySelectorAll(".m-emerry").length
            : 0;

          return { img, name, stars };
        }
      );

      comps.push({ rank, teamName, champs });
    });

    return comps;
  });

  console.log("Données extraites:", data);
  await browser.close();
  return data;
}

async function drawOnImage(data) {
  const tierListImage = path.join(__dirname, "tierlist.png");

  const filteredData = data.filter((comp) => comp.rank === "S");

  // Calculer la hauteur totale requise pour le canvas en fonction du nombre de compositions filtrées
  const compositionsCount = filteredData.length;
  const blockHeight = 150;
  const padding = 50;
  const totalHeight = compositionsCount * blockHeight + padding * 2 + 50;

  // Définir la largeur du canvas
  const canvasWidth = 1000;

  // Créer un canvas avec une taille ajustée
  const canvas = createCanvas(canvasWidth, totalHeight);
  const ctx = canvas.getContext("2d");

  // Ajouter un arrière-plan sombre
  ctx.fillStyle = "#1A1A2E";
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  ctx.font = "18px Arial";
  ctx.fillStyle = "white";

  let y = 40;
  const circleRadius = 30;
  const horizontalSpacing = 80;
  const verticalSpacing = 100;

  // Dessiner les données des compositions filtrées
  for (const comp of filteredData) {
    ctx.fillStyle = "white";

    // Dessiner le rang
    ctx.fillText(`Rank: ${comp.rank}`, 30, y);

    // Dessiner le nom de la composition
    ctx.fillText(`Team Name: ${comp.teamName}`, 30, y + 25);

    y += 70;

    // Dessiner les images des champions
    let x = 30;
    for (const champ of comp.champs) {
      const imgUrl = champ.img;

      try {
        const champImage = await loadImage(imgUrl);

        // Dessiner l'image du champion dans un cercle
        ctx.save(); // Sauvegarder le contexte avant de définir le clip
        ctx.beginPath();
        ctx.arc(
          x + circleRadius,
          y + circleRadius,
          circleRadius,
          0,
          Math.PI * 2,
          true
        );
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(champImage, x, y, circleRadius * 2, circleRadius * 2);

        ctx.restore(); // Restaurer le contexte pour arrêter le clipping

        x += horizontalSpacing;
      } catch (err) {
        console.error(`Erreur lors du chargement de l'image : ${imgUrl}`, err);
      }
    }

    y += verticalSpacing;
  }

  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "white";
  const text = "Scraped by Beñaat64";
  const textWidth = ctx.measureText(text).width;
  const xPosition = canvasWidth - textWidth - 20;
  const yPosition = totalHeight - 20;
  ctx.fillText(text, xPosition, yPosition);

  const out = fs.createWriteStream(tierListImage);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log("Image sauvegardée à " + tierListImage));
}

(async () => {
  try {
    const data = await scrapeTFTactics();
    await drawOnImage(data);
  } catch (error) {
    console.error("Erreur:", error);
  }
})();
module.exports = {
  scrapeTFTactics,
  drawOnImage,
};
