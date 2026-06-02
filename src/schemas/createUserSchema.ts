import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine(
  mongoose.Types.ObjectId.isValid,
  {
    message: "Invalid ObjectId",
  }
);

export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required"),

  email: z
    .string()
    .email("Invalid email address"),

  password: z
    .string()
    .min(
      6,
      "Password must be at least 6 characters long"
    ),

  role: z
    .enum(["admin", "manager", "employee"])
    .default("admin"),

  companyId: objectIdSchema,

  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
    .optional(),

  designation: z
    .string()
    .optional(),
});

export type CreateUserSchemaType = z.infer<
  typeof createUserSchema
>;