import mongoose, {Schema, Document} from 'mongoose'

export interface Team extends Document {
  name: string,
  description?: string,
  companyId: mongoose.Types.ObjectId,
  managerId: mongoose.Types.ObjectId,
  memberId: mongoose.Types.ObjectId[],
  createdBy: mongoose.Types.ObjectId,
  createdAt: Date,
  isDeleted: boolean
}

const TeamSchema: Schema<Team> = new mongoose.Schema({
  name: {type: String, required: [true, 'Team name is required.']},
  description: {type: String},
  companyId: {type: mongoose.Types.ObjectId, required: [true, 'Company Id is required.']},
  managerId: {type: mongoose.Types.ObjectId, required: [true, 'Manager Id is required.']},
  memberId: [{type: mongoose.Types.ObjectId, required: [true, 'Member Id is required.']}],
  createdBy: {type: mongoose.Types.ObjectId, required: [true, 'Created By is required.']},
  createdAt: {type: Date, default: Date.now},
  isDeleted: {type: Boolean, default: false}
})

const TeamModel = (mongoose.models.Team as mongoose.Model<Team>) || mongoose.model<Team>('Team', TeamSchema);

export default TeamModel;