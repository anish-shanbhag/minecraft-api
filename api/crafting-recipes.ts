import { z } from "zod";

import { CraftingRecipe } from "types";
import { booleanSchema, positiveNumberSchema, arrayEndpoint } from "../utils";

export default arrayEndpoint({
  name: "recipes",
  fields: ["item", "quantity", "shapeless", "recipe"],
  filterableFields: ["item", "quantity", "shapeless"],
  restOfSchema: {
    item: z.string(),
    quantity: positiveNumberSchema,
    shapeless: booleanSchema,
    uses: z.string(),
  },
  handler(recipes: Partial<CraftingRecipe>[], query) {
    let filteredRecipes = recipes;
    if (query.item) {
      filteredRecipes = filteredRecipes.filter((recipe) => recipe.item === query.item);
    }
    if (query.uses) {
      filteredRecipes = filteredRecipes.filter((recipe) =>
        recipe.recipe.some(
          (slot) => slot === query.uses || (Array.isArray(slot) && slot.includes(query.uses))
        )
      );
    }
    return filteredRecipes;
  },
});
