import { VercelRequest, VercelResponse } from "@vercel/node";
import createHttpError from "http-errors";
import qs from "qs";
import { z, ZodEffects, ZodIssueCode, ZodType, ZodTypeAny } from "zod";

export async function endpointHandler<T extends ZodTypeAny>(
  schema: ZodType<T> | ZodEffects<T>,
  handler: (query: z.infer<T>) => any
) {
  return async function (req: VercelRequest, res: VercelResponse) {
    try {
      const query = qs.parse(new URL(req.url, `http://${req.headers.host}`).search.slice(1));
      const parsedQuery = schema.parse(query, {
        errorMap(issue, ctx) {
          const parameter = issue.path[0];
          if (parameter) {
            const prefix = `Query parameter "${parameter}" must be`;
            if (issue.code === ZodIssueCode.invalid_type) {
              return {
                message:
                  prefix +
                  ` of type ${issue.expected}, but received a value of type ${issue.received} instead.`,
              };
            } else if (issue.code === ZodIssueCode.invalid_enum_value) {
              return {
                message: prefix + ` one of the following: ${issue.options.join(", ")}.`,
              };
            } else if (issue.message === "invalid_boolean") {
              // overriding the message doesn't work here for some reason
              // might be because the message was already overridden
              throw createHttpError(400, prefix + " of type boolean.");
            } else {
              return {
                message:
                  `Error when validating the "${parameter}" query parameter: ` + ctx.defaultError,
              };
            }
          }
          return { message: "Error when validating query parameters: " + ctx.defaultError };
        },
      });
      res.json(await handler(parsedQuery));
    } catch (e) {
      if (e.issues) {
        console.log(e.issues[0]);

        res.status(400).send(e.issues[0].message);
      } else if (e.status) {
        res.status(e.status).send(e.message);
      } else {
        res.status(500).send("An unexpected server error has occurred.");
      }
    }
  };
}
