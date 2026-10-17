
import mongoose, { Schema, models, model } from "mongoose";

const PurchaseOrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: { type: String, default: "" },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierType: {
      type: String,
      enum: ["regular", "market"],
      default: "regular",
    },
    supplierPhone: { type: String, default: "" },
    supplierEmail: { type: String, default: "" },
    marketName: { type: String, default: "" },
    items: {
      type: [PurchaseOrderItemSchema],
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: "A purchase order must contain products",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "ordered", "received", "cancelled"],
      default: "draft",
      index: true,
    },
    createdBy: { type: String, default: "" },
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.PurchaseOrder ||
  model("PurchaseOrder", PurchaseOrderSchema);
