import mongoose, { Schema, models, model } from "mongoose";

const StockArrivalSchema = new Schema(
  {
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        sku: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, default: "" },
      },
    ],

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