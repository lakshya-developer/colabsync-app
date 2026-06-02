import { z } from "zod";

export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required."),

  email: z
    .string()
    .email("Invalid email address."),

  password: z
    .string()
    .min(
      6,
      "Password must contain minimum 6 characters."
    ),

  avatar: z
    .instanceof(File)
    .optional(),
});

export type SignUpSchemaType = z.infer<
  typeof signUpSchema
>;