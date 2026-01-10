import {z} from "zod"


export const signUpSchema = z.object({
  name: z.string(),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must contain minimum 6 characters."),
  avatar: z.instanceof(File).optional(),
})