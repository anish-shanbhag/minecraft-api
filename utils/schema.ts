import { z, ZodNumber } from "zod";

export const preprocessNumber = (schema: ZodNumber) =>
  z.preprocess((num) => (isNaN(Number(num)) ? num : Number(num)), schema);

export const numberSchema = preprocessNumber(z.number());

export const positiveNumberSchema = preprocessNumber(z.number().min(0));

export const positiveIntSchema = preprocessNumber(z.number().int().min(1));

export const nonNegativeIntSchema = preprocessNumber(z.number().int().min(0));

export const booleanSchema = z
  .string()
  .refine((val) => ["true", "false"].includes(val), { message: "invalid_boolean" })
  .transform((val) => val === "true");
