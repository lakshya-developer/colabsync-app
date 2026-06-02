import mongoose, { Document, Schema } from 'mongoose';

export interface Room extends Document {
  name: string;
  description: string;
  type: string;
  participantsId: mongoose.Types.ObjectId[];
  teamId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  meta: RoomMeta;
}

export interface RoomMeta {
  createdAt: Date;
  lastMessageAt: Date;
  isArchived: boolean;
  customName?: string;
}

const RoomSchema: Schema<Room> = new Schema({
  name: {type: String},
  description: {type: String},
  type: { type: String, required: true },
  participantsId: [{ type: mongoose.Types.ObjectId, ref: 'User', required: true }],
  teamId: { type: mongoose.Types.ObjectId, ref: 'Team', required: true },
  companyId: { type: mongoose.Types.ObjectId, ref: 'Company', required: true },
  meta: {
    createdAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    customName: { type: String }
  }
})

export const RoomModel = (mongoose.models.Room as mongoose.Model<Room>) || mongoose.model<Room>('Room', RoomSchema);