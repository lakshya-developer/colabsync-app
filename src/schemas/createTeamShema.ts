import {z} from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Company Id is required.'),
  managerId: z.string().optional(),
  createdBy: z.string().min(1, 'Created By is required.'),
})