import puppeteer from "puppeteer";
import fs from "fs";
import chalk from "chalk";

import { CraftingRecipe, Item } from "../types";
import itemsJSON from "../data/items.json";
import { sortByKey } from "../utils";

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  console.log("Opening crafting page...");
  await page.goto("https://minecraft.fandom.com/wiki/Crafting", {
    waitUntil: "domcontentloaded",
  });
  console.log("Crafting page loaded");
  await page.evaluate(() =>
    [...document.querySelectorAll(".jslink")]
      .slice(0, 10)
      .forEach((button: HTMLElement) => button.click())
  );
  await page.waitForFunction(
    () => document.querySelectorAll("table[data-description='Crafting recipes']").length === 10,
    {
      timeout: 50000,
    }
  );
  console.log("Crafting recipes loaded");
  let recipes = await page.evaluate((): CraftingRecipe[] => {
    let rows = [
      ...document.querySelectorAll("table[data-description='Crafting recipes'] tbody tr"),
    ];
    rows = rows.filter((row) => {
      let details = row.querySelector("td:nth-child(4)");
      if (
        !details ||
        [
          "Bedrock Edition only",
          "Bedrock and Education editions only",
          "Minecraft Earth",
          "upcoming",
        ].some((detail) => details.textContent.includes(detail)) ||
        [
          "Glow Stick",
          "Any Planks or",
          "Firework Star",
          "Firework Rocket",
          "Tipped Arrow",
          "Written Book",
        ].some((keyword) => row.textContent.includes(keyword)) ||
        row.textContent.includes("Any Planks or") ||
        [...row.querySelectorAll(".invslot-large .invslot-item span")].length === 0
      )
        return false;
      return true;
    });
    return rows
      .map((row) => {
        let quantity: number[] | number = [
          ...row.querySelectorAll(".invslot-large .invslot-item"),
        ].map((slot: HTMLElement) => (slot.innerText.length > 0 ? parseInt(slot.innerText) : 1));
        if (quantity.length === 1 || quantity.every((num) => num === (quantity as number[])[0]))
          quantity = quantity[0];
        let item: string[] | string = [...row.querySelectorAll(".invslot-large .inv-sprite")].map(
          (sprite) => sprite.getAttribute("title")
        );
        if (item.length === 1) item = item[0];
        if (item === "Empty Locator Map") item = "Empty Map";
        const recipeDetails = {
          item,
          quantity,
          recipe: [...row.querySelectorAll(".mcui-input .invslot")].map((slot) => {
            const items = [...slot.querySelectorAll(".invslot-item span")];
            if (items.length === 0) return null;
            if (items.length > 1) return items.map((item) => item.getAttribute("title"));
            return items[0].getAttribute("title");
          }),
          shapeless: row.querySelector(".mcui-shapeless") !== null,
          matching: row.textContent.includes("Matching"),
          any: row.textContent.includes("Any"),
        };
        const itemVariants = recipeDetails.recipe.find((recipeItem) =>
          Array.isArray(recipeItem)
        ) as string[];
        const finalRecipeDetails = (({ item, quantity, recipe, shapeless }) => ({
          item,
          quantity,
          recipe,
          shapeless,
        }))(recipeDetails);
        if (itemVariants && !recipeDetails.matching) {
          if (recipeDetails.any) {
            return finalRecipeDetails as any;
          } else {
            return itemVariants.map((itemVariant, i) => ({
              item: Array.isArray(recipeDetails.item) ? recipeDetails.item[i] : recipeDetails.item,
              quantity: Array.isArray(recipeDetails.quantity)
                ? recipeDetails.quantity[i]
                : recipeDetails.quantity,
              recipe: recipeDetails.recipe.map((recipeItem) =>
                Array.isArray(recipeItem) ? recipeItem[i] : recipeItem
              ),
              shapeless: recipeDetails.shapeless,
            })) as CraftingRecipe[];
          }
        }
        if (recipeDetails.matching && !recipeDetails.any) {
          return (recipeDetails.item as string[]).map((item: string, i) => ({
            item,
            quantity: Array.isArray(recipeDetails.quantity)
              ? recipeDetails.quantity[i]
              : recipeDetails.quantity,
            recipe: recipeDetails.recipe.map((recipeItem) =>
              Array.isArray(recipeItem) ? recipeItem[i] : recipeItem
            ),
            shapeless: recipeDetails.shapeless,
          })) as CraftingRecipe[];
        }
        if (!recipeDetails.matching && !recipeDetails.any) {
          return finalRecipeDetails as any;
        }
        return null;
      })
      .filter((recipe) => recipe)
      .flat();
  });
  const wood = [
    "Oak Planks",
    "Spruce Planks",
    "Birch Planks",
    "Jungle Planks",
    "Acacia Planks",
    "Dark Oak Planks",
    "Crimson Planks",
    "Warped Planks",
  ];
  const colors = [
    "White",
    "Orange",
    "Magenta",
    "Light Blue",
    "Yellow",
    "Lime",
    "Pink",
    "Gray",
    "Light Gray",
    "Cyan",
    "Purple",
    "Blue",
    "Brown",
    "Green",
    "Red",
    "Black",
  ];
  for (const color of colors) {
    recipes.push({
      item: color + " Bed",
      quantity: 1,
      recipe: [
        null,
        null,
        null,
        color + " Wool",
        color + " Wool",
        color + " Wool",
        wood,
        wood,
        wood,
      ],
      shapeless: false,
    });
    recipes.push({
      item: color + " Shulker Box",
      quantity: 1,
      recipe: [
        null,
        null,
        null,
        colors.map((color) => color + " Shulker Box"),
        color + " Dye",
        null,
        null,
        null,
        null,
      ],
      shapeless: true,
    });
  }
  const materials = [
    {
      name: "Wooden",
      item: wood,
    },
    {
      name: "Stone",
      item: "Cobblestone",
    },
    {
      name: "Iron",
      item: "Iron Ingot",
    },
    {
      name: "Golden",
      item: "Gold Ingot",
    },
    {
      name: "Diamond",
      item: "Diamond",
    },
  ];

  for (const material of materials) {
    const tools = [
      {
        name: "Pickaxe",
        recipe: [
          material.item,
          material.item,
          material.item,
          null,
          "Stick",
          null,
          null,
          "Stick",
          null,
        ],
      },
      {
        name: "Sword",
        recipe: [null, material.item, null, null, material.item, null, null, "Stick", null],
      },
      {
        name: "Axe",
        recipe: [
          material.item,
          material.item,
          null,
          material.item,
          "Stick",
          null,
          null,
          "Stick",
          null,
        ],
      },
      {
        name: "Shovel",
        recipe: [null, material.item, null, null, "Stick", null, null, "Stick", null],
      },
      {
        name: "Hoe",
        recipe: [material.item, material.item, null, null, "Stick", null, null, "Stick", null],
      },
    ];
    for (const tool of tools) {
      recipes.push({
        item: material.name + " " + tool.name,
        quantity: 1,
        recipe: tool.recipe,
        shapeless: false,
      });
    }
  }
  const dyes = colors.map((color) => color + " Dye");
  recipes.push({
    item: "Firework Star",
    quantity: 1,
    recipe: [
      "Gunpowder",
      dyes,
      [
        null,
        ...dyes,
        "Skeleton Skull",
        "Wither Skeleton Skull",
        "Zombie Head",
        "Player Head",
        "Creeper Head",
        "Dragon Head",
        "Gold Nugget",
        "Feather",
        "Fire Charge",
      ],
      [null, ...dyes, "Glowstone"],
      [null, ...dyes, "Diamond"],
      [null, ...dyes],
      [null, ...dyes],
      [null, ...dyes],
      [null, ...dyes],
    ],
    shapeless: true,
  });
  recipes.push({
    item: "Firework Star",
    quantity: 1,
    recipe: [null, null, null, "Firework Star", dyes, null, null, null, null],
    shapeless: true,
  });
  recipes.push({
    item: "Firework Rocket",
    quantity: 3,
    recipe: [
      null,
      null,
      null,
      "Paper",
      "Gunpowder",
      [null, "Gunpowder"],
      [null, "Gunpowder"],
      null,
      null,
    ],
    shapeless: true,
  });
  recipes.push({
    item: "Firework Rocket",
    quantity: 3,
    recipe: [
      null,
      null,
      null,
      "Firework Star",
      "Paper",
      "Gunpowder",
      [null, "Gunpowder"],
      [null, "Gunpowder"],
      null,
    ],
    shapeless: true,
  });
  // tipped arrows
  for (const effect of [
    "Splashing",
    "Regeneration",
    "Swiftness",
    "Fire Resistance",
    "Poison",
    "Healing",
    "Night Vision",
    "Weakness",
    "Strength",
    "Slowness",
    "Leaping",
    "Harming",
    "Water Breathing",
    "Invisibility",
    "Luck",
    "the Turtle Master",
    "Slow Falling",
  ]) {
    recipes.push({
      item: "Arrow of " + effect,
      quantity: 8,
      recipe: [
        "Arrow",
        "Arrow",
        "Arrow",
        "Arrow",
        effect === "Splashing" ? "Lingering Water Bottle" : "Lingering Potion of " + effect,
        "Arrow",
        "Arrow",
        "Arrow",
        "Arrow",
      ],
      shapeless: false,
    });
  }
  // Written Books
  for (let i = 1; i < 9; i++) {
    recipes.push({
      item: "Written Book",
      quantity: i,
      recipe: ["Written Book", ...Array(i).fill("Book and Quill"), ...Array(8 - i).fill(null)],
      shapeless: true,
    });
  }
  const invalidItems: string[] = [];
  const names = itemsJSON.map((item: Item) => item.name);
  recipes = recipes.filter((recipe) => {
    if (Array.isArray(recipe.item)) return false;
    if (!names.includes(recipe.item)) {
      if (!invalidItems.includes(recipe.item)) {
        invalidItems.push(recipe.item);
      }
      return false;
    }
    return true;
  });
  recipes.forEach((recipe, i) => {
    recipe.recipe.forEach((recipeItem, i) => {
      if (Array.isArray(recipeItem)) {
        recipe.recipe[i] = recipeItem.filter((variant) => {
          if (variant && !names.includes(variant)) {
            if (!invalidItems.includes(variant)) {
              invalidItems.push(variant);
            }
            return false;
          }
          return true;
        });
      } else if (recipeItem && !names.includes(recipeItem)) {
        if (recipeItem === "Damaged Turtle Shell") {
          recipe.recipe[i] = "Turtle Shell";
        } else {
          if (!invalidItems.includes(recipeItem)) {
            invalidItems.push(recipeItem);
          }
          recipes.splice(i, 1);
        }
      }
    });
  });
  recipes = [...new Set(recipes.map((recipe) => JSON.stringify(recipe)))].map((recipe) =>
    JSON.parse(recipe)
  );
  sortByKey(recipes, "item");
  fs.writeFileSync("./data/recipes.json", JSON.stringify(recipes, null, 2));
  console.log(invalidItems);
  console.log(chalk.blue("Done writing recipes. The items that were left out are above."));
})();
