import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const ProductPerformanceSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  expiryDate: { type: String, default: "" },
  salesByPlatform: {
    Snoonu: { type: String, default: "" },
    Talabat: { type: String, default: "" },
    Rafeeq: { type: String, default: "" },
    Keeta: { type: String, default: "" },
  },
  note: { type: String, default: "" },
}, { timestamps: true, collection: "product_performance" });

const ProductPerformance = mongoose.models.ProductPerformance ||
  mongoose.model("ProductPerformance", ProductPerformanceSchema);

const PLATFORMS = ["Snoonu", "Talabat", "Rafeeq", "Keeta"] as const;

function cleanItem(item: any) {
  const sales: Record<string, string> = {};
  for (const platform of PLATFORMS) {
    const raw = item?.salesByPlatform?.[platform];
    sales[platform] = raw === undefined || raw === null ? "" : String(raw).slice(0, 30);
  }
  return {
    expiryDate: typeof item?.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate) ? item.expiryDate : "",
    salesByPlatform: sales,
    note: typeof item?.note === "string" ? item.note.slice(0, 2000) : "",
  };
}

export async function GET() {
  try {
    await connectDB();
    const records = await ProductPerformance.find({}).lean();
    const data: Record<string, any> = {};
    for (const record of records as any[]) {
      data[String(record.productId)] = {
        expiryDate: record.expiryDate || "",
        salesByPlatform: record.salesByPlatform || {},
        note: record.note || "",
      };
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Product performance GET error:", error);
    return NextResponse.json({ error: "Could not load product performance data." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.items) || body.items.length > 5000) {
      return NextResponse.json({ error: "Invalid product performance payload." }, { status: 400 });
    }
    await connectDB();
    const operations = [];
    for (const item of body.items) {
      if (!item || typeof item.productId !== "string" || !mongoose.isValidObjectId(item.productId)) continue;
      const clean = cleanItem(item);
      operations.push({
        updateOne: {
          filter: { productId: new mongoose.Types.ObjectId(item.productId) },
          update: { $set: clean, $setOnInsert: { productId: new mongoose.Types.ObjectId(item.productId) } },
          upsert: true,
        },
      });
    }
    if (operations.length) await ProductPerformance.bulkWrite(operations, { ordered: false });
    return NextResponse.json({ success: true, saved: operations.length });
  } catch (error) {
    console.error("Product performance PUT error:", error);
    return NextResponse.json({ error: "Could not save product performance data." }, { status: 500 });
  }
}
