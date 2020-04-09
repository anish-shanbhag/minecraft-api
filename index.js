import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 4000;

(async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await server.listen();
  console.log(`Server listening on port ${url}`);
})();