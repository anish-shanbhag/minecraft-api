import puppeteer from "puppeteer";
import fs from "fs";
import pLimit from "p-limit";
import chalk from "chalk";
import Jimp from "jimp";
// @ts-ignore
import pixels from "image-pixels";
// @ts-ignore
import palette from "get-rgba-palette";

import { sortByKey } from "../utils";
import blocksJSON from "../data/blocks.json";
import { Block } from "../types";

const limit = pLimit(6);
const blocks = blocksJSON as Block[];

const getTextContent = async (page: puppeteer.Page, element: puppeteer.ElementHandle) =>
  await page.evaluate((element) => element.textContent, element);

const writeBlocks = (blocks: Block[]) => {
  sortByKey(blocks, "name");
  fs.writeFileSync("data/blocks.json", JSON.stringify(blocks, null, 2));
};

const getItemNameForBlock = (name: string) => {
  const itemNameOverrides: Record<string, string> = {
    // item name differs from block name
    Beetroots: "Beetroot Seeds",
    Carrots: "Carrot",
    "Cave Vines": "Glow Berries",
    Cocoa: "Cocoa Beans",
    Lava: "Lava Bucket",
    "Melon Stem": "Melon Seeds",
    Potatoes: "Potato",
    "Powder Snow": "Powder Snow Bucket",
    "Pumpkin Stem": "Pumpkin Seeds",
    "Redstone Wire": "Redstone Dust",
    "Sweet Berry Bush": "Sweet Berries",
    Tripwire: "String",
    Water: "Water Bucket",
    "Wheat Crops": "Wheat Seeds",
    // growth variants
    "Bamboo Shoot": "Bamboo",
    "Cave Vines Plant": "Sweet Berries",
    "Kelp Plant": "Kelp",
    "Twisting Vines Plant": "Twisting Vines",
    "Weeping Vines Plant": "Weeping Vines",
    "Chorus Plant": "Chorus Flower",
  };
  const wallPlacements = ["Banner", "Head", "Torch", "Sign", "Fan", "Skull"];
  let itemName = itemNameOverrides[name] ?? name;
  if (wallPlacements.some((wallPlacement) => name.endsWith("Wall " + wallPlacement))) {
    wallPlacements.forEach((wallPlacement) => {
      itemName = itemName.replace("Wall " + wallPlacement, wallPlacement);
    });
  }
  return itemName;
};

(async () => {
  new Jimp(200, 200, "#00000000", (err, image) => {
    image.write("public/blocks/air.png");
  });
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const dataPage = await browser.newPage();
  console.log("Opening data page...");
  await dataPage.goto("https://minecraft.gamepedia.com/Java_Edition_data_values");
  console.log("Data page loaded");
  await dataPage.waitForSelector("div[data-page='Java Edition data values/Blocks'] .jslink");
  await dataPage.click("div[data-page='Java Edition data values/Blocks'] .jslink");
  await dataPage.waitForSelector("a[title='Acacia Button']");
  console.log("Blocks table loaded");
  const explosionPage = await browser.newPage();
  await explosionPage.goto("https://minecraft.gamepedia.com/Explosion", {
    waitUntil: "domcontentloaded",
  });
  console.log("Explosion page loaded");
  await Promise.all(
    (
      await dataPage.$$("div[data-page='Java Edition data values/Blocks'] .stikitable tbody tr")
    ).map((row) =>
      limit(async (row) => {
        const a = await row.$("a[title]");
        const name = await getTextContent(dataPage, a);
        let blockPage: puppeteer.Page;
        try {
          if (blocks.find((block) => block.name === name)) return;
          const namespacedId = await getTextContent(dataPage, await row.$("code"));
          let imageName = namespacedId;
          if (["Air", "Cave Air", "Void Air", "Moving Piston"].includes(name)) {
            imageName = "air";
          } else {
            const imageElement = await row.$("img");
            if (!imageElement) {
              console.log(chalk.red("No image found for block: " + name));
              return;
            }
            const wikiImageURL = await imageElement.evaluate((img: HTMLImageElement) => {
              const src = img.getAttribute("data-src") ?? img.src;
              return src.replace(/width-down.+/, "width-down/200");
            });
            if (wikiImageURL) {
              const wikiImage = await Jimp.read(wikiImageURL);
              wikiImage.resize(200, Jimp.AUTO);
              wikiImage.write("public/blocks/" + namespacedId + ".png");
            }
          }
          let image = `https://minecraft-api.s3.amazonaws.com/public/blocks/${imageName}.png`;

          let item = null;
          const itemName = getItemNameForBlock(name);
          if (itemName !== name || !(await row.$("td[style]"))) {
            item = itemName;
          }
          const url: string =
            name === "Beetroots"
              ? "https://minecraft.gamepedia.com/Beetroot_Seeds"
              : await (await a.getProperty("href")).jsonValue();
          blockPage = await browser.newPage();
          await blockPage.goto(url, {
            waitUntil: "domcontentloaded",
          });
          const description = (
            await getTextContent(blockPage, await blockPage.$(".mw-parser-output > p"))
          )
            .replace(/\[a\]|\n$/g, "")
            .trim();

          const block: Block = {
            name,
            namespacedId,
            description,
            image,
            item,
            tool: undefined,
            flammable: undefined,
            transparent: undefined,
            luminance: undefined,
            blastResistance: undefined,
            colors: undefined,
          };
          const types: { blocks: string[]; attributes: Partial<Block> }[] = [
            {
              blocks: ["Lava", "Water", "Powder Snow"],
              attributes: {
                flammable: false,
                tool: null,
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Sweet Berry Bush"],
              attributes: {
                flammable: true,
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Sea Pickle"],
              attributes: {
                luminance: 6,
              },
            },
            {
              blocks: ["Redstone Dust"],
              attributes: {
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Redstone Torch", "Redstone Wall Torch"],
              attributes: {
                luminance: 7,
              },
            },
            {
              blocks: ["Redstone Ore"],
              attributes: {
                luminance: 9,
              },
            },
            {
              blocks: ["Carrots", "Potatoes"],
              attributes: {
                transparent: true,
                luminance: 0,
                flammable: true,
                tool: null,
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Moving Piston", "Piston Head"],
              attributes: {
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Melon"],
              attributes: {
                tool: "Axe",
              },
            },
            {
              blocks: ["Magma Block"],
              attributes: {
                flammable: false,
              },
            },
            {
              blocks: ["Iron "],
              attributes: {
                tool: "Pickaxe",
              },
            },
            {
              blocks: [
                "Enchanting Table",
                "Cauldron",
                "Red Mushroom",
                "Observer",
                "Blue Ice",
                " Head",
                "Skull",
                "Spawner",
                "Cake",
              ],
              attributes: {
                luminance: 0,
              },
            },
            {
              blocks: ["Fletching Table"],
              attributes: {
                flammable: false,
              },
            },
            {
              blocks: ["Dead Bush"],
              attributes: {
                flammable: true,
              },
            },
            {
              blocks: ["Cobweb"],
              attributes: {
                tool: "Shears",
              },
            },
            {
              blocks: ["Brown Mushroom"],
              attributes: {
                luminance: 1,
              },
            },
            {
              blocks: ["Beehive", "Bee Nest"],
              attributes: {
                flammable: true,
                luminance: 0,
              },
            },
            {
              blocks: ["Furnace", "Smoker"],
              attributes: {
                luminance: 13,
              },
            },
            {
              blocks: ["Soul Fire"],
              attributes: {
                luminance: 10,
              },
            },
            {
              blocks: ["Torch"],
              attributes: {
                luminance: 14,
              },
            },
            {
              blocks: ["Candle", "Cake with"],
              attributes: {
                luminance: 3,
              },
            },
            {
              blocks: ["Fire", "Lantern", "Redstone Lamp", "Campfire", "Respawn Anchor"],
              attributes: {
                luminance: 15,
              },
            },
            {
              blocks: ["Bedrock"],
              attributes: {
                transparent: false,
                flammable: false,
              },
            },
            {
              blocks: ["Weighted Pressure Plate"],
              attributes: {
                tool: "Pickaxe",
                // requiresTool: true,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Bamboo Shoot"],
              attributes: {
                flammable: false,
              },
            },
            {
              blocks: ["Bamboo"],
              attributes: {
                flammable: true,
                tool: "Sword",
              },
            },
            {
              blocks: ["Coral Fan", "Coral Wall Fan"],
              attributes: {
                // requiresTool: false,
                // requiresSilkTouch: true,
              },
            },
            {
              blocks: ["Pumpkin Stem"],
              attributes: {
                blastResistance: 0,
              },
            },
            {
              blocks: ["Carpet"],
              attributes: {
                flammable: true,
              },
            },
            {
              blocks: ["Shulker Box"],
              attributes: {
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: [
                "Dandelion",
                "Poppy",
                "Blue Orchid",
                "Allium",
                "Azure Bluet",
                "Red Tulip",
                "Orange Tulip",
                "White Tulip",
                "Pink Tulip",
                "Oxeye Daisy",
                "Cornflower",
                "Lily of the Valley",
                "Wither Rose",
                "Sunflower",
                "Lilac",
                "Rose Bush",
                "Peony",
              ],
              attributes: {
                flammable: true,
              },
            },
            {
              blocks: ["Stairs", "Slab"],
              attributes: {
                transparent: true,
              },
            },
            {
              blocks: ["Leaves", "Glow Lichen"],
              attributes: {
                blastResistance: 0.2,
                transparent: true,
                tool: "Shears",
                // requiresTool: true,
              },
            },
            {
              blocks: [" Wood", "Log"],
              attributes: {
                blastResistance: 2,
                flammable: true,
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Stem", "Hyphae"],
              attributes: {
                blastResistance: 2,
                flammable: false,
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Oak", "Spruce", "Birch", "Jungle", "Acacia", "Crimson", "Warped"],
              attributes: {
                blastResistance: 3,
                flammable: true,
                tool: "Axe",
                // requiresTool: false,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Oak", "Spruce", "Birch", "Jungle", "Acacia"],
              attributes: {
                flammable: true,
              },
            },
            {
              blocks: ["Crimson", "Warped"],
              attributes: {
                flammable: false,
              },
            },
            {
              blocks: [
                "Stone ",
                "Cobblestone",
                "Sandstone",
                "Diorite",
                "Andesite",
                "Granite",
                "Prismarine",
                "Brick",
                "Purpur",
                "Quartz",
                "Blackstone",
                "Deepslate",
              ],
              attributes: {
                flammable: false,
                tool: "Pickaxe",
                // requiresTool: true,
                // requiresSilkTouch: false,
              },
            },
            {
              blocks: ["Quartz"],
              attributes: {
                blastResistance: 0.8,
              },
            },
            {
              blocks: ["Copper"],
              attributes: {
                blastResistance: 6,
                tool: "Pickaxe",
              },
            },
            {
              blocks: ["Small Amethyst Bud"],
              attributes: {
                luminance: 1,
              },
            },
            {
              blocks: ["Medium Amethyst Bud"],
              attributes: {
                luminance: 2,
              },
            },
            {
              blocks: ["Large Amethyst Bud"],
              attributes: {
                luminance: 4,
              },
            },
            {
              blocks: ["Amethyst Cluster"],
              attributes: {
                luminance: 5,
              },
            },
            {
              blocks: ["Cave Vines"],
              attributes: {
                luminance: 14,
              },
            },
            {
              blocks: ["Light"],
              attributes: {
                luminance: 15,
              },
            },
          ];

          for (const type of types) {
            if (type.blocks.some((block) => name.includes(block))) {
              for (const attribute in type.attributes) {
                const key = attribute as keyof Block;
                if (block[key] === undefined) {
                  (block as any)[key] = type.attributes[key];
                }
              }
            }
          }

          const missingAttribute = (attribute: keyof Block) => {
            if (block[attribute] === undefined) {
              console.log(chalk.red(`Unable to get ${attribute} for block: ` + name));
              blockPage.close();
              return true;
            }
          };

          block.transparent =
            block.transparent ??
            (await blockPage.evaluate(() => {
              const transparenceRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row) => row.textContent.includes("Transparent")
              )[0];
              const text = transparenceRow.querySelector("p").innerText;
              return text.length < 10 || text.includes("Partial") ? text !== "No" : undefined;
            }));
          if (missingAttribute("transparent")) return;

          block.luminance =
            block.luminance ??
            (await blockPage.evaluate(() => {
              const luminanceRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row) => row.textContent.includes("Luminan")
              )[0];
              const text = luminanceRow.querySelector("p").innerText;
              return text.length < 10
                ? text.includes("Yes")
                  ? parseInt(/\((.+)\)/.exec(text)[1])
                  : 0
                : undefined;
            }));
          if (missingAttribute("luminance")) return;

          block.blastResistance =
            block.blastResistance ??
            (await explosionPage.evaluate((blockName) => {
              let rows = [...document.querySelectorAll("tbody tr")] as HTMLTableRowElement[];
              if (!rows) return undefined;
              rows = rows.filter((row) => {
                const td = row.querySelector("td");
                if (!td) return false;
                return (
                  td.innerText.length > 0 &&
                  blockName.includes(td.innerText.substring(0, td.innerText.length - 1))
                );
              });
              if (rows.length === 0) return undefined;
              return parseFloat(
                (
                  rows
                    .sort(
                      (row1, row2) =>
                        row2.querySelector("td").innerText.length -
                        row1.querySelector("td").innerText.length
                    )[0]
                    .querySelector("td:nth-child(2)") as any
                ).innerText.replace(/,/g, "")
              );
            }, name));
          block.blastResistance =
            block.blastResistance ??
            (await blockPage.evaluate(() => {
              const blastResistanceRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row: HTMLTableRowElement) => row.innerText.includes("Blast resistance")
              )[0];
              const text = blastResistanceRow.querySelector("p").innerText;
              return text.length < 10 ? parseFloat(text) : undefined;
            }));
          if (missingAttribute("blastResistance")) return;

          block.flammable =
            block.flammable ??
            (await blockPage.evaluate(() => {
              const flammableRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row: HTMLTableRowElement) => row.innerText.includes("Flammable")
              )[0];
              const text = flammableRow.querySelector("p").innerText;
              return /(Yes)|(No)(\(\d+\))?/.test(text) ? text.includes("Yes") : undefined;
            }));
          if (missingAttribute("flammable")) return;

          if (block.tool === undefined) {
            // MULTIPLE TOOL TYPES RETURNS UNDEFINED
            block.tool = (await blockPage.evaluate(() => {
              const toolRow = [...document.querySelectorAll(".infobox-rows tr")].filter(
                (row: HTMLTableRowElement) => row.innerText.includes("Tool")
              )[0];
              const tools = [...toolRow.querySelectorAll("a")];
              const allTools = ["Pickaxe", "Hoe", "Axe", "Shovel", "Sword", "Shears"];
              return tools.length === 0
                ? null
                : tools.length > 1 || !allTools.includes(tools[0].title)
                ? undefined
                : tools[0].title;
            })) as Block["tool"];
          }
          if (missingAttribute("tool")) return;

          // disabled requiresTool and requiresSilkTouch since the information has been moved to
          // https://minecraft.fandom.com/wiki/Breaking and https://minecraft.fandom.com/wiki/Silk_Touch
          // TODO: add hardness instead of requiresTool?

          try {
            block.colors = (
              palette.bins((await pixels(`public/blocks/${imageName}.png`)).data) as {
                color: number[];
                amount: number;
              }[]
            )
              .map(({ color, amount }) => ({
                color,
                amount: Math.round(amount * 1000) / 1000,
              }))
              .filter((color) => color.amount > 0.01);
          } catch (e) {
            console.log(chalk.red("Error when getting block colors for: " + block.name));
            await blockPage.close();
            return;
          }

          await blockPage.close();
          blocks.push(block);
          writeBlocks(blocks);
          console.log("Successfully added block: " + name);
        } catch (e) {
          console.log(chalk.red("Uncaught error when getting block: " + name));
          console.log(e);
          if (blockPage) await blockPage.close();
          return;
        }
      }, row)
    )
  );
  writeBlocks(blocks);
  console.log(chalk.blue("Finished getting all blocks"));
})();
