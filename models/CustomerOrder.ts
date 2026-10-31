import mongoose, { Schema, models, model } from "mongoose";

const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    sku: { type: String, default: "" },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CustomerOrderSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    orderDate: { type: Date, required: true, index: true },

    platform: {
      type: String,
      enum: ["Talabat", "Snoonu", "Rafeeq", "Keeta", "Direct"],
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: "An order must contain at least one product.",
      },
    },

    orderTotal: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

CustomerOrderSchema.index({ customerId: 1, orderDate: -1 });

export default models.CustomerOrder ||
  model("CustomerOrder", CustomerOrderSchema);