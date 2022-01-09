import { z, ZodRawShape } from "zod";

import { pickKeys, sortByKey, endpointHandler, filterByFields, positiveIntSchema } from ".";

type Element = Record<string, any>;
type ElementKeys = [keyof Element, ...(keyof Element)[]];

export async function arrayEndpoint({
  name,
  fields,
  filterableFields,
  restOfSchema,
  handler,
}: {
  name: string;
  fields: ElementKeys;
  filterableFields: ElementKeys;
  restOfSchema: ZodRawShape;
  handler?: (elements: Partial<Element>[]) => any;
}) {
  return endpointHandler(
    z
      .object(restOfSchema)
      .extend({
        limit: positiveIntSchema.default(Infinity),
        page: positiveIntSchema.default(1),
        sort: z.enum(fields),
        order: z.enum(["asc", "desc"]).default("asc"),
        fields: z
          .array(z.enum(fields))
          .nonempty({ message: `Query parameter "fields" must have at least one element.` }),
      })
      .partial()
      .refine((query: any) => !query.page || query.limit, {
        message: "If you include the page parameter, you must also include the limit parameter.",
      }),
    async (query) => {
      const { limit, page, sort, order, fields } = query;
      const array: Element[] = (await import(`../data/${name}.json`)).default;
      if (sort) sortByKey(array, sort);
      if (order === "desc") array.reverse();
      const filtered = filterByFields(
        array.slice(limit * (page - 1), limit),
        pickKeys(query as Element, filterableFields)
      ).map((element) => pickKeys(element, fields));
      return handler ? handler(filtered) : filtered;
    }
  );
}
