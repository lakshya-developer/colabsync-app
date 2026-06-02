import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  mongoose.Types.ObjectId.isValid,
  {
    message: "Invalid ObjectId",
  }
);

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Team name is required."),

  description: z
    .string()
    .optional(),

  companyId: objectIdSchema,

  managerId: objectIdSchema.optional(),

  createdBy: objectIdSchema,
});

export type CreateTeamSchemaType = z.infer<
  typeof createTeamSchema
>;