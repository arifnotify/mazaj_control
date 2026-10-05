import mongoose, { Schema, models, model } from "mongoose";

const ProductMarketplaceSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    marketplace: {
      type: String,
      enum: ["Talabat", "Snoonu", "Rafeeq", "Keeta"],
      required: true,
    },

    available: {
      type: Boolean,
      default: false,
    },

    price: {
      type: Number,
      default: 0,
    },

    name: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    syncStatus: {
      type: String,
      enum: [
        "synced",
        "pending",
        "failed",
        "not_connected",
      ],
      default: "not_connected",
    },
  },
  {
    timestamps: true,
  }
);

// একই product + marketplace যেন duplicate না হয়
ProductMarketplaceSchema.index(
  {
    productId: 1,
    marketplace: 1,
  },
  {
    unique: true,
  }
);

export default models.ProductMarketplace ||
  model(
    "ProductMarketplace",
    ProductMarketplaceSchema
  );