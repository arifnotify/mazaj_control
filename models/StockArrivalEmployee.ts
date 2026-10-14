import mongoose, { Schema, models, model } from "mongoose";

const StockArrivalEmployeeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pinHash: {
      type: String,
      required: true,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

StockArrivalEmployeeSchema.index({ name: 1 }, { unique: true });

export default models.StockArrivalEmployee ||
  model("StockArrivalEmployee", StockArrivalEmployeeSchema);