import mongoose, { Schema, models, model } from "mongoose";

const ProductSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Product Name
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
    },

    // Product Description
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

    // Product Image
    image: {
      type: String,
      default: "",
      trim: true,
    },

    // Category
    categoryEn: {
      type: String,
      default: "",
      trim: true,
    },

    categoryAr: {
      type: String,
      default: "",
      trim: true,
    },

    // Price
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Stock
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Product ON / OFF
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Product || model("Product", ProductSchema);