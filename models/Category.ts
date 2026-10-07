import mongoose, { Schema, models, model } from "mongoose";

const CategorySchema = new Schema(
  {
    nameEn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    nameAr: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    descriptionEn: {
      type: String,
      default: "",
      trim: true,
    },

    descriptionAr: {
      type: String,
      default: "",
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Category ||
  model("Category", CategorySchema);