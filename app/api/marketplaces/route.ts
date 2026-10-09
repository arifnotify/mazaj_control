
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import ProductMarketplace from "@/models/ProductMarketplace";
import Product from "@/models/Product";

const MARKETPLACES = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
] as const;

const SYNC_STATUSES = [
  "synced",
  "pending",
  "failed",
  "not_connected",
] as const;

type MarketplaceName = (typeof MARKETPLACES)[number];

function isValidMarketplace(
  value: unknown
): value is MarketplaceName {
  return (
    typeof value === "string" &&
    MARKETPLACES.includes(value as MarketplaceName)
  );
}

function isValidSyncStatus(value: unknown): boolean {
  return (
    typeof value === "string" &&
    SYNC_STATUSES.includes(
      value as (typeof SYNC_STATUSES)[number]
    )
  );
}

function parseNonNegativePrice(
  value: unknown
): number | undefined | null {
  if (value === undefined) return undefined;

  if (
    value === null ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

// GET /api/marketplaces?productId=PRODUCT_ID
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID." },
        { status: 400 }
      );
    }

    const marketplaceData = await ProductMarketplace.find({
      productId,
    })
      .sort({ marketplace: 1 })
      .lean();

    return NextResponse.json(marketplaceData, {
      status: 200,
    });
  } catch (error) {
    console.error("GET MARKETPLACE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch marketplace data." },
      { status: 500 }
    );
  }
}

// POST: Create or update marketplace data
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      productId,
      marketplace,
      available,
      price,
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      image,
      categoryEn,
      categoryAr,
      syncStatus,
    } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID." },
        { status: 400 }
      );
    }

    if (!isValidMarketplace(marketplace)) {
      return NextResponse.json(
        { error: "Invalid marketplace." },
        { status: 400 }
      );
    }

    // Verify the product exists.
    const productExists = await Product.exists({
      _id: productId,
    });

    if (!productExists) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    // Only accept actual boolean values for availability.
    if (
      available !== undefined &&
      typeof available !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Availability must be true or false (a JSON boolean).",
        },
        { status: 400 }
      );
    }

    const parsedPrice = parseNonNegativePrice(price);

    if (parsedPrice === null) {
      return NextResponse.json(
        { error: "Invalid price. Price must be zero or greater." },
        { status: 400 }
      );
    }

    if (
      syncStatus !== undefined &&
      !isValidSyncStatus(syncStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid sync status." },
        { status: 400 }
      );
    }

    // Update only the fields actually provided.
    // This prevents price-only updates from accidentally setting OFF.
    const updateData: Record<string, unknown> = {};

    if (available !== undefined) {
      updateData.available = available;
    }

    if (parsedPrice !== undefined) {
      updateData.price = parsedPrice;
    }

    if (nameEn !== undefined) {
      updateData.nameEn = String(nameEn).trim();
    }

    if (nameAr !== undefined) {
      updateData.nameAr = String(nameAr).trim();
    }

    if (descriptionEn !== undefined) {
      updateData.descriptionEn = String(descriptionEn).trim();
    }

    if (descriptionAr !== undefined) {
      updateData.descriptionAr = String(descriptionAr).trim();
    }

    if (image !== undefined) {
      updateData.image = String(image).trim();
    }

    if (categoryEn !== undefined) {
      updateData.categoryEn = String(categoryEn).trim();
    }

    if (categoryAr !== undefined) {
      updateData.categoryAr = String(categoryAr).trim();
    }

    if (syncStatus !== undefined) {
      updateData.syncStatus = syncStatus;
    }

    const marketplaceData =
      await ProductMarketplace.findOneAndUpdate(
        {
          productId,
          marketplace,
        },
        {
          $set: updateData,
          $setOnInsert: {
            productId,
            marketplace,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return NextResponse.json(marketplaceData, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("SAVE MARKETPLACE ERROR:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          error:
            "Duplicate marketplace record exists for this product.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        {
          error: "Invalid marketplace data.",
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save marketplace data." },
      { status: 500 }
    );
  }
}