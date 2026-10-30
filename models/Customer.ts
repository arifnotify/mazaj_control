import mongoose, { Schema, models, model } from "mongoose";

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, unique: true, index: true },
    address: { type: String, default: "", trim: true },
    area: { type: String, default: "", trim: true },
    notes: { type: String, default: "" },

    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    firstOrderAt: { type: Date, default: null },
    lastOrderAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.Customer || model("Customer", CustomerSchema);