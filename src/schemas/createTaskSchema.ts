import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  mongoose.Types.ObjectId.isValid,
  {
    message: "Invalid ObjectId",
  }
);

const dateSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  {
    message: "Invalid date format",
  }
);

export const attachmentsSchema = z.object({
  fileName: z
    .string()
    .min(1, "File name is required"),

  file: z.instanceof(File),

  uploadedBy: objectIdSchema,
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required"),

  description: z.string().optional(),

  dueDate: dateSchema.optional(),

  priority: z
    .enum(["low", "medium", "high"])
    .optional(),

  assignedId: objectIdSchema,

  creatorId: objectIdSchema,

  teamId: objectIdSchema.optional(),

  companyId: objectIdSchema,

  attachments: z
    .array(attachmentsSchema)
    .optional(),

  startDate: dateSchema.optional(),
});

export type CreateTaskSchemaType = z.infer<
  typeof createTaskSchema
>;