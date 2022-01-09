import puppeteer from "puppeteer";
import fs from "fs";
import pLimit from "p-limit";
import sharp from "sharp";
import chalk from "chalk";
import https from "https";

import { Item } from "../types";
import itemsJSON from "../data/items.json";
import { sortByKey } from "../utils";

const items: Item[] = itemsJSON;
let names = items.map((item) => item.name);
const limit = pLimit(6);

const writeItems = (items: Item[]) => {
  sortByKey(items, "name");
  fs.writeFileSync("data/items.json", JSON.stringify(items, null, 2));
};

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  const dataPage = await browser.newPage();
  console.log("Opening data page...");
  dataPage.goto("https://minecraft.fandom.com/wiki/Java_Edition_data_values", {
    timeout: 0,
  });
  await dataPage.waitForSelector("div[data-page='Java Edition data values/Items'] .jslink");
  console.log("Data page loaded");
  await dataPage.click("div[data-page='Java Edition data values/Items'] .jslink");
  await dataPage.click("div[data-page='Java Edition data values/Blocks'] .jslink");
  await dataPage.waitForSelector("a[title='Acacia Boat']");
  await dataPage.waitForSelector("a[title='Acacia Button']");
  console.log("Block and item tables loaded");
  const allItems = await sharp("all-items.png");
  const writeImage = (name: string, x: number, y: number) =>
    allItems
      .clone()
      .extract({
        left: x,
        top: y,
        width: 32,
        height: 32,
      })
      .toFile(`../public/items/${name}.png`);
  await Promise.all(
    (
      await dataPage.$$(
        "div[data-page='Java Edition data values/Items'] .stikitable tbody tr, div[data-page='Java Edition data values/Blocks'] .stikitable tbody tr"
      )
    ).map(async (row) => {
      return limit(async () => {
        let name = (
          await dataPage.evaluate(
            (element) =>
              element.querySelector("td:last-child[style]")
                ? ""
                : element.querySelector("a[title]").title,
            row
          )
        ).trim();
        if (name === "Banner Pattern") {
          name = await dataPage.evaluate(
            (element) => element.querySelector("td").innerText.trim(),
            row
          );
        }
        if (name === "Pufferfish (item)") name = "Pufferfish";
        else if (name === "Light Block") name = "Light";
        const excludedItems = [
          "Lingering Potion",
          "Potion",
          "Splash Potion",
          "Tipped Arrow",
          "Music Disc",
          "Chorus Plant",
        ];
        if (name.length === 0 || names.includes(name) || excludedItems.includes(name)) {
          return;
        }
        try {
          const namespacedId = await dataPage.evaluate(
            (element) => element.textContent,
            await row.$("code")
          );
          const url: string =
            name === "Tropical Fish"
              ? "https://minecraft.fandom.com/wiki/Tropical_Fish_(item)"
              : await (await (await row.$("a[title]")).getProperty("href")).jsonValue();
          const itemPage = await browser.newPage();
          await itemPage.goto(url, { timeout: 0 });
          await itemPage.waitForSelector(".invslot-item");
          const imageName = name.startsWith("Banner Pattern") ? "banner_pattern" : namespacedId;
          let image = `https://minecraft-api.s3.amazonaws.com/public/items/${imageName}.png`;

          try {
            const imageDetails = await itemPage.evaluate(
              (itemName) => {
                const spans = (
                  [...document.querySelectorAll(`.invslot-item .sprite`)] as HTMLSpanElement[]
                ).filter(
                  (span) =>
                    span.title === itemName ||
                    span.parentElement.getAttribute("data-minetip-title")?.replace("&d", "") ===
                      itemName
                );
                if (spans.length > 0) {
                  const style = spans[0].style;
                  const position = style.backgroundPosition
                    .split(" ")
                    .map((position) => Math.abs(parseInt(position.replace("px", ""))));
                  return {
                    x: position[0],
                    y: position[1],
                  };
                }
              },
              name.startsWith("Banner Pattern") ? "Banner Pattern" : name
            );
            if (imageDetails) {
              await writeImage(imageName, imageDetails.x, imageDetails.y);
            } else {
              // item image is a gif
              const gifURL = await itemPage.evaluate((itemName) => {
                const img = (
                  [...document.querySelectorAll(".invslot-item img")] as HTMLImageElement[]
                ).filter((img) => img.alt === itemName)[0];
                return img.getAttribute("data-src") ?? img.src;
              }, name);
              await new Promise((resolve) => {
                https.get(gifURL, (res) =>
                  res
                    .pipe(fs.createWriteStream(`../public/items/${imageName}.gif`))
                    .on("finish", resolve)
                );
              });
              image = image.replace("png", "gif");
            }
          } catch (e) {
            console.log(chalk.red("Error creating image for: " + name));
            await itemPage.close();
            return;
          }
          const stackSize = await itemPage.evaluate(() => {
            const stackSizeRow = [...document.querySelectorAll(".infobox-rows tr")].filter((row) =>
              row.textContent.includes("Stackable")
            )[0];
            if (!stackSizeRow) {
              return;
            }
            const text = stackSizeRow.querySelector("p").innerText;
            return text === "No" || text.includes("JE: No")
              ? 1
              : /Yes\s*\(.+\)/.test(text)
              ? parseInt(/\((.+)\)/.exec(text)[1])
              : null;
          });
          if (!stackSize) {
            console.log(chalk.red("Error on getting stack size: " + name));
            await itemPage.close();
            return;
          }
          let renewable;
          if (["Slab", "Stairs", "Wall"].some((variant) => name.endsWith(variant))) {
            renewable = !name.includes("Deepslate");
          } else if (name.startsWith("Banner Pattern")) {
            renewable = !["(Snout)", "(Thing)"].some((pattern) => name.endsWith(pattern));
          } else if (
            [
              "Pickaxe",
              "Hoe",
              "Axe",
              "Shovel",
              "Sword",
              "Helmet",
              "Chestplate",
              "Leggings",
              "Boots",
            ].some((ending) => name.endsWith(ending))
          ) {
            renewable = !name.startsWith("Netherite");
          } else if (name.endsWith("Horse Armor")) {
            renewable = name.startsWith("Leather");
          } else if (
            ["Dirt Path", "Dragon Head", "Player Head", "Tall Grass", "Large Fern"].includes(
              name
            ) ||
            name.endsWith("Nylium") ||
            name.startsWith("Infested")
          ) {
            renewable = false;
          } else if (name.endsWith("Terracotta")) {
            renewable = name === "Terracotta";
          } else if (
            [
              "Arrow",
              "Spectral Arrow",
              "Bundle",
              "Clay",
              "Skeleton Skull",
              "Wither Skeleton Skull",
              "Zombie Head",
              "Creeper Head",
              "Grass",
              "Fern",
              "Leather Cap",
              "Leather Tunic",
              "Leather Pants",
              "Turtle Shell",
              "Firework Star",
              "Firework Rocket",
              "Shulker Shell",
              "Clay Ball",
            ].includes(name) ||
            name.endsWith("Shulker Box")
          ) {
            renewable = true;
          } else {
            renewable = await itemPage.evaluate(() => {
              const renewableRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row) => row.textContent.includes("Renewable")
              )[0];
              if (!renewableRow) {
                return;
              }
              const text = renewableRow.querySelector("p").innerText;
              return text === "Yes" || (text === "No" ? false : null);
            });
            if (renewable === null) {
              console.log(chalk.red("Error on getting renewable: " + name));
              await itemPage.close();
              return;
            }
          }
          const description = (
            await itemPage.evaluate(
              (element) => element.textContent,
              await itemPage.$(".mw-parser-output > p")
            )
          )
            .replace(/\[a\]|\n$/g, "")
            .trim();
          const item = {
            name,
            namespacedId,
            description,
            image,
            renewable,
            stackSize,
          };
          items.push(item);
          writeItems(items);
          await itemPage.close();
          console.log("Successfully added item: " + name);
        } catch (e) {
          console.log(chalk.red("Uncaught error when getting item: " + name));
          console.log(e);
        }
      });
    })
  );
  console.log(chalk.blue("Finished getting regular items"));

  // handle Regular/Splash/Lingering Potions, Tipped Arrows, and Music Discs separately

  const notDecay = (title: string) => !title.includes("Decay");
  const renewablePotion = (title: string) =>
    !["Uncraftable", "Luck"].some((type) => title.endsWith(type));
  const pages: {
    page: string;
    namespacedId: string;
    stackSize: number;
    renewable: (title: string) => boolean;
    filter: (title: string, i: number) => boolean;
  }[] = [
    {
      page: "Arrow",
      namespacedId: "tipped_arrow",
      stackSize: 64,
      renewable: renewablePotion,
      filter: (title) => !["Arrow", "Spectral Arrow"].includes(title) && notDecay(title),
    },
    {
      page: "Potion",
      namespacedId: "potion",
      stackSize: 1,
      renewable: renewablePotion,
      filter: notDecay,
    },
    {
      page: "Splash_Potion",
      namespacedId: "splash_potion",
      stackSize: 1,
      renewable: renewablePotion,
      filter: notDecay,
    },
    {
      page: "Lingering_Potion",
      namespacedId: "lingering_potion",
      stackSize: 1,
      renewable: renewablePotion,
      filter: notDecay,
    },
    {
      page: "Map",
      namespacedId: "filled_map",
      stackSize: 64,
      renewable: () => true,
      filter: (title, i) => i < 2,
    },
    {
      page: "Explorer_Map",
      namespacedId: "filled_map",
      stackSize: 64,
      renewable: (title) => title !== "Buried Treasure Map",
      filter: (title, i) => i < 3,
    },
    {
      page: "Music_Disc",
      namespacedId: null, // specially handled
      stackSize: 1,
      renewable: (title) => !["otherside", "Pigstep"].some((disc) => title.includes(disc)),
      filter: () => true,
    },
  ];
  await Promise.all(
    pages.map(async ({ page, namespacedId, stackSize, renewable, filter }) => {
      const itemPage = await browser.newPage();
      await itemPage.goto("https://minecraft.fandom.com/wiki/" + page);
      await itemPage.waitForSelector(".invslot-item");
      const newItems = (
        await itemPage.evaluate(() => {
          const items = [...document.querySelectorAll(`.infobox-imagearea .invslot-item`)];
          return items.map((item) => {
            const sprite: HTMLSpanElement = item.querySelector(".sprite");
            if (sprite) {
              let name = sprite.title;
              if (name.endsWith("Music Disc")) {
                name = item.getAttribute("data-minetip-text").replace("&7", "");
              }
              const position = sprite.style.backgroundPosition
                .split(" ")
                .map((position) => Math.abs(parseInt(position.replace("px", ""))));
              return {
                name,
                x: position[0],
                y: position[1],
              };
            } else {
              const img = item.querySelector("img");
              const name = img.alt;
              return {
                name,
                gifURL: img.getAttribute("data-src") ?? img.src,
              };
            }
          });
        })
      ).filter(({ name }, i) => filter(name, i));
      const description = (
        await itemPage.evaluate(
          (element) => element.textContent,
          await itemPage.$(".mw-parser-output > p")
        )
      )
        .replace(/\[a\]|\n$/g, "")
        .trim();
      await Promise.all(
        newItems.map(async ({ name, x, y, gifURL }) => {
          let updatedNamespacedId = namespacedId;
          if (page === "Music_Disc") {
            const withoutAuthor = name.split(" ").pop().toLowerCase();
            name = `Music Disc (${name})`;
            updatedNamespacedId = "music_disc_" + withoutAuthor;
          }
          if (names.includes(name)) return;
          const imageName =
            page === "Music_Disc" ? updatedNamespacedId : name.toLowerCase().replace(/ /g, "_");
          const image = `https://minecraft-api.s3.amazonaws.com/public/items/${imageName}.${
            gifURL ? "gif" : "png"
          }`;
          if (gifURL) {
            await new Promise((resolve) => {
              https.get(gifURL, (res) =>
                res
                  .pipe(fs.createWriteStream(`../public/items/${imageName}.gif`))
                  .on("finish", resolve)
              );
            });
          } else {
            await writeImage(imageName, x, y);
          }
          items.push({
            name,
            namespacedId: updatedNamespacedId,
            description,
            image,
            renewable: renewable(name),
            stackSize,
          });
          writeItems(items);
          console.log("Successfully added special item: " + name);
        })
      );
      console.log("Finished getting special items for page: " + page);
      await itemPage.close();
    })
  );
  writeItems(items);
  console.log(chalk.blue("Finished getting special items (everything is complete)"));
})();
