import {z} from 'zod';

export const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(['admin', 'manager', 'employee']).default('admin'),
  companyId: z.string(),
  avatarUrl: z.string().url().optional(),
  designation: z.string().optional(),
})