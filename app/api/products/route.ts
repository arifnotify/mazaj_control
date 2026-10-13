import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

const UNITS = ["g", "kg", "pcs", "ml", "L"];
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const validNonnegative = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET products:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const sku = clean(input.sku);
    const nameEn = clean(input.nameEn);
    const nameAr = clean(input.nameAr);
    const productType = input.productType === "multiple" ? "multiple" : "single";
    if (!sku || !nameEn || !nameAr) {
      return NextResponse.json({ error: "SKU, English name and Arabic name are required" }, { status: 400 });
    }
    if (typeof input.active !== "undefined" && typeof input.active !== "boolean") {
      return NextResponse.json({ error: "Invalid active status" }, { status: 400 });
    }

    let price: number;
    let stock: number;
    let singleWeight: number | null = null;
    let singleUnit: string | null = null;
    let variants: Array<{ sku: string; weight: number; unit: string; price: number; stock: number }> = [];

    if (productType === "single") {
      price = input.price;
      stock = input.stock;
      if (!validNonnegative(price) || !validNonnegative(stock) || !Number.isInteger(stock)) {
        return NextResponse.json({ error: "Invalid price or stock" }, { status: 400 });
      }
      if (input.singleWeight !== null && input.singleWeight !== undefined && input.singleWeight !== "") {
        if (typeof input.singleWeight !== "number" || !Number.isFinite(input.singleWeight) || input.singleWeight <= 0 || !UNITS.includes(input.singleUnit)) {
          return NextResponse.json({ error: "Invalid single item weight or unit" }, { status: 400 });
        }
        singleWeight = input.singleWeight;
        singleUnit = input.singleUnit;
      }
    } else {
      if (!Array.isArray(input.variants) || input.variants.length === 0) {
        return NextResponse.json({ error: "Add at least one weight variant" }, { status: 400 });
      }
      variants = input.variants.map((v: Record<string, unknown>) => ({
        sku: clean(v.sku), weight: v.weight as number, unit: v.unit as string,
        price: v.price as number, stock: v.stock as number,
      }));
      if (variants.some((v) => !v.sku || typeof v.weight !== "number" || !Number.isFinite(v.weight) || v.weight <= 0 || !UNITS.includes(v.unit) || !validNonnegative(v.price) || !validNonnegative(v.stock) || !Number.isInteger(v.stock))) {
        return NextResponse.json({ error: "Every variant needs a valid SKU, weight, unit, price and whole-number stock" }, { status: 400 });
      }
      const skus = [sku.toLowerCase(), ...variants.map((v) => v.sku.toLowerCase())];
      if (new Set(skus).size !== skus.length) {
        return NextResponse.json({ error: "Main SKU and variant SKUs must be unique" }, { status: 400 });
      }
      const weightKeys = variants.map((v) => `${v.weight * (v.unit === "kg" || v.unit === "L" ? 1000 : 1)}-${v.unit === "kg" ? "g" : v.unit === "L" ? "ml" : v.unit}`);
      if (new Set(weightKeys).size !== weightKeys.length) {
        return NextResponse.json({ error: "Duplicate weight options are not allowed" }, { status: 400 });
      }
      price = Math.min(...variants.map((v) => v.price));
      stock = variants.reduce((sum, v) => sum + v.stock, 0);
    }

    await connectDB();
    const allSkus = [sku, ...variants.map((v) => v.sku)];
    const conflicts = await Product.findOne({ $or: [{ sku: { $in: allSkus } }, { "variants.sku": { $in: allSkus } }] }).lean();
    if (conflicts) return NextResponse.json({ error: "A product or variant already uses one of these SKUs" }, { status: 409 });

    const product = await Product.create({
      sku, nameEn, nameAr,
      descriptionEn: clean(input.descriptionEn), descriptionAr: clean(input.descriptionAr),
      image: clean(input.image), categoryEn: clean(input.categoryEn), categoryAr: clean(input.categoryAr),
      active: input.active !== false, productType, price, stock, singleWeight, singleUnit, variants,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("POST products:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
