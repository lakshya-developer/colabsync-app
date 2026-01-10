import mongoose, {Schema, Document} from "mongoose";
import { array, object } from "zod";

export interface AuditLog extends Document {
  _id: mongoose.Types.ObjectId;

  action: string;                    // e.g. "TASK_CREATED", "USER_UPDATED", "TEAM_DELETED"

  actorId: mongoose.Types.ObjectId;           // who performed the action

  targetType: "user" | "team" | "task" | "room" | "company" | "message";    // what entity was affected

  targetId: mongoose.Types.ObjectId;          // the specific record affected

  timestamp: Date;                   // when it happened

  meta?: AuditLogMeta;               // extra details
}

export interface AuditLogMeta {
  // old values before update
  previous?: fieldsChanged[];

  // new values after update
  current?: fieldsChanged[];

  // optional descriptive message
  note?: string;

  // IP, browser, device etc. (optional)
  ip?: string;
  userAgent?: string;
}

export interface fieldsChanged {
  field: string;
  value: string;
}

const AuditLogSchema: Schema<AuditLog> = new mongoose.Schema({
  action: {type: String, required: true},
  actorId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: "User"},
  targetType: {type: String, required: true, enum: ["user", "team", "task", "room", "company", "message"]},
  targetId: {type: mongoose.Schema.Types.ObjectId, required: true},
  timestamp: {type: Date, default: Date.now},
  meta: {
    previous: {
      field: {type: String},
      value: {type: String},
    },
    current: {
      field: {type: String},
      value: {type: String},
    },
    note: {type: String},
    ip: {type: String},
    userAgent: {type: String},
  },
})

export const AuditLogModel = (mongoose.models.AuditLog as mongoose.Model<AuditLog>) || mongoose.model<AuditLog>("AuditLog", AuditLogSchema);