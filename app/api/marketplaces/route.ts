import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProductMarketplace from "@/models/ProductMarketplace";

const marketplaces = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
] as const;

const isValidMarketplace = (
  value: string
) => {
  return marketplaces.includes(
    value as (typeof marketplaces)[number]
  );
};

// =====================================================
// GET
// /api/marketplaces?productId=PRODUCT_ID
// =====================================================

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } =
      new URL(request.url);

    const productId =
      searchParams.get("productId");

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

// =====================================================
// POST
// Create or update marketplace data
// =====================================================

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

      nameEn,
      nameAr,

      descriptionEn,
      descriptionAr,

      image,

      categoryEn,
      categoryAr,

      syncStatus,
    } = body;

    // =================================================
    // PRODUCT ID
    // =================================================

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

    // =================================================
    // MARKETPLACE
    // =================================================

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

    if (
      !isValidMarketplace(
        String(marketplace)
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

    // =================================================
    // PRICE VALIDATION
    // =================================================

    let parsedPrice:
      | number
      | undefined;

    if (price !== undefined) {
      parsedPrice = Number(price);

      if (
        Number.isNaN(parsedPrice) ||
        parsedPrice < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid price",
          },
          {
            status: 400,
          }
        );
      }
    }

    // =================================================
    // UPDATE DATA
    // =================================================

    const updateData: Record<
      string,
      unknown
    > = {
      productId,
      marketplace,

      available:
        available !== undefined
          ? Boolean(available)
          : false,
    };

    if (parsedPrice !== undefined) {
      updateData.price =
        parsedPrice;
    }

    // English name
    if (nameEn !== undefined) {
      updateData.nameEn =
        String(nameEn).trim();
    }

    // Arabic name
    if (nameAr !== undefined) {
      updateData.nameAr =
        String(nameAr).trim();
    }

    // English description
    if (
      descriptionEn !== undefined
    ) {
      updateData.descriptionEn =
        String(descriptionEn).trim();
    }

    // Arabic description
    if (
      descriptionAr !== undefined
    ) {
      updateData.descriptionAr =
        String(descriptionAr).trim();
    }

    // Image
    if (image !== undefined) {
      updateData.image =
        String(image).trim();
    }

    // English category
    if (categoryEn !== undefined) {
      updateData.categoryEn =
        String(categoryEn).trim();
    }

    // Arabic category
    if (categoryAr !== undefined) {
      updateData.categoryAr =
        String(categoryAr).trim();
    }

    // Sync status
    if (syncStatus !== undefined) {
      updateData.syncStatus =
        String(syncStatus);
    }

    // =================================================
    // CREATE / UPDATE
    // =================================================

    const marketplaceData =
      await ProductMarketplace.findOneAndUpdate(
        {
          productId,
          marketplace,
        },
        updateData,
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
  } catch (error: any) {
    console.error(
      "SAVE MARKETPLACE ERROR:",
      error
    );

    // Duplicate key
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error:
            "Marketplace data already exists for this product",
        },
        {
          status: 409,
        }
      );
    }

    // Validation error
    if (
      error?.name ===
      "ValidationError"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid marketplace data",
          details: error.message,
        },
        {
          status: 400,
        }
      );
    }

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