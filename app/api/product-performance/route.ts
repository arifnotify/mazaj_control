import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const PLATFORMS = ["Snoonu", "Talabat", "Rafeeq", "Keeta"] as const;
const SalesEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  platform: { type: String, enum: PLATFORMS, required: true },
  units: { type: Number, min: 0, default: 0 },
}, { _id: false });
const ProductPerformanceSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  expiryDate: { type: String, default: "" },
  salesEntries: { type: [SalesEntrySchema], default: [] },
  note: { type: String, default: "" },
  starred: { type: Boolean, default: false },
  promotions: { type: mongoose.Schema.Types.Mixed, default: {} },
  promotionDiscount: { type: mongoose.Schema.Types.Mixed, default: {} },
  promotionNote: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Retain the legacy fields so existing data remains readable during migration.
  salesByPlatform: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: "product_performance" });
const AnalysisSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 160 },
  periodType: { type: String, enum: ["daily", "monthly"], required: true },
  period: { type: String, required: true, maxlength: 10 },
  counts: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, collection: "product_performance_analyses" });
const ProductPerformance = mongoose.models.ProductPerformance || mongoose.model("ProductPerformance", ProductPerformanceSchema);
const ProductPerformanceAnalysis = mongoose.models.ProductPerformanceAnalysis || mongoose.model("ProductPerformanceAnalysis", AnalysisSchema);

function cleanRecord(item: any) {
  const salesEntries = Array.isArray(item?.salesEntries) ? item.salesEntries.slice(0, 5000).flatMap((entry: any) => {
    if (!entry || typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return [];
    if (!PLATFORMS.includes(entry.platform)) return [];
    return [{ date: entry.date, platform: entry.platform, units: Math.min(100000000, Math.max(0, Number(entry.units) || 0)) }];
  }) : [];
  const cleanPlatformRecord = (value: any, kind: "boolean" | "discount" | "note") => {
    const result: Record<string, unknown> = {};
    for (const p of PLATFORMS) {
      const v = value?.[p];
      result[p] = kind === "boolean" ? v === true : kind === "discount" ? String(v ?? "").slice(0, 12) : String(v ?? "").slice(0, 1000);
    }
    return result;
  };
  return {
    expiryDate: typeof item?.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate) ? item.expiryDate : "",
    salesEntries,
    note: typeof item?.note === "string" ? item.note.slice(0, 2000) : "",
    starred: item?.starred === true,
    promotions: cleanPlatformRecord(item?.promotions, "boolean"),
    promotionDiscount: cleanPlatformRecord(item?.promotionDiscount, "discount"),
    promotionNote: cleanPlatformRecord(item?.promotionNote, "note"),
  };
}

export async function GET() {
  try {
    await connectDB();
    const [records, analysisRecords] = await Promise.all([
      ProductPerformance.find({}).lean(),
      ProductPerformanceAnalysis.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const data: Record<string, any> = {};
    for (const record of records as any[]) {
      data[String(record.productId)] = {
        expiryDate: record.expiryDate || "",
        salesEntries: Array.isArray(record.salesEntries) ? record.salesEntries : [],
        // Legacy fields are returned for one-time compatibility with the previous page.
        salesByPlatform: record.salesByPlatform || {},
        note: record.note || "", starred: record.starred === true,
        promotions: record.promotions || {}, promotionDiscount: record.promotionDiscount || {},
        promotionNote: record.promotionNote || {},
      };
    }
    const analyses = (analysisRecords as any[]).map(a => ({ _id: String(a._id), title: a.title, periodType: a.periodType, period: a.period, counts: a.counts || {}, createdAt: a.createdAt }));
    return NextResponse.json({ success: true, data, analyses });
  } catch (error) {
    console.error("Product performance GET error:", error);
    return NextResponse.json({ error: "Could not load product performance data." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.items) || body.items.length > 5000) return NextResponse.json({ error: "Invalid product performance payload." }, { status: 400 });
    await connectDB();
    const operations = [];
    for (const item of body.items) {
      if (!item || typeof item.productId !== "string" || !mongoose.isValidObjectId(item.productId)) continue;
      const productId = new mongoose.Types.ObjectId(item.productId);
      operations.push({ updateOne: { filter: { productId }, update: { $set: cleanRecord(item), $setOnInsert: { productId } }, upsert: true } });
    }
    if (operations.length) await ProductPerformance.bulkWrite(operations, { ordered: false });
    return NextResponse.json({ success: true, saved: operations.length });
  } catch (error) {
    console.error("Product performance PUT error:", error);
    return NextResponse.json({ error: "Could not save product performance data." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.action !== "save-analysis") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const periodType = body.periodType === "monthly" ? "monthly" : body.periodType === "daily" ? "daily" : null;
    const validPeriod = typeof body.period === "string" && (periodType === "daily" ? /^\d{4}-\d{2}-\d{2}$/.test(body.period) : /^\d{4}-\d{2}$/.test(body.period));
    if (!periodType || !validPeriod) return NextResponse.json({ error: "Invalid analysis period." }, { status: 400 });
    await connectDB();
    const counts: Record<string, number> = {};
    for (const key of ["all", "starred", "slow", "best", "expiry", "promotion"]) counts[key] = Math.max(0, Math.min(100000000, Number(body.counts?.[key]) || 0));
    const record = await ProductPerformanceAnalysis.create({ title: String(body.title || `${periodType} ${body.period}`).slice(0, 160), periodType, period: body.period, counts });
    return NextResponse.json({ success: true, analysis: { _id: String(record._id), title: record.title, periodType: record.periodType, period: record.period, counts: record.counts, createdAt: record.createdAt } }, { status: 201 });
  } catch (error) {
    console.error("Product performance analysis save error:", error);
    return NextResponse.json({ error: "Could not save analysis snapshot." }, { status: 500 });
  }
}
