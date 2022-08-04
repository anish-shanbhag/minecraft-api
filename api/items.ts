import { z } from "zod";

import { booleanSchema, arrayEndpoint } from "../utils";

export default arrayEndpoint({
  name: "items",
  fields: ["name", "namespacedId", "description", "image", "stackSize", "renewable"],
  filterableFields: ["name", "namespacedId", "stackSize", "renewable"],
  restOfSchema: {
    name: z.string(),
    namespacedId: z.string(),
    stackSize: z.enum(["1", "16", "64"]).transform(parseInt),
    renewable: booleanSchema,
  },
});
