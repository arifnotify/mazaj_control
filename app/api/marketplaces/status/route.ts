
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductMarketplace from "@/models/ProductMarketplace";

const MARKETPLACES = ["Talabat", "Snoonu", "Rafeeq", "Keeta"] as const;

export async function GET() {
  try {
    await connectDB();

    const [products, marketplaceRecords] = await Promise.all([
      Product.find()
        .select("_id sku name nameEn nameAr")
        .sort({ createdAt: -1 })
        .lean(),

      ProductMarketplace.find()
        .select("productId marketplace available syncStatus")
        .lean(),
    ]);

    const recordMap = new Map<
      string,
      {
        available: boolean;
        syncStatus: string;
      }
    >();

    for (const record of marketplaceRecords) {
      const key = `${String(record.productId)}:${record.marketplace}`;

      recordMap.set(key, {
        available: Boolean(record.available),
        syncStatus: record.syncStatus || "pending",
      });
    }

    const result = products.map((product) => {
      const marketplaces = MARKETPLACES.map((marketplace) => {
        const key = `${String(product._id)}:${marketplace}`;
        const record = recordMap.get(key);

        return {
          marketplace,
          connected: Boolean(record),
          available: record ? record.available : null,
          syncStatus: record?.syncStatus || "not_connected",
        };
      });

      return {
        _id: String(product._id),
        sku: product.sku || "",
        name:
          product.nameEn ||
          product.name ||
          product.nameAr ||
          "Unnamed product",
        nameEn: product.nameEn || "",
        nameAr: product.nameAr || "",
        marketplaces,
      };
    });

    return NextResponse.json(
      { products: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/marketplaces/status error:", error);

    return NextResponse.json(
      { message: "Failed to load marketplace statuses." },
      { status: 500 }
    );
  }
}