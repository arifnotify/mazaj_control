import mongoose, { Schema, models, model } from "mongoose";

const SavedShoppingListSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    productIds: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "A shopping list must contain at least one product.",
      },
    },
  },
  { timestamps: true, collection: "savedshoppinglists" }
);

export default (models.SavedShoppingList as mongoose.Model<any>) ||
  model("SavedShoppingList", SavedShoppingListSchema);
