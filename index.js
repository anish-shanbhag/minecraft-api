const express = require("express");
const axios =require("axios")
require("express-async-errors")
const cors = require("cors");
const createError = require("http-errors");
const config = require("./config.json");
const knex = require("knex")({
  client: "mysql",
  connection: {
    host: "localhost",
    user: "root",
    password: config.dbPassword,
    database: "minecraft"
  }
});

const app = express();
app.use(cors());

const parseInclude = req => {
  if (req.query.include) {
    try {
      return JSON.parse(req.query.include);
    } catch {
      throw createError(400, "The include query parameter was not in proper JSON format.");
    }
  } else return "*";
}

app.get("/items", async (req, res) => {
  if (req.query.page && !req.query.limit) {
    throw createError(422, "If you include the page parameter, you must also include the limit parameter.");
  }
  const limit = req.query.limit ? req.query.limit : 1000000;
  const page = req.query.page ? req.query.page : 1;
  const sort = req.query.sort ? req.query.sort : "itemId";
  const ascOrDesc = req.query.desc ? "desc" : "asc";
  const include = parseInclude(req);
  res.send(await knex.select(include).from("items").orderBy(sort, ascOrDesc).limit(limit).offset(limit * (page - 1)));
});

app.get("/items/:item", async (req, res) => {
  const item = req.params.item;
  const column = isNaN(item) ? item.toLowerCase() === item ? "namespacedId" : "name" : "itemId";
  const include = parseInclude(req);
  const itemObject = await knex.select(include).from("items").where(column, item).first();
  if (itemObject) {
    res.send(itemObject);
  } else {
    throw createError(404, "The requested item was not found.");
  }
});

const port = process.env.PORT || 4000;
app.listen(port, async () => console.log((await axios.get("http://localhost:4000/items/100", {
  params: {
    include: JSON.stringify(["itemId", "image"])
  }
})).data));