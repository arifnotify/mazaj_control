import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
const PLATFORMS = ["Snoonu", "Talabat", "Rafeeq", "Keeta"] as const;

const ProductPerformanceSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
  expiryDate: { type: String, default: "" },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  note: { type: String, default: "" },
  promotions: { type: mongoose.Schema.Types.Mixed, default: {} },
  promotionDiscount: { type: mongoose.Schema.Types.Mixed, default: {} },
  promotionNote: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Legacy properties are retained so older records are not destructive during migration.
  salesEntries: { type: [mongoose.Schema.Types.Mixed], default: [] },
  salesByPlatform: { type: mongoose.Schema.Types.Mixed, default: {} },
  starred: { type: Boolean, default: false },
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
  const platformRecord = (value: any, kind: "boolean" | "discount" | "note") => {
    const result: Record<string, unknown> = {};
    for (const p of PLATFORMS) {
      const v = value?.[p];
      result[p] = kind === "boolean" ? v === true : kind === "discount" ? String(v ?? "").slice(0, 12) : String(v ?? "").slice(0, 1000);
    }
    return result;
  };
  return {
    expiryDate: typeof item?.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate) ? item.expiryDate : "",
    rating: Math.max(0, Math.min(5, Math.round(Number(item?.rating) || 0))),
    note: typeof item?.note === "string" ? item.note.slice(0, 2000) : "",
    promotions: platformRecord(item?.promotions, "boolean"),
    promotionDiscount: platformRecord(item?.promotionDiscount, "discount"),
    promotionNote: platformRecord(item?.promotionNote, "note"),
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
        rating: Math.max(0, Math.min(5, Number(record.rating ?? (record.starred ? 5 : 0)) || 0)),
        note: record.note || "",
        promotions: record.promotions || {},
        promotionDiscount: record.promotionDiscount || {},
        promotionNote: record.promotionNote || {},
        // Legacy fields returned only for backwards compatibility.
        salesEntries: Array.isArray(record.salesEntries) ? record.salesEntries : [],
        salesByPlatform: record.salesByPlatform || {},
        starred: record.starred === true,
      };
    }
    const analyses = (analysisRecords as any[]).map(a => ({
      _id: String(a._id), title: a.title, periodType: a.periodType,
      period: a.period, counts: a.counts || {}, createdAt: a.createdAt,
    }));
    return NextResponse.json({ success: true, data, analyses });
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
      const productId = new mongoose.Types.ObjectId(item.productId);
      operations.push({
        updateOne: {
          filter: { productId },
          update: { $set: cleanRecord(item), $setOnInsert: { productId } },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.action !== "save-analysis") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const periodType = body.periodType === "monthly" ? "monthly" : body.periodType === "daily" ? "daily" : null;
    const validPeriod = typeof body.period === "string" &&
      (periodType === "daily" ? /^\d{4}-\d{2}-\d{2}$/.test(body.period) : /^\d{4}-\d{2}$/.test(body.period));
    if (!periodType || !validPeriod) return NextResponse.json({ error: "Invalid analysis period." }, { status: 400 });
    await connectDB();
    const counts: Record<string, number> = {};
    for (const key of ["all", "starred", "slow", "steady", "best", "expiry", "promotion"]) {
      counts[key] = Math.max(0, Math.min(100000000, Number(body.counts?.[key]) || 0));
    }
    const record = await ProductPerformanceAnalysis.create({
      title: String(body.title || `${periodType} ${body.period}`).slice(0, 160),
      periodType, period: body.period, counts,
    });
    return NextResponse.json({
      success: true,
      analysis: { _id: String(record._id), title: record.title, periodType: record.periodType,
        period: record.period, counts: record.counts, createdAt: record.createdAt },
    }, { status: 201 });
  } catch (error) {
    console.error("Product performance analysis save error:", error);
    return NextResponse.json({ error: "Could not save analysis snapshot." }, { status: 500 });
  }
  
}
