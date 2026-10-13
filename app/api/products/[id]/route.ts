import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

const units = ["g", "kg", "pcs", "ml", "L"];
const nonnegative = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const validStock = (v: unknown) => nonnegative(v) && Number.isInteger(v);
const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return error("Invalid product ID");
    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) return error("Product not found", 404);
    return NextResponse.json(product);
  } catch (e) {
    console.error("Product GET error", e);
    return error("Failed to load product", 500);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return error("Invalid product ID");
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return error("Invalid request body");

    const update: Record<string, unknown> = {};
    const strings = ["sku", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "image", "categoryEn", "categoryAr"];
    for (const key of strings) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "string") return error(`Invalid ${key}`);
        update[key] = body[key].trim();
      }
    }
    for (const key of ["sku", "nameEn", "nameAr"]) {
      if (update[key] === "") return error(`${key} cannot be empty`);
    }
    if (body.stock !== undefined) {
      if (!validStock(body.stock)) return error("Stock must be a nonnegative whole number");
      update.stock = body.stock;
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") return error("Invalid product status");
      update.active = body.active;
    }
    if (body.price !== undefined) {
      if (!nonnegative(body.price)) return error("Invalid price");
      update.price = body.price;
    }

    if (body.productType !== undefined) {
      if (body.productType !== "single" && body.productType !== "multiple") return error("Invalid product type");
      update.productType = body.productType;
      if (body.productType === "single") {
        if (body.singleWeight !== null && body.singleWeight !== undefined && (typeof body.singleWeight !== "number" || !Number.isFinite(body.singleWeight) || body.singleWeight <= 0)) return error("Invalid single weight");
        if (body.singleWeight != null && !units.includes(body.singleUnit)) return error("Invalid single weight unit");
        update.singleWeight = body.singleWeight ?? null;
        update.singleUnit = body.singleWeight == null ? null : body.singleUnit;
        update.variants = [];
      } else {
        if (!Array.isArray(body.variants) || !body.variants.length) return error("Add at least one weight option");
        const variants = body.variants.map((v: { weight: number; unit: string; price: number }) => ({ weight: v?.weight, unit: v?.unit, price: v?.price }));
        if (variants.some((v: { weight: number; unit: string; price: number }) => typeof v.weight !== "number" || !Number.isFinite(v.weight) || v.weight <= 0 || !units.includes(v.unit) || !nonnegative(v.price))) return error("Invalid weight options");
        const keys = variants.map((v: { weight: number; unit: string }) => `${v.unit === "kg" ? "g" : v.unit === "L" ? "ml" : v.unit}:${Math.round(v.weight * (v.unit === "kg" || v.unit === "L" ? 1000 : 1) * 1e6)}`);
        if (new Set(keys).size !== keys.length) return error("Duplicate weight options");
        update.variants = variants;
        update.singleWeight = null;
        update.singleUnit = null;
        update.price = Math.min(...variants.map((v: { price: number }) => v.price));
      }
    }

    await connectDB();
    const product = await Product.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!product) return error("Product not found", 404);
    return NextResponse.json(product);
  } catch (e: unknown) {
    console.error("Product PUT error", e);
    if (typeof e === "object" && e !== null && "code" in e && e.code === 11000) return error("SKU already exists", 409);
    return error("Failed to update product", 500);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isValidObjectId(id)) return error("Invalid product ID");
    await connectDB();
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return error("Product not found", 404);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Product DELETE error", e);
    return error("Failed to delete product", 500);
  }
}
