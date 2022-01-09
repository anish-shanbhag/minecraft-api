import { z } from "zod";

import { booleanSchema, numberSchema, positiveIntSchema, arrayEndpoint } from "../utils";

export default arrayEndpoint({
  name: "blocks",
  fields: [
    "name",
    "namespacedId",
    "description",
    "image",
    "item",
    "tool",
    "flammable",
    "transparent",
    "luminance",
    "blastResistance",
  ],
  filterableFields: ["item", "tool", "flammable", "transparent", "luminance", "blastResistance"],
  restOfSchema: {
    item: z.string(),
    tool: z.enum(["Axe", "Pickaxe", "Sword", "Shovel", "Hoe", "Shears", null]),
    flammable: booleanSchema,
    transparent: booleanSchema,
    luminance: positiveIntSchema,
    blastResistance: numberSchema,
    // TODO: min/max fields and color fields
  },
});
