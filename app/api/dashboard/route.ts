import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductMarketplace from "@/models/ProductMarketplace";
import Issue from "@/models/Issue";

export async function GET() {
  try {
    await connectDB();

    const [
      totalProducts,
      openIssues,
      marketplaceData,
    ] = await Promise.all([
      Product.countDocuments(),

      Issue.countDocuments({
        status: {
          $in: ["open", "in_progress"],
        },
      }),

      ProductMarketplace.find({
        marketplace: {
          $in: [
            "Talabat",
            "Snoonu",
            "Rafeeq",
            "Keeta",
          ],
        },
      }),
    ]);

    const problemProductIds =
      await Issue.distinct("productId", {
        status: {
          $in: ["open", "in_progress"],
        },
      });

    const problemProducts =
      problemProductIds.length;

    const healthyProducts = Math.max(
      totalProducts - problemProducts,
      0
    );

    const marketplaceStatus = {
      Talabat: {
        total: 0,
        available: 0,
      },

      Snoonu: {
        total: 0,
        available: 0,
      },

      Rafeeq: {
        total: 0,
        available: 0,
      },

      Keeta: {
        total: 0,
        available: 0,
      },
    };

    marketplaceData.forEach((item) => {
      const marketplace =
        item.marketplace as keyof typeof marketplaceStatus;

      if (
        marketplaceStatus[marketplace]
      ) {
        marketplaceStatus[marketplace].total += 1;

        if (item.available) {
          marketplaceStatus[
            marketplace
          ].available += 1;
        }
      }
    });

    return NextResponse.json({
      totalProducts,
      healthyProducts,
      problemProducts,
      openIssues,
      marketplaceStatus,
    });
  } catch (error) {
    console.error(
      "DASHBOARD API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load dashboard data",
      },
      {
        status: 500,
      }
    );
  }
}