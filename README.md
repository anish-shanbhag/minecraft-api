# The Minecraft API

This is the repository for the (unofficial) Minecraft API!

The aim of this API is to provide you with access to all sorts of information about the game Minecraft. This includes things like images, descriptions, stats, technical details, and much more. Currently, the API has endpoints for information about items, blocks, and crafting recipes, but more is planned for the future. The API is up to date for Minecraft Java Edition 1.15.2. Support for the 1.16 update will most likely come some time after its full launch.

# Documentation

You can find detailed documentation for the API [here](https://anish-shanbhag.stoplight.io/docs/minecraft-api).

# Endpoints

The root endpoint of the API is https://minecraft-api.vercel.app/api.

You can find detailed information about all of the current endpoints by expanding the **Endpoints** dropdown on the left.

To form requests to the API, append the path of the resource you want to the end of the root endpoint. As an example, a simple request to get information about all of the items in Minecraft would be https://minecraft-api.vercel.app/api/items. This request would return the following JSON:

```json
[
  {
    "name": "Acacia Boat",
    "namespacedId": "acacia_boat",
    "description": "A boat is both an item and a vehicle entity.",
    "image": "https://minecraft-api.vercel.app/images/items/acacia_boat.png",
    "stackSize": 1,
    "renewable": true
  },
  {
    "name": "Acacia Button",
    "namespacedId": "acacia_button",
    "description": "A button is a non-solid block that can provide temporary redstone power.",
    "image": "https://minecraft-api.vercel.app/images/items/acacia_button.png",
    "stackSize": 64,
    "renewable": true
  },
  {
    "name": "Acacia Door",
    "namespacedId": "acacia_door",
    "description": "A door is a block that can be used as a barrier that can be opened by hand or with redstone.",
    "image": "https://minecraft-api.vercel.app/images/items/acacia_door.png",
    "stackSize": 64,
    "renewable": true
  },
  ...
]
```

# A Note About Development

This project is currently a work in progress, and so there may be errors in the documentation or bugs in the API. If you find one, you can help me out by creating an issue in the [GitHub repository](https://github.com/anish-shanbhag/minecraft-api).
