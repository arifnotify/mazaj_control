
import mongoose, { Schema, models, model } from "mongoose";

const SavedProductItemSchema = new Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
    },
    nameEn: {
      type: String,
      default: "",
    },
    nameAr: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Uncategorized",
    },
  },
  { _id: false }
);

const SavedProductListSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    items: {
      type: [SavedProductItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

SavedProductListSchema.index({ updatedAt: -1 });

const SavedProductList =
  models.SavedProductList ||
  model("SavedProductList", SavedProductListSchema);

export default SavedProductList;
