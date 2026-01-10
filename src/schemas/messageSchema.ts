import {z} from 'zod';

export const AttachmentsSchema = z.object({
  file: z.instanceof(File),
  filename: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  size: z.number().min(0),
})

export const messageSchema = z.object({
  roomId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  attachments: z.array(AttachmentsSchema).optional(),
});