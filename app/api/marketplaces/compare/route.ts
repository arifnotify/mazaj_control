import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductMarketplace from "@/models/ProductMarketplace";
import Issue from "@/models/Issue";

const marketplaceNames = [
  "Talabat",
  "Snoonu",
  "Rafeeq",
  "Keeta",
] as const;

const issueTypes = [
  "price",
  "name",
  "description",
  "image",
  "category",
  "availability",
] as const;

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    // --------------------------------
    // Validate Product ID
    // --------------------------------

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          error: "Invalid product ID",
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // Get Master Product
    // --------------------------------

    const product = await Product.findById(productId).lean();

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------
    // Get Marketplace Data
    // --------------------------------

    const marketplaceData =
      await ProductMarketplace.find({
        productId,
      }).lean();

    // --------------------------------
    // Compare Marketplaces
    // --------------------------------

    const results = await Promise.all(
      marketplaceNames.map(async (marketplace) => {
        const marketplaceProduct =
          marketplaceData.find(
            (item) =>
              item.marketplace === marketplace
          );

        // --------------------------------
        // Marketplace Not Connected
        // --------------------------------

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

        // --------------------------------
        // PRICE
        // --------------------------------

        if (
          Number(marketplaceProduct.price) !==
          Number(product.price)
        ) {
          issues.push("price");
        }

        // --------------------------------
        // NAME
        // --------------------------------

        if (
          String(marketplaceProduct.name || "").trim() !==
          String(product.name || "").trim()
        ) {
          issues.push("name");
        }

        // --------------------------------
        // DESCRIPTION
        // --------------------------------

        if (
          String(
            marketplaceProduct.description || ""
          ).trim() !==
          String(product.description || "").trim()
        ) {
          issues.push("description");
        }

        // --------------------------------
        // IMAGE
        // --------------------------------

        if (
          String(marketplaceProduct.image || "").trim() !==
          String(product.image || "").trim()
        ) {
          issues.push("image");
        }

        // --------------------------------
        // CATEGORY
        // --------------------------------

        if (
          String(marketplaceProduct.category || "").trim() !==
          String(product.category || "").trim()
        ) {
          issues.push("category");
        }

        // --------------------------------
        // AVAILABILITY
        // --------------------------------

        if (
          Boolean(marketplaceProduct.available) !==
          Boolean(product.active)
        ) {
          issues.push("availability");
        }

        // --------------------------------
        // AUTOMATIC ISSUE CREATION
        // --------------------------------

        for (const issueType of issues) {
          if (
            !issueTypes.includes(
              issueType as (typeof issueTypes)[number]
            )
          ) {
            continue;
          }

          const existingIssue =
            await Issue.findOne({
              productId: product._id,
              marketplace,
              type: issueType,
              status: {
                $in: [
                  "open",
                  "in_progress",
                ],
              },
            });

          if (!existingIssue) {
            await Issue.create({
              productId: product._id,
              marketplace,
              type: issueType,
              note: `Automatically detected ${issueType} mismatch.`,
              status: "open",
            });
          }
        }

        // --------------------------------
        // Result
        // --------------------------------

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
      })
    );

    // --------------------------------
    // Response
    // --------------------------------

    return NextResponse.json({
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image,
        category: product.category,
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