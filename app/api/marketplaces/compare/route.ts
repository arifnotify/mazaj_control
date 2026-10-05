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
  "availability",
] as const;

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    // Product ID check
    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // ObjectId check
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          error: "Invalid product ID",
        },
        {
          status: 400,
        }
      );
    }

    // Get master product
    const product = await Product.findById(
      productId
    ).lean();

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    // Get marketplace data
    const marketplaceData =
      await ProductMarketplace.find({
        productId,
      }).lean();

    // Compare every marketplace
    const results = await Promise.all(
      marketplaceNames.map(
        async (marketplace) => {
          const marketplaceProduct =
            marketplaceData.find(
              (item) =>
                item.marketplace ===
                marketplace
            );

          // Marketplace not connected
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

          // -------------------------
          // PRICE
          // -------------------------
          if (
            Number(
              marketplaceProduct.price
            ) !== Number(product.price)
          ) {
            issues.push("price");
          }

          // -------------------------
          // NAME
          // -------------------------
          if (
            marketplaceProduct.name !==
            product.name
          ) {
            issues.push("name");
          }

          // -------------------------
          // DESCRIPTION
          // -------------------------
          if (
            marketplaceProduct.description !==
            product.description
          ) {
            issues.push("description");
          }

          // -------------------------
          // IMAGE
          // -------------------------
          if (
            marketplaceProduct.image !==
            product.image
          ) {
            issues.push("image");
          }

          // -------------------------
          // AVAILABILITY
          // -------------------------
          if (
            marketplaceProduct.available !==
            product.active
          ) {
            issues.push("availability");
          }

          // -------------------------
          // AUTOMATIC ISSUE CREATION
          // -------------------------
          for (const issueType of issues) {
            if (
              issueTypes.includes(
                issueType as (typeof issueTypes)[number]
              )
            ) {
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

              // Only create if no active issue exists
              if (!existingIssue) {
                await Issue.create({
                  productId:
                    product._id,
                  marketplace,
                  type: issueType,
                  note:
                    `Automatically detected ${issueType} mismatch.`,
                  status: "open",
                });
              }
            }
          }

          return {
            marketplace,
            connected: true,
            healthy:
              issues.length === 0,
            issues,
            available:
              marketplaceProduct.available,
            syncStatus:
              marketplaceProduct.syncStatus,
          };
        }
      )
    );

    return NextResponse.json({
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        description:
          product.description,
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
      {
        status: 500,
      }
    );
  }
}