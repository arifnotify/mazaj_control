import { Schema, models, model } from "mongoose";

const WeightOptionSchema = new Schema(
  {
    weight: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true, enum: ["g", "kg", "pcs", "ml", "L"] },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    descriptionEn: { type: String, default: "" },
    descriptionAr: { type: String, default: "" },
    image: { type: String, default: "" },
    categoryEn: { type: String, default: "" },
    categoryAr: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    productType: { type: String, enum: ["single", "multiple"], default: "single" },
    singleWeight: { type: Number, default: null, min: 0 },
    singleUnit: { type: String, enum: ["g", "kg", "pcs", "ml", "L", null], default: null },
    variants: { type: [WeightOptionSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Product || model("Product", ProductSchema);

