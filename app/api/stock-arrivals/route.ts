
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import StockArrival from "@/models/StockArrival";

export const dynamic = "force-dynamic";

type ProductDocument = {
  _id: mongoose.Types.ObjectId;
  sku?: string | number;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  image?: string;
};

// GET: Load products and stock arrival history
export async function GET() {
  try {
    await connectDB();

    const [products, arrivals] = await Promise.all([
      Product.find({})
        .select("_id sku name nameEn nameAr image")
        .sort({ sku: 1 })
        .lean(),

      StockArrival.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const formattedProducts = (products as unknown as ProductDocument[]).map(
      (product) => ({
        _id: String(product._id),
        sku: String(product.sku ?? ""),
        name:
          product.nameEn ||
          product.name ||
          product.nameAr ||
          "",
        image: product.image || "",
      })
    );

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      arrivals,
    });
  } catch (error) {
    console.error("Stock arrival GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load stock arrivals",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new stock arrival
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("productIds" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Product IDs are required",
        },
        { status: 400 }
      );
    }

    const rawProductIds: unknown = body.productIds;

    if (!Array.isArray(rawProductIds)) {
      return NextResponse.json(
        {
          success: false,
          message: "Product IDs must be an array",
        },
        { status: 400 }
      );
    }

    // Keep only non-empty string IDs and remove duplicates.
    const productIds: string[] = [
      ...new Set(
        rawProductIds
          .filter(
            (id: unknown): id is string =>
              typeof id === "string"
          )
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      ),
    ];

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Select at least one product",
        },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectIds.
    if (
      productIds.some(
        (id: string) => !mongoose.isValidObjectId(id)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more product IDs are invalid",
        },
        { status: 400 }
      );
    }

    const products = await Product.find({
      _id: { $in: productIds },
    })
      .select("_id sku name nameEn nameAr image")
      .lean();

    if (products.length !== productIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Some selected products were not found",
        },
        { status: 404 }
      );
    }

    const productDocuments =
      products as unknown as ProductDocument[];

    const arrivalProducts = productDocuments.map((product) => ({
      productId: product._id,
      sku: String(product.sku ?? ""),
      name:
        product.nameEn ||
        product.name ||
        product.nameAr ||
        "",
      image: product.image || "",
    }));

    const arrival = await StockArrival.create({
      products: arrivalProducts,
      status: "pending",
      marketplaceConfirmation: {
        talabat: false,
        snoonu: false,
        rafeeq: false,
        keeta: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock arrival created successfully",
        arrival,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Stock arrival POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create stock arrival",
      },
      { status: 500 }
    );
  }
}