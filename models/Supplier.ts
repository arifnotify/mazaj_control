import mongoose, { Schema, models, model } from "mongoose";

const SupplierProductSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, default: "", trim: true },
    nameEn: { type: String, default: "", trim: true },
    nameAr: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    unitCost: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const SupplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["regular", "market"], default: "regular" },
    contactPerson: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    marketName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    supplierProducts: { type: [SupplierProductSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: 1, type: 1 });

const Supplier = models.Supplier || model("Supplier", SupplierSchema);
export default Supplier;
