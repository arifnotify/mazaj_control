import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

const UNITS = ["g", "kg", "pcs", "ml", "L"];
const clean = (v: unknown) => typeof v === "string" ? v.trim() : "";
const validMoney = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const validStock = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json(await Product.find().sort({ createdAt: -1 }).lean());
  } catch (error) {
    console.error("GET /api/products", error);
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
      return NextResponse.json({ error: "SKU and both product names are required" }, { status: 400 });
    }
    if (!validStock(input.stock)) {
      return NextResponse.json({ error: "Product stock must be a nonnegative whole number" }, { status: 400 });
    }
    if (input.active !== undefined && typeof input.active !== "boolean") {
      return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
    }

    let price = input.price;
    let singleWeight: number | null = null;
    let singleUnit: string | null = null;
    let variants: { weight: number; unit: string; price: number }[] = [];

    if (productType === "single") {
      if (!validMoney(price)) {
        return NextResponse.json({ error: "Invalid single item price" }, { status: 400 });
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
        return NextResponse.json({ error: "Add at least one weight option" }, { status: 400 });
      }
      variants = input.variants.map((v: { weight?: unknown; unit?: unknown; price?: unknown }) => ({
        weight: v?.weight as number,
        unit: v?.unit as string,
        price: v?.price as number,
      }));
      if (variants.some(v => typeof v.weight !== "number" || !Number.isFinite(v.weight) || v.weight <= 0 || !UNITS.includes(v.unit) || !validMoney(v.price))) {
        return NextResponse.json({ error: "Every weight option needs a valid weight, unit and price" }, { status: 400 });
      }
      const keys = variants.map(v => `${v.unit === "kg" ? "g" : v.unit === "L" ? "ml" : v.unit}:${v.weight * (v.unit === "kg" || v.unit === "L" ? 1000 : 1)}`);
      if (new Set(keys).size !== keys.length) {
        return NextResponse.json({ error: "Duplicate weight options are not allowed" }, { status: 400 });
      }
      price = Math.min(...variants.map(v => v.price)); // compatibility with existing product list
    }

    await connectDB();
    if (await Product.exists({ sku })) {
      return NextResponse.json({ error: "Product SKU already exists" }, { status: 409 });
    }
    const product = await Product.create({
      sku, nameEn, nameAr,
      descriptionEn: clean(input.descriptionEn),
      descriptionAr: clean(input.descriptionAr),
      image: clean(input.image),
      categoryEn: clean(input.categoryEn),
      categoryAr: clean(input.categoryAr),
      price, stock: input.stock,
      active: input.active !== false,
      productType, singleWeight, singleUnit, variants,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/products", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Product SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
