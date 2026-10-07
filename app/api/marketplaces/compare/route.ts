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

    const { searchParams } =
      new URL(request.url);

    const productId =
      searchParams.get("productId");

    // ==========================================
    // VALIDATE PRODUCT ID
    // ==========================================

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

    // ==========================================
    // GET MASTER PRODUCT
    // ==========================================

    const product =
      await Product.findById(
        productId
      ).lean();

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    // ==========================================
    // GET MARKETPLACE DATA
    // ==========================================

    const marketplaceData =
      await ProductMarketplace.find({
        productId,
      }).lean();

    // ==========================================
    // COMPARE ALL MARKETPLACES
    // ==========================================

    const results =
      await Promise.all(
        marketplaceNames.map(
          async (marketplace) => {

            const marketplaceProduct =
              marketplaceData.find(
                (item) =>
                  item.marketplace ===
                  marketplace
              );

            // ==================================
            // NOT CONNECTED
            // ==================================

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

            // ==================================
            // PRICE
            // ==================================

            if (
              Number(
                marketplaceProduct.price
              ) !==
              Number(product.price)
            ) {
              issues.push("price");
            }

            // ==================================
            // NAME
            // English + Arabic
            // ==================================

            const marketplaceNameEn =
              String(
                marketplaceProduct.nameEn ||
                  ""
              ).trim();

            const marketplaceNameAr =
              String(
                marketplaceProduct.nameAr ||
                  ""
              ).trim();

            const productNameEn =
              String(
                product.nameEn || ""
              ).trim();

            const productNameAr =
              String(
                product.nameAr || ""
              ).trim();

            if (
              marketplaceNameEn !==
                productNameEn ||
              marketplaceNameAr !==
                productNameAr
            ) {
              issues.push("name");
            }

            // ==================================
            // DESCRIPTION
            // English + Arabic
            // ==================================

            const marketplaceDescriptionEn =
              String(
                marketplaceProduct.descriptionEn ||
                  ""
              ).trim();

            const marketplaceDescriptionAr =
              String(
                marketplaceProduct.descriptionAr ||
                  ""
              ).trim();

            const productDescriptionEn =
              String(
                product.descriptionEn ||
                  ""
              ).trim();

            const productDescriptionAr =
              String(
                product.descriptionAr ||
                  ""
              ).trim();

            if (
              marketplaceDescriptionEn !==
                productDescriptionEn ||
              marketplaceDescriptionAr !==
                productDescriptionAr
            ) {
              issues.push("description");
            }

            // ==================================
            // IMAGE
            // ==================================

            const marketplaceImage =
              String(
                marketplaceProduct.image ||
                  ""
              ).trim();

            const productImage =
              String(
                product.image || ""
              ).trim();

            if (
              marketplaceImage !==
              productImage
            ) {
              issues.push("image");
            }

            // ==================================
            // CATEGORY
            // English + Arabic
            // ==================================

            const marketplaceCategoryEn =
              String(
                marketplaceProduct.categoryEn ||
                  ""
              ).trim();

            const marketplaceCategoryAr =
              String(
                marketplaceProduct.categoryAr ||
                  ""
              ).trim();

            const productCategoryEn =
              String(
                product.categoryEn || ""
              ).trim();

            const productCategoryAr =
              String(
                product.categoryAr || ""
              ).trim();

            if (
              marketplaceCategoryEn !==
                productCategoryEn ||
              marketplaceCategoryAr !==
                productCategoryAr
            ) {
              issues.push("category");
            }

            // ==================================
            // AVAILABILITY
            // ==================================

            if (
              Boolean(
                marketplaceProduct.available
              ) !==
              Boolean(product.active)
            ) {
              issues.push(
                "availability"
              );
            }

            // ==================================
            // AUTOMATIC ISSUE CREATION
            // ==================================

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
                  productId:
                    product._id,

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

            // ==================================
            // RESULT
            // ==================================

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

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      product: {
        id: product._id,

        sku: product.sku,

        nameEn: product.nameEn,
        nameAr: product.nameAr,

        descriptionEn:
          product.descriptionEn,

        descriptionAr:
          product.descriptionAr,

        price: product.price,

        image: product.image,

        categoryEn:
          product.categoryEn,

        categoryAr:
          product.categoryAr,

        stock: product.stock,

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