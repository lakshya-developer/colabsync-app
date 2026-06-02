import { z } from "zod";
import mongoose from "mongoose";

export const createRoomSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),

  participantsId: z.array(
    z.string().min(1, "Participant ID is required")
  ),

  teamId: z
    .string()
    .refine(
      (id) => mongoose.Types.ObjectId.isValid(id),
      {
        message: "Invalid Team ID",
      }
    ),

  companyId: z
    .string()
    .refine(
      (id) => mongoose.Types.ObjectId.isValid(id),
      {
        message: "Invalid Company ID",
      }
    ),
});

export type createRoomSchema = z.infer<typeof createRoomSchema>;