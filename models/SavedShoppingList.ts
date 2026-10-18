import mongoose, { Schema, models, model } from "mongoose";

const SavedShoppingListSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Keep productIds for backward compatibility with lists created by the previous version.
    productIds: { type: [String], default: [] },
    items: {
      type: [{
        productId: { type: String, required: true },
        quantity: { type: mongoose.Schema.Types.Mixed, default: "" }, // ব্ল্যাংক বা যেকোনো সংখ্যা সেভ করার জন্য
        unit: { type: String, default: "kg" }, // kg, gm, pcs ইউনিট সেভ করার জন্য
      }],
      default: [],
    },
  },
  { timestamps: true, collection: "savedshoppinglists" }
);

export default (models.SavedShoppingList as mongoose.Model<any>) ||
  model("SavedShoppingList", SavedShoppingListSchema);