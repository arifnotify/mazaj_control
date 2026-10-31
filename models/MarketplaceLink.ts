import { Schema, models, model } from "mongoose";
const MarketplaceLinkSchema = new Schema({
  platform: { type: String, required: true, unique: true, enum: ["Talabat", "Snoonu", "Rafeeq", "Keeta", "Direct"] },
  url: { type: String, default: "" },
}, { timestamps: true });
export default models.MarketplaceLink || model("MarketplaceLink", MarketplaceLinkSchema);
