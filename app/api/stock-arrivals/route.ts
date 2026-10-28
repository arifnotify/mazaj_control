import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import StockArrival from "@/models/StockArrival";

export const dynamic = "force-dynamic";

type ProductDocument = {
  _id: mongoose.Types.ObjectId;
  sku?: string | number;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  image?: string;
  category?: unknown;
  categoryName?: string;
  categoryEn?: string;
  categoryAr?: string;
  categoryNameEn?: string;
  categoryNameAr?: string;
};

type ArrivalProductDocument = {
  productId: mongoose.Types.ObjectId | string;
  sku?: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  image?: string;
  category?: unknown;
  categoryName?: string;
  categoryEn?: string;
  categoryAr?: string;
  categoryNameEn?: string;
  categoryNameAr?: string;
};

type ArrivalDocument = {
  _id: mongoose.Types.ObjectId;
  products?: ArrivalProductDocument[];
  [key: string]: unknown;
};

function getCategoryNames(product: ProductDocument) {
  const category =
    product.category && typeof product.category === "object"
      ? (product.category as {
          name?: string;
          nameEn?: string;
          nameAr?: string;
        })
      : null;

  const categoryString =
    typeof product.category === "string" ? product.category.trim() : "";

  const categoryEn =
    product.categoryEn?.trim() ||
    product.categoryNameEn?.trim() ||
    category?.nameEn?.trim() ||
    category?.name?.trim() ||
    categoryString ||
    product.categoryName?.trim() ||
    "";

  const categoryAr =
    product.categoryAr?.trim() ||
    product.categoryNameAr?.trim() ||
    category?.nameAr?.trim() ||
    category?.nameEn?.trim() ||
    category?.name?.trim() ||
    categoryString ||
    product.categoryName?.trim() ||
    "";

  return {
    category: categoryString || categoryEn,
    categoryName: product.categoryName?.trim() || categoryEn || categoryAr,
    categoryEn,
    categoryAr,
    categoryNameEn: product.categoryNameEn?.trim() || categoryEn,
    categoryNameAr: product.categoryNameAr?.trim() || categoryAr,
  };
}

// GET: Load products and stock arrival history.
export async function GET() {
  try {
    await connectDB();

    const [products, arrivals] = await Promise.all([
      Product.find({})
        .select(
          "_id sku name nameEn nameAr image category categoryName categoryEn categoryAr categoryNameEn categoryNameAr"
        )
        .sort({ sku: 1 })
        .lean(),
      StockArrival.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const formattedProducts = (products as unknown as ProductDocument[]).map(
      (product) => ({
        _id: String(product._id),
        sku: String(product.sku ?? ""),
        // Keep "name" for compatibility, and return both localized names.
        name: product.nameEn || product.nameAr || product.name || "",
        nameEn: product.nameEn || "",
        nameAr: product.nameAr || "",
        image: product.image || "",
        ...getCategoryNames(product),
      })
    );

    // Enrich old arrival records that only stored `name`, using the current
    // Product record. New records will already contain nameEn and nameAr.
    const allProductIds = [
      ...new Set(
        (arrivals as unknown as ArrivalDocument[]).flatMap((arrival) =>
          (arrival.products || [])
            .map((item) => String(item.productId || ""))
            .filter((id) => mongoose.isValidObjectId(id))
        )
      ),
    ];

    const currentProducts = allProductIds.length
      ? await Product.find({ _id: { $in: allProductIds } })
          .select("_id nameEn nameAr")
          .lean()
      : [];

    const localizedNames = new Map(
      (currentProducts as unknown as ProductDocument[]).map((product) => [
        String(product._id),
        {
          nameEn: product.nameEn || "",
          nameAr: product.nameAr || "",
        },
      ])
    );

    const formattedArrivals = (
      arrivals as unknown as ArrivalDocument[]
    ).map((arrival) => ({
      ...arrival,
      _id: String(arrival._id),
      products: (arrival.products || []).map((item) => {
        const names = localizedNames.get(String(item.productId || ""));
        return {
          ...item,
          productId: String(item.productId || ""),
          name: item.name || names?.nameEn || names?.nameAr || "",
          nameEn: item.nameEn || names?.nameEn || "",
          nameAr: item.nameAr || names?.nameAr || "",
          image: item.image || "",
        };
      }),
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      arrivals: formattedArrivals,
    });
  } catch (error) {
    console.error("Stock arrival GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load stock arrivals" },
      { status: 500 }
    );
  }
}

// POST: Create a new stock arrival.
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("productIds" in body)
    ) {
      return NextResponse.json(
        { success: false, message: "Product IDs are required" },
        { status: 400 }
      );
    }

    const rawProductIds: unknown = body.productIds;
    if (!Array.isArray(rawProductIds)) {
      return NextResponse.json(
        { success: false, message: "Product IDs must be an array" },
        { status: 400 }
      );
    }

    const productIds: string[] = [
      ...new Set(
        rawProductIds
          .filter((id: unknown): id is string => typeof id === "string")
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      ),
    ];

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one product" },
        { status: 400 }
      );
    }

    if (productIds.some((id) => !mongoose.isValidObjectId(id))) {
      return NextResponse.json(
        { success: false, message: "One or more product IDs are invalid" },
        { status: 400 }
      );
    }

    const products = await Product.find({ _id: { $in: productIds } })
      .select(
        "_id sku name nameEn nameAr image category categoryName categoryEn categoryAr categoryNameEn categoryNameAr"
      )
      .lean();

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, message: "Some selected products were not found" },
        { status: 404 }
      );
    }

    const productDocuments = products as unknown as ProductDocument[];
    const arrivalProducts = productDocuments.map((product) => ({
      productId: product._id,
      sku: String(product.sku ?? ""),
      name: product.nameEn || product.nameAr || product.name || "",
      nameEn: product.nameEn || "",
      nameAr: product.nameAr || "",
      image: product.image || "",
      ...getCategoryNames(product),
    }));

    const arrival = await StockArrival.create({
      products: arrivalProducts,
      status: "pending",
      marketplaceConfirmation: {
        talabat: false,
        snoonu: false,
        rafeeq: false,
        keeta: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock arrival created successfully",
        arrival,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Stock arrival POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create stock arrival" },
      { status: 500 }
    );
  }
}


// DELETE: Delete a completed stock arrival only.
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("arrivalId" in body) ||
      typeof body.arrivalId !== "string" ||
      !mongoose.isValidObjectId(body.arrivalId)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid stock arrival ID is required" },
        { status: 400 }
      );
    }

    const deleted = await StockArrival.findOneAndDelete({
      _id: body.arrivalId,
      status: "completed",
    });

    if (!deleted) {
      const exists = await StockArrival.exists({ _id: body.arrivalId });
      return NextResponse.json(
        {
          success: false,
          message: exists
            ? "Only completed stock arrivals can be deleted"
            : "Stock arrival not found",
        },
        { status: exists ? 400 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Completed stock arrival deleted successfully",
    });
  } catch (error) {
    console.error("Stock arrival DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete stock arrival" },
      { status: 500 }
    );
  }
}
