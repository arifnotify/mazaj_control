import {
  Schema,
  models,
  model,
} from "mongoose";

const ProductMarketplaceSchema =
  new Schema(
    {
      // =========================================
      // PRODUCT
      // =========================================

      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      // =========================================
      // MARKETPLACE
      // =========================================

      marketplace: {
        type: String,
        enum: [
          "Talabat",
          "Snoonu",
          "Rafeeq",
          "Keeta",
        ],
        required: true,
      },

      // =========================================
      // AVAILABILITY
      // =========================================

      available: {
        type: Boolean,
        default: false,
      },

      // =========================================
      // PRICE
      // =========================================

      price: {
        type: Number,
        default: 0,
        min: 0,
      },

      // =========================================
      // PRODUCT NAME - ENGLISH
      // =========================================

      nameEn: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // PRODUCT NAME - ARABIC
      // =========================================

      nameAr: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // DESCRIPTION - ENGLISH
      // =========================================

      descriptionEn: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // DESCRIPTION - ARABIC
      // =========================================

      descriptionAr: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // IMAGE
      // =========================================

      image: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // CATEGORY - ENGLISH
      // =========================================

      categoryEn: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // CATEGORY - ARABIC
      // =========================================

      categoryAr: {
        type: String,
        default: "",
        trim: true,
      },

      // =========================================
      // SYNC STATUS
      // =========================================

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

// =============================================
// SAME PRODUCT + MARKETPLACE DUPLICATE PREVENT
// =============================================

ProductMarketplaceSchema.index(
  {
    productId: 1,
    marketplace: 1,
  },
  {
    unique: true,
  }
);

export default
  models.ProductMarketplace ||
  model(
    "ProductMarketplace",
    ProductMarketplaceSchema
  );