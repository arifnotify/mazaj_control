import mongoose, { Schema, models, model } from "mongoose";

const IssueSchema = new Schema(
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

    type: {
      type: String,
      enum: [
        "price",
        "name",
        "description",
        "image",
        "category",
        "availability",
        "other",
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "fixed", "verified", "closed"],
      default: "open",
    },

    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default models.Issue || model("Issue", IssueSchema);