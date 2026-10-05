import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductMarketplace from "@/models/ProductMarketplace";

const marketplaceNames = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
] as const;

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

    const product = await Product.findById(productId).lean();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const marketplaceData =
      await ProductMarketplace.find({
        productId,
      }).lean();

    const results = marketplaceNames.map(
      (marketplace) => {
        const marketplaceProduct =
          marketplaceData.find(
            (item) =>
              item.marketplace === marketplace
          );

        if (!marketplaceProduct) {
          return {
            marketplace,
            connected: false,
            healthy: false,
            issues: [
              "Marketplace is not connected",
            ],
          };
        }

        const issues: string[] = [];

        // Price
        if (
          Number(marketplaceProduct.price) !==
          Number(product.price)
        ) {
          issues.push("price");
        }

        // Name
        if (
          marketplaceProduct.name !==
          product.name
        ) {
          issues.push("name");
        }

        // Description
        if (
          marketplaceProduct.description !==
          product.description
        ) {
          issues.push("description");
        }

        // Image
        if (
          marketplaceProduct.image !==
          product.image
        ) {
          issues.push("image");
        }

        // Availability
        if (
          marketplaceProduct.available !==
          product.active
        ) {
          issues.push("availability");
        }

        return {
          marketplace,
          connected: true,
          healthy: issues.length === 0,
          issues,
          available:
            marketplaceProduct.available,
          syncStatus:
            marketplaceProduct.syncStatus,
        };
      }
    );

    return NextResponse.json({
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image,
        active: product.active,
      },
      marketplaces: results,
    });
  } catch (error) {
    console.error(
      "COMPARE MARKETPLACES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to compare marketplaces",
      },
      { status: 500 }
    );
  }
}