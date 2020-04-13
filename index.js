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
    typeCast (field, next) {
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
    ["sort", tableName.slice(0, -1) + "Id"],
    ["order", "asc"],
    ["include", "*"]
  ];
  const [limit, page, sort, order, include] = params.map(([param, defaultValue]) => req.query[param] ? req.query[param] : defaultValue);
  return knex.select(include).from(tableName).orderBy(sort, order).limit(limit).offset(limit * (page - 1));
}

app.get("/items", async (req, res) => res.send(await arrayEndpoint("items", req)));

app.get("/items/:item", async (req, res) => {
  const item = req.params.item;
  const column = isNaN(item) ? item.toLowerCase() === item ? "namespacedId" : "name" : "itemId";
  const include = req.query.include ? req.query.include : "*";
  const itemObject = await knex.select(include).from("items").where(column, item).first();
  if (itemObject) {
    res.send(itemObject);
  } else {
    throw createError(404, "The requested item was not found.");
  }
});

app.get("/blocks", async (req, res) => res.send(await arrayEndpoint("blocks", req)));

app.get("/blocks/:block", async (req, res) => {
  const block = req.params.block;
  const column = isNaN(block) ? block.toLowerCase() === block ? "namespacedId" : "name" : "blockId";
  const include = req.query.include ? req.query.include : "*";
  const blockObject = await knex.select(include).from("blocks").where(column, block).first();
  if (blockObject) {
    res.send(blockObject);
  } else {
    throw createError(404, "The requested block was not found.");
  }
});

app.get("/crafting-recipes", async (req, res) => res.send(await arrayEndpoint("craftingRecipes", req)));

const port = process.env.PORT || 4000;
app.listen(port, async () => {
  try {
    const recipes = (await axios.get("http://localhost:4000/crafting-recipes", {
      params: {
        page: 2,
        limit: 20,
      }
    })).data;
    console.log(recipes);
  } catch (e) {
    console.error("Client error: " + e);
  }
  return
  console.log(await Promise.all(recipes.map(async ({itemId, quantity, shapeless, recipe}) => ({
    item: (await axios("http://localhost:4000/items/" + itemId)).data,
    quantity,
    shapeless,
    recipe: await Promise.all(recipe.map(async craftingVariant => craftingVariant ? (await axios("http://localhost:4000/items/" + craftingVariant)).data.name : null))
  }))));
});