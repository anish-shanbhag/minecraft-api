import { z, ZodDefault, ZodObject, ZodRawShape } from "zod";

import { pickKeys, sortByKey, endpointHandler, filterByFields, positiveIntSchema } from ".";

type Element = Record<string, any>;
type ElementKeys = [keyof Element, ...(keyof Element)[]];

export async function arrayEndpoint<T extends ZodRawShape>({
  name,
  fields,
  filterableFields,
  restOfSchema,
  handler,
}: {
  name: string;
  fields: ElementKeys;
  filterableFields: ElementKeys;
  restOfSchema: T;
  handler?: (elements: Partial<Element>[], query: z.infer<ZodObject<T>>) => Partial<Element>[];
}) {
  const arrayEndpointSchema = z.object({
    limit: positiveIntSchema.default(9999999),
    page: positiveIntSchema.default(1),
    sort: z.enum(fields).optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
    fields: z
      .array(z.enum(fields))
      .nonempty({ message: `Query parameter "fields" must have at least one element.` })
      .default(fields),
  });

  const partialRestOfSchema = Object.keys(restOfSchema).reduce(
    (schema, field) => ({
      ...schema,
      ...{
        [field]:
          restOfSchema[field] instanceof ZodDefault
            ? restOfSchema[field]
            : restOfSchema[field].optional(),
      },
    }),
    {}
  ) as T;

  return endpointHandler(
    z
      .object(partialRestOfSchema)
      .merge(arrayEndpointSchema)
      .refine((query: any) => !query.page || query.limit, {
        message: "If you include the page parameter, you must also include the limit parameter.",
      }),
    async (query: z.infer<typeof arrayEndpointSchema> & { [key: string]: any }) => {
      const { limit, page, sort, order, fields } = query;
      const array: Element[] = (await import(`../data/${name}.json`)).default;
      if (sort) sortByKey(array, sort);
      if (order === "desc") array.reverse();
      const filtered = filterByFields(
        array.slice(limit * (page - 1), limit),
        pickKeys(query as Element, filterableFields)
      );
      const handled = handler ? handler(filtered, query as any) : filtered;
      return handled.map((element) => pickKeys(element, fields));
    }
  );
}
