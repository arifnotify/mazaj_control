import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProductMarketplace from "@/models/ProductMarketplace";

const marketplaces = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
];

const isValidMarketplace = (value: string) => {
  return marketplaces.includes(value);
};

// GET
// /api/marketplaces?productId=PRODUCT_ID
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const marketplaceData =
      await ProductMarketplace.find({
        productId,
      }).sort({
        marketplace: 1,
      });

    return NextResponse.json(
      marketplaceData
    );
  } catch (error) {
    console.error(
      "GET MARKETPLACE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch marketplace data",
      },
      {
        status: 500,
      }
    );
  }
}

// POST
// Create or update marketplace data
export async function POST(
  request: Request
) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      productId,
      marketplace,
      available,
      price,
      name,
      description,
      image,
      category,
      syncStatus,
    } = body;

    // Product ID
    if (!productId) {
      return NextResponse.json(
        {
          error:
            "Product ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // Validate Product ID
    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product ID",
        },
        {
          status: 400,
        }
      );
    }

    // Marketplace
    if (!marketplace) {
      return NextResponse.json(
        {
          error:
            "Marketplace is required",
        },
        {
          status: 400,
        }
      );
    }

    // Validate marketplace
    if (
      !isValidMarketplace(
        marketplace
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid marketplace",
        },
        {
          status: 400,
        }
      );
    }

    // Create or update
    const marketplaceData =
      await ProductMarketplace.findOneAndUpdate(
        {
          productId,
          marketplace,
        },
        {
          productId,
          marketplace,

          available:
            available !== undefined
              ? Boolean(available)
              : false,

          ...(price !== undefined && {
            price: Number(price),
          }),

          ...(name !== undefined && {
            name: String(name),
          }),

          ...(description !== undefined && {
            description:
              String(description),
          }),

          ...(image !== undefined && {
            image: String(image),
          }),

          // Category
          ...(category !== undefined && {
            category:
              String(category),
          }),

          ...(syncStatus !== undefined && {
            syncStatus,
          }),
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return NextResponse.json(
      marketplaceData
    );
  } catch (error) {
    console.error(
      "SAVE MARKETPLACE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save marketplace data",
      },
      {
        status: 500,
      }
    );
  }
}