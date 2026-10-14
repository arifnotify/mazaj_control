import mongoose, { Schema, models, model } from "mongoose";

export interface IEmployee {
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "employee";
  active: boolean;
  pinHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true }
);

export default models.Employee ||
  model<IEmployee>("Employee", EmployeeSchema);