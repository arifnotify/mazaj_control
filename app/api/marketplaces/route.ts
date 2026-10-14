
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
type SyncStatus = (typeof SYNC_STATUSES)[number];

function isValidMarketplace(
  value: unknown
): value is MarketplaceName {
  return (
    typeof value === "string" &&
    MARKETPLACES.includes(value as MarketplaceName)
  );
}

function isValidSyncStatus(
  value: unknown
): value is SyncStatus {
  return (
    typeof value === "string" &&
    SYNC_STATUSES.includes(value as SyncStatus)
  );
}

function parseNonNegativePrice(
  value: unknown
): number | undefined | null {
  if (value === undefined) {
    return undefined;
  }

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

    const marketplaces = await ProductMarketplace.find({
      productId,
    })
      .sort({ marketplace: 1 })
      .lean();

    return NextResponse.json(marketplaces, {
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

// POST /api/marketplaces
// Create or update marketplace data
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

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

    // Validate product ID
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

    // Validate marketplace
    if (!isValidMarketplace(marketplace)) {
      return NextResponse.json(
        { error: "Invalid marketplace." },
        { status: 400 }
      );
    }

    // Verify that the product exists
    const productExists = await Product.exists({
      _id: productId,
    });

    if (!productExists) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    // Validate availability
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

    // Validate price
    const parsedPrice = parseNonNegativePrice(price);

    if (parsedPrice === null) {
      return NextResponse.json(
        {
          error: "Invalid price. Price must be zero or greater.",
        },
        { status: 400 }
      );
    }

    // Validate sync status
    if (
      syncStatus !== undefined &&
      !isValidSyncStatus(syncStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid sync status." },
        { status: 400 }
      );
    }

    // Only update fields supplied by the frontend.
    // This prevents a price update from unintentionally
    // changing marketplace availability.
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

    // Create or update marketplace record
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

    if (!marketplaceData) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create or update marketplace record.",
        },
        { status: 500 }
      );
    }

    // Return a consistent response for the frontend
    return NextResponse.json(
      {
        success: true,
        marketplace: marketplaceData,
      },
      { status: 200 }
    );
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
          success: false,
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
          success: false,
          error: "Invalid marketplace data.",
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save marketplace data.",
      },
      { status: 500 }
    );
  }
}
