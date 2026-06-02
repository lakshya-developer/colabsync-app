import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  mongoose.Types.ObjectId.isValid,
  {
    message: "Invalid ObjectId",
  }
);

export const attachmentsSchema = z.object({
  file: z.instanceof(File),

  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename is too long"),

  fileType: z
    .string()
    .min(1, "File type is required")
    .max(100, "File type is too long"),

  size: z
    .number()
    .min(0, "Invalid file size"),
});

export const messageSchema = z.object({
  roomId: objectIdSchema,

  senderId: objectIdSchema,

  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content exceeds maximum length"),

  attachments: z
    .array(attachmentsSchema)
    .optional(),
});

export type MessageSchemaType = z.infer<
  typeof messageSchema
>;