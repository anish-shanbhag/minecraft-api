# The Minecraft API

This is the repository for the (unofficial) Minecraft API!

The aim of this API is to provide you with access to all sorts of information about the game Minecraft. Currently, the API has endpoints for information about items, blocks, and crafting recipes, but more is planned for the future. The API is up to date for Minecraft 1.15.2. Support for the 1.16 update will most likely come some time after its full launch.

# Endpoints

Currently, the root endpoint of the API is https://i8xla88513.execute-api.us-east-1.amazonaws.com/latest. A custom domain name (that would be much easier to remember than this one!) may come soon.

To form requests to the API, append the path of the resource you want to the end of the root endpoint. As an example, a simple request to get information about all of the items in Minecraft would be https://i8xla88513.execute-api.us-east-1.amazonaws.com/latest/items.

# Documentation

You can find detailed documentation for the API (here)[https://stoplight.io/p/docs/gh/anish-shanbhag/minecraft-api].

# A Note About Development

This project is currently a work in progress, and so there may be errors in the documentation or bugs in the API. If you find one, you can help me out by creating an issue in the [GitHub repository](https://github.com/anish-shanbhag/minecraft-api). Additionally, in order to save resources, the database which the API queries for data shuts down after a few minutes of inactivity. This means that queries to the API will time out if nobody has been using it for a while, and so you may need to resend the query after around a minute in order to get a response.