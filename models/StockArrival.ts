import mongoose, { Schema, models, model } from "mongoose";

const StockArrivalProductSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Product",
    },
    sku: { type: String, required: true },
    // Keep a default display name for compatibility with older UI/API code.
    name: { type: String, required: true },
    // Save both names so the arrival history can switch language.
    nameEn: { type: String, default: "" },
    nameAr: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const StockArrivalSchema = new Schema(
  {
    products: { type: [StockArrivalProductSchema], default: [] },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      index: true,
    },

    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    confirmedByName: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },

    marketplaceConfirmation: {
      talabat: { type: Boolean, default: false },
      snoonu: { type: Boolean, default: false },
      rafeeq: { type: Boolean, default: false },
      keeta: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default models.StockArrival ||
  model("StockArrival", StockArrivalSchema);