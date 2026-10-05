import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Issue from "@/models/Issue";

export async function GET() {
  try {
    await connectDB();

    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalCategories,
      openIssues,
      inProgressIssues,
      fixedIssues,
      verifiedIssues,
      closedIssues,
      marketplaceIssues,
    ] = await Promise.all([
      Product.countDocuments(),

      Product.countDocuments({
        active: true,
      }),

      Product.countDocuments({
        active: false,
      }),

      Category.countDocuments(),

      Issue.countDocuments({
        status: "open",
      }),

      Issue.countDocuments({
        status: "in_progress",
      }),

      Issue.countDocuments({
        status: "fixed",
      }),

      Issue.countDocuments({
        status: "verified",
      }),

      Issue.countDocuments({
        status: "closed",
      }),

      Issue.aggregate([
        {
          $group: {
            _id: "$marketplace",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    const totalIssues =
      openIssues +
      inProgressIssues +
      fixedIssues +
      verifiedIssues +
      closedIssues;

    return NextResponse.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
      },

      categories: {
        total: totalCategories,
      },

      issues: {
        total: totalIssues,
        open: openIssues,
        in_progress: inProgressIssues,
        fixed: fixedIssues,
        verified: verifiedIssues,
        closed: closedIssues,
      },

      marketplaceIssues,
    });
  } catch (error) {
    console.error("DASHBOARD API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load dashboard statistics",
      },
      {
        status: 500,
      }
    );
  }
}