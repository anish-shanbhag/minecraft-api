const express = require("express");
require("express-async-errors");
const axios = require("axios");
const cors = require("cors");
const createError = require("http-errors");
const config = require("./config.json");
const knex = require("knex")({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: config.dbPassword,
    database: "minecraft",
    typeCast(field, next) {
      if (field.type == "TINY" && field.length == 1) {
        return (field.string() == "1");
      } else if (field.type === "JSON") {
        return JSON.parse(field.string());
      }
      return next();
    }
  }
});

const app = express();
app.use(cors());

const getParams = (req, params) => params.map(([param, defaultValue]) => req.query[param] ? req.query[param] : defaultValue);

const arrayEndpoint = (tableName, req) => {
  if (req.query.page && !req.query.limit) {
    throw createError(400, "If you include the page parameter, you must also include the limit parameter.");
  }
  const params = [
    ["limit", 1000000],
    ["page", 1],
    ["sort", tableName + "." + tableName.slice(0, -1) + "Id"],
    ["order", "asc"],
    ["fields", "*"]
  ];
  const [limit, page, sort, order, fields] = getParams(req, params);
  return knex.select(fields).from(tableName).orderBy(sort, order).limit(limit).offset(limit * (page - 1));
}

app.get("/items", async (req, res) => {
  const query = arrayEndpoint("items", req);
  if (req.query.stackSize) {
    query.where("stackSize", req.query.stackSize);
  }
  res.send(await query);
});

const getItem = async (item, fields = "*") => {
  const column = isNaN(item) ? item.toLowerCase() === item ? "namespacedId" : "name" : "itemId";
  const itemObject = await knex.select(fields).from("items").where(column, item).first();
  if (itemObject) {
    return itemObject;
  } else {
    throw createError(404, "The requested item was not found.");
  }
}

app.get("/items/:item", async (req, res) => res.send(await getItem(req.params.item, req.query.fields)));

app.get("/blocks", async (req, res) => {
  const query = arrayEndpoint("blocks", req);
  if (req.query.color) {
    if (!/^#[0-9A-F]{6}$/i.test(req.query.color)) {
      throw createError(400, "Color parameter must be a valid hex color in the form #FFFFFF.");
    }
    const int = parseInt(req.query.color.slice(1), 16);
    const red = (int >> 16) & 255;
    const green = (int >> 8) & 255;
    const blue = int & 255;
    const [colorVariance, colorAmount] = getParams(req, [
      ["colorVariance", 20],
      ["colorAmount", 0.1]
    ]);
    query
      .innerJoin("blockColors", "blocks.blockId", "blockColors.blockId")
      .whereRaw(`
        ABS(CAST(blockColors.red AS SIGNED) - :red) + 
        ABS(CAST(blockColors.green AS SIGNED) - :green) +
        ABS(CAST(blockColors.blue AS SIGNED) - :blue) < :colorVariance
        AND blockColors.amount > :colorAmount
      `, {
        red,
        green,
        blue,
        colorVariance,
        colorAmount
      })
      .groupBy("blocks.blockId");
  }
  const fields = ["transparent", "luminance", "blastResistance", "flammable", "tool", "requiresTool", "requiresSilkTouch"];
  for (const field of fields) {
    const value = req.query[field];
    if (value) {
      query.where(field, value === "true" || value === "false" ? (value === "true") : value);
    }
  }
  const numericalFields = ["Luminance", "BlastResistance"];
  for (const numericalField of numericalFields) {
    if (req.query["min" + numericalField]) {
      query.where(numericalField, ">=", req.query["min" + numericalField]);
    }
    if (req.query["max" + numericalField]) {
      query.where(numericalField, "<=", req.query["max" + numericalField]);
    }
  }
  res.send(await query);
});

app.get("/blocks/:block", async (req, res) => {
  const block = req.params.block;
  const column = isNaN(block) ? block.toLowerCase() === block ? "namespacedId" : "name" : "blockId";
  const fields = req.query.fields ? req.query.fields : "*";
  const blockObject = await knex.select(fields).from("blocks").where(column, block).first();
  if (blockObject) {
    res.send(blockObject);
  } else {
    throw createError(404, "The requested block was not found.");
  }
});

app.get("/crafting-recipes", async (req, res) => {
  const query = arrayEndpoint("craftingRecipes", req);
  if (req.query.item) {
    query.where("itemId", (await getItem(req.query.item, "itemId")).itemId);
  }
  if (req.query.uses) {
    query.whereRaw("recipe REGEXP '^:itemId$|\\\\[:itemId,.+|, :itemId,|, :itemId\\\\]'", {
      ...await getItem(req.query.uses, "itemId")
    });
  }
  let recipes = await query;
  if (req.query.itemFields) {
    const getFlattenedItem = async itemId => {
      let item = await getItem(itemId, req.query.itemFields);
      if (Object.values(item).length === 1) return Object.values(item)[0];
      return item;
    }
    recipes = await Promise.all(recipes.map(async ({
      craftingRecipeId,
      itemId,
      quantity,
      shapeless,
      recipe
    }) => {
      const recipeObject = {
        craftingRecipeId,
        quantity,
        shapeless
      }
      if (itemId) {
        recipeObject.item = await getFlattenedItem(itemId);
      }
      if (recipe) {
        recipeObject.recipe = await Promise.all(recipe.map(async variant => {
          if (variant) {
            if (Array.isArray(variant)) {
              return Promise.all(variant.map(async variantItem => {
                return variantItem ? getFlattenedItem(variantItem) : null
              }));
            } else {
              return getFlattenedItem(variant);
            }
          } else return null;
        }));
      }
      return recipeObject;
    }))
  }
  res.send(recipes);
});

const port = process.env.PORT || 4000;
app.listen(port, async () => {
  try {
    const data = (await axios.get("http://localhost:4000/blocks", {
      params: {
        transparent: true,
        minBlastResistance: 100,
        maxBlastResistance: 5000,
        tool: "Pickaxe"
      }
    })).data;
    console.log(data);
  } catch (e) {
    console.error("Client error: " + e);
  }
});