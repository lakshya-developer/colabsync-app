import mongoose, { Schema, Document } from 'mongoose';

export interface Attachment {
  _id: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
} 

export interface Comment {
  _id: mongoose.Types.ObjectId;
  commenterId: mongoose.Types.ObjectId;
  content: string;
  commentedAt: Date;
}


export interface Task extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  dueDate: Date;
  attachments: Attachment[];
  comments?: Comment[];
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema<Task> = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true },
  priority: { type: String, required: true },
  assignedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: {type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true},
  dueDate: { type: Date, required: true },
  attachments: [
    {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  comments: [
    {
      commenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true },
      commentedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });


const TaskModel = (mongoose.models.Task as mongoose.Model<Task>) || mongoose.model<Task>('Task', TaskSchema);

export default TaskModel;