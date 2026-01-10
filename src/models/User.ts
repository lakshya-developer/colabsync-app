import mongoose, {Schema, Document} from 'mongoose'
import CompanyModel from './Company';

export interface User extends Document {
  name: string,
  email: string,
  passwordHashed: string,
  role: "admin" | "manager" | "employee",
  companyId: mongoose.Types.ObjectId,
  avatarUrl?: string,
  isVerified: boolean,
  emailVerification: {
    codeHash: string,
    expiresAt: Date,
    attemps?: number
  },
  meta: {
    employeeCode: string,
    designation: string,
    assignedTeamId: mongoose.Types.ObjectId,
    preferences: {
      language: string,
      notifications: {
        email: boolean,
        push: boolean,
        sound: boolean
      }
    },
    onboarding: {
      isCompleted: boolean,
      steps: string[]
    },
    chat: {
      mutedRooms: mongoose.Types.ObjectId[],
      pinnedRooms: mongoose.Types.ObjectId[]
    },
    deviceInfo: {
      lastLoginIp: string,
      lastDevice: string
    },
    custom: {}
  },
  isOnline: boolean,
  lastActive: Date,
  createdAt: Date
}

const UserSchema: Schema<User> = new Schema({
  name: {type: String, required: [true, 'Name is required.']},
  email: {type: String, unique: true, required: [true, 'Email is required.']},
  passwordHashed: {type: String, required: [true, 'Password is required.']},
  role: {type: String, enum: ['admin', 'manager', 'employee'], default: 'admin',required: [true, 'User Role is required.']},
  companyId: {type: mongoose.Schema.Types.ObjectId, ref: "Company"},
  avatarUrl: String,
  isVerified: {type: Boolean, default: false},
  emailVerification: {
    codeHash: String,
    expiresAt: Date,
    attemps: { type: Number, default: 0 }
  },
  meta: {
    employeeCode: {type: String, unique: true},
    designation: { type: String, default: "" },
    assignedTeamId: {type: mongoose.Schema.Types.ObjectId, ref: "Team"},
    preferences: {
      language: { type: String, default: "en" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
      }
    },
    onboarding: {
      isCompleted: { type: Boolean, default: false },
      steps: {type: [String], default: [] }
    },
    chat: {
      mutedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
      pinnedRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }]
    },
    deviceInfo: {
      lastLoginIp: String,
      lastDevice: String
    },
    custom: {} // catch-all for future features
  },
  isOnline: { type: Boolean, default: false },
  lastActive: {type: Date, default: null},
  createdAt: {type: Date, default: Date.now}
})

const employeeCounterSchema = new Schema({
  _id: { type: String },  // companyId + role
  block: { type: String, default: "A" },
  number: { type: Number, default: 0 }
});
export const EmployeeCounterModel = mongoose.models.EmployeeCounter || mongoose.model('EmployeeCounter', employeeCounterSchema);

function nextBlock(block: string): string {
  let result = "";
  let carry = true;

  for (let i = block.length - 1; i >= 0; i--) {
    if (carry) {
      if (block[i] === "Z") {
        result = "A" + result;
      } else {
        result = String.fromCharCode(block.charCodeAt(i) + 1) + result;
        carry = false;
      }
    } else {
      result = block[i] + result;
    }
  }

  if (carry) result = "A" + result; // overflow case (Z → AA)

  return result;
}

UserSchema.pre<User>("save", async function () {
  if (!this.isNew) return;

  if(this.role === 'admin') return;

  const company = await CompanyModel.findById(this.companyId);
  if(!company) return new Error("Company not found");

  const companyCode = company.name.substring(0, 3).padEnd(3, "X").toUpperCase();
  
  const counterId = `${this.companyId}_${this.role}`;
  
  let counter = await EmployeeCounterModel.findById(counterId);
  
  if (!counter) {
    counter = await EmployeeCounterModel.create({
      _id: counterId,
      block: "A",
      number: 0
    });
  }

  // Increment number
  counter.number++;

  // If overflow
  if (counter.number > 9999) {
    counter.number = 1;
    counter.block = nextBlock(counter.block);
  }
 
  await counter.save();

  this.meta.employeeCode = `${companyCode}-${this.role === 'manager' ? "MGR" : "EMP"}-${counter.block}-${String(counter.number).padStart(4, "0")}`;

  return
});


const UserModel = (mongoose.models.User as mongoose.Model<User>) || mongoose.model<User>('User', UserSchema);

export default UserModel;