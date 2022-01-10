import { z } from "zod";

import { Block } from "types";
import {
  booleanSchema,
  preprocessNumber,
  nonNegativeIntSchema,
  positiveNumberSchema,
  arrayEndpoint,
} from "../utils";

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
    blastResistance: positiveNumberSchema,
    minBlastResistance: positiveNumberSchema,
    maxBlastResistance: positiveNumberSchema,
    luminance: nonNegativeIntSchema,
    minLuminance: nonNegativeIntSchema,
    maxLuminance: nonNegativeIntSchema,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    colorVariance: preprocessNumber(z.number().min(0).max(255)).default(20),
    colorAmount: preprocessNumber(z.number().min(0).max(1)).default(0.1),
    // TODO: min/max fields and color fields
  },
  handler(blocks: Partial<Block>[], query) {
    let filteredBlocks = blocks;

    if (query.color) {
      const int = parseInt(query.color.slice(1), 16);
      const red = (int >> 16) & 255;
      const green = (int >> 8) & 255;
      const blue = int & 255;

      filteredBlocks = filteredBlocks.filter(
        (block) =>
          block.colors.length > 0 &&
          block.colors.every(
            ({ color, amount }) =>
              (Math.abs(color[0] - red) + Math.abs(color[1] - green) + Math.abs(color[2] - blue)) /
                3 <
                query.colorVariance && amount > query.colorAmount
          )
      );
    }

    const numericalFields: (keyof Block)[] = ["luminance", "blastResistance"];
    for (const numericalField of numericalFields) {
      const uppercased = numericalField[0].toUpperCase() + numericalField.slice(1);
      const minField = ("min" + uppercased) as keyof typeof query;
      const maxField = ("max" + uppercased) as keyof typeof query;
      if (query[minField]) {
        filteredBlocks = filteredBlocks.filter((block) => block[numericalField] >= query[minField]);
      }
      if (query[maxField]) {
        filteredBlocks = filteredBlocks.filter((block) => block[numericalField] <= query[maxField]);
      }
    }

    return filteredBlocks;
  },
});
