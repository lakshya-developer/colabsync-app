import {z} from 'zod';

export const attachmentsSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  file: z.instanceof(File),
  uploadedBy: z.string().refine((id) => id.length === 24, {
    message: 'Invalid uploadedBy format',
  })
})

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedId: z.string().refine((id) => id.length === 24, {
    message: 'Invalid assignedId format',
  }),
  creatorId: z.string().refine((id) => id.length === 24, {
    message: 'Invalid creatorId format',
  }),
  teamId: z.string().refine((id) => id.length === 24, {
    message: 'Invalid teamId format',
  }).optional(),
  attachments: z.array(attachmentsSchema).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
})