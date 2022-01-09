import { z, ZodNumber } from "zod";

export const preprocessNumber = (schema: ZodNumber) =>
  z.preprocess((num) => parseInt(num as string), schema);

export const numberSchema = preprocessNumber(z.number());

export const positiveIntSchema = preprocessNumber(z.number().int().min(1));

export const booleanSchema = z
  .string()
  .refine((val) => ["true", "false"].includes(val), { message: "invalid_boolean" })
  .transform((val) => val === "true");
