import mongoose, { Schema, models, model } from "mongoose";

const StockReceivingSchema = new Schema(
  {
    // কোন Product এসেছে
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // মাল আসার তারিখ
    // YYYY-MM-DD format রাখা হবে
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    // কত quantity এসেছে
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // অতিরিক্ত information
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Date + Product দিয়ে দ্রুত search করার জন্য
StockReceivingSchema.index({
  date: -1,
  productId: 1,
});

export default models.StockReceiving ||
  model("StockReceiving", StockReceivingSchema);