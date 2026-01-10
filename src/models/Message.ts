import mongoose, {Schema, Document} from 'mongoose';

export interface Attachment {
  url: string;
  filename: string;
  fileType: string;
  size: number;
}

export interface Message extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  attachments?: Attachment[];
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

const MessageSchema: Schema = new Schema({
  roomId: {type: mongoose.Types.ObjectId, required: true, ref: 'Room'},
  senderId: {type: mongoose.Types.ObjectId, required: true, ref: 'User'},
  content: {type: String, required: true},
  attachments: [
    {
      url: {type: String, required: true},
      filename: {type: String, required: true},
      fileType: {type: String, required: true},
      size: {type: Number, required: true},
    },
  ],
  createdAt: {type: Date, default: Date.now},
  editedAt: {type: Date},
});

export default (mongoose.models.Message as mongoose.Model<Message>) || mongoose.model<Message>('Message', MessageSchema);