
import mongoose, { Schema, models, model } from "mongoose";

const StoreRequestItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      default: "-",
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const StoreRequestSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    items: {
      type: [StoreRequestItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) =>
          Array.isArray(items) && items.length > 0,
        message:
          "A store request must contain at least one product.",
      },
    },
    requestNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

StoreRequestSchema.index({
  date: -1,
  createdAt: -1,
});

const StoreRequest =
  models.StoreRequest ||
  model("StoreRequest", StoreRequestSchema);

export default StoreRequest;