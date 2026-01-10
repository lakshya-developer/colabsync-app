import {z} from 'zod';

export const registerCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required.'),
  domain: z.string().min(2, 'Domain name is required.'),
  avatar: z.instanceof(File),
  createdBy: z.string(),
})