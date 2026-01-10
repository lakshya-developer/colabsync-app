import mongoose, { Schema, Document } from "mongoose";

export interface Company extends Document {
  name: string;
  domain?: string;
  avatarUrl: string;
  slug: string;
  settings: {
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    task: {
      defaultPriority: string;
      allowTaskDelete: boolean;
    };
    chat: {
      allowFileSharing: boolean;
      archivePeriodDays: number;
    };
    policies: {
      passwordExpiryDays: number;
      allowExternalUsers: boolean;
    };
    custom: object;
  };
  designations: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CompanySchema: Schema<Company> = new mongoose.Schema({
  name: { type: String, required: [true, "Company name is required."] },
  domain: {
    type: String,
    required: [true, "Domain name is required."],
    unique: true,
    sparse: true,
  },
  avatarUrl: String,
  // Public identifier (used in URLs)
  slug: {
    type: String,
    required: [true, "Slug name is required."],
    unique: true,
    lowercase: true,
    trim: true,
  },
  settings: {
    timezone: { type: String, default: "UTC" },

    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "18:00" },
    },

    task: {
      defaultPriority: { type: String, default: "medium" },
      allowTaskDelete: { type: Boolean, default: true },
    },

    chat: {
      allowFileSharing: { type: Boolean, default: true },
      archivePeriodDays: { type: Number, default: 90 },
    },

    policies: {
      passwordExpiryDays: { type: Number, default: 90 },
      allowExternalUsers: { type: Boolean, default: false },
    },

    custom: {
      type: Object,
      defaault: {},
    },
  },
  designations: { type: [String], default: [] },
  createdBy: {
    type: mongoose.Types.ObjectId,
    required: [true, "Id of the creater is required."],
  },
  createdAt: { type: Date, default: Date.now },
});

const CompanyModel =
  (mongoose.models.Company as mongoose.Model<Company>) ||
  mongoose.model("Company", CompanySchema);

export default CompanyModel;
