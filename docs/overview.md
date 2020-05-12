# The Minecraft API

**Welcome to the documentation for the (unofficial) Minecraft API!**

The aim of this API is to provide you with access to all sorts of information about the game Minecraft. This includes things like images, descriptions, stats, technical details, and much more. Currently, the API has endpoints for information about items, blocks, and crafting recipes, but more is planned for the future. The API is up to date for Minecraft Java Edition 1.15.2. Support for the 1.16 update will most likely come some time after its full launch.

# Endpoints

Currently, the root endpoint of the API is https://i8xla88513.execute-api.us-east-1.amazonaws.com/latest. A custom domain name (that would be much easier to remember than this one!) may come soon.

You can find detailed information about all of the current endpoints by expanding the **Endpoints** dropdown on the left.

To form requests to the API, append the path of the resource you want to the end of the root endpoint. As an example, a simple request to get information about all of the items in Minecraft would be https://i8xla88513.execute-api.us-east-1.amazonaws.com/latest/items. This request would return the following JSON:
```json
[
  {
    "itemId": 1,
    "name": "Acacia Boat",
    "namespacedId": "acacia_boat",
    "description": "A boat is both an item and a vehicle entity.",
    "image": "https://minecraft-api.s3.amazonaws.com/items/acacia_boat.png",
    "stackSize": 1
  },
  {
    "itemId": 2,
    "name": "Acacia Button",
    "namespacedId": "acacia_button",
    "description": "A button is a non-solid block that can provide temporary redstone power.",
    "image": "https://minecraft-api.s3.amazonaws.com/items/acacia_button.png",
    "stackSize": 64
  },
  {
    "itemId": 3,
    "name": "Acacia Door",
    "namespacedId": "acacia_door",
    "description": "A door is a block that can be used as a barrier that can be opened by hand or with redstone.",
    "image": "https://minecraft-api.s3.amazonaws.com/items/acacia_door.png",
    "stackSize": 64
  },
  ...
]
```

# Try It Out!

You can try sending requests to the API using the interface below. Each endpoint page also has a **Try It** button which you can use to quickly test out the different endpoints.

```json http
{
  "method": "get",
  "url": "https://i8xla88513.execute-api.us-east-1.amazonaws.com/latest/items"
}
```

# A Note About Development

This project is currently a work in progress, and so there may be errors in the documentation or bugs in the API. If you find one, you can help me out by creating an issue in the [GitHub repository](https://github.com/anish-shanbhag/minecraft-api). Additionally, in order to save resources, the database which the API queries for data shuts down after a few minutes of inactivity. This means that requests to the API will time out if nobody has been using it for a while, and so you may need to resend the request after around a minute in order to get a response.