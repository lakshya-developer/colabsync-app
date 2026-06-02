import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  mongoose.Types.ObjectId.isValid,
  {
    message: "Invalid ObjectId",
  }
);

export const registerCompanySchema = z.object({
  name: z
    .string()
    .min(2, "Company name is required."),

  domain: z
    .string()
    .min(2, "Domain name is required."),

  avatar: z.instanceof(File),

  createdBy: objectIdSchema,
});

export type RegisterCompanySchemaType = z.infer<
  typeof registerCompanySchema
>;