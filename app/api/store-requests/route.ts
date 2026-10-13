
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import StoreRequest from "@/models/StoreRequest";

export const runtime = "nodejs";

function validDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// GET: Load monthly store request history
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const month =
      searchParams.get("month") ||
      new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month. Use YYYY-MM." },
        { status: 400 }
      );
    }

    const rows = await StoreRequest.find({
      date: {
        $gte: `${month}-01`,
        $lte: `${month}-31`,
      },
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const requests = rows.map((row: any) => ({
      ...row,
      _id: String(row._id),
      items: (row.items || []).map((item: any) => ({
        ...item,
        productId: String(item.productId),
      })),
    }));

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET STORE REQUESTS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load store request history." },
      { status: 500 }
    );
  }
}

// POST: Save a new store request
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const date = body?.date;
    const incomingItems = body?.items;
    const requestNote = String(
      body?.requestNote || ""
    ).trim();

    if (!validDate(date)) {
      return NextResponse.json(
        { error: "Invalid request date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(incomingItems) ||
      incomingItems.length === 0 ||
      incomingItems.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "Add between 1 and 200 products to the request.",
        },
        { status: 400 }
      );
    }

    if (requestNote.length > 2000) {
      return NextResponse.json(
        { error: "The overall note is too long." },
        { status: 400 }
      );
    }

    const normalized = new Map<string, number>();
    const notes = new Map<string, string>();

    for (const item of incomingItems) {
      const productId = String(item?.productId || "");
      const quantity = Number(item?.quantity);
      const note = String(item?.note || "").trim();

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json(
          { error: "One of the selected products is invalid." },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 1_000_000
      ) {
        return NextResponse.json(
          {
            error:
              "Product quantities must be positive whole numbers.",
          },
          { status: 400 }
        );
      }

      if (note.length > 500) {
        return NextResponse.json(
          { error: "An item note is too long." },
          { status: 400 }
        );
      }

      normalized.set(
        productId,
        (normalized.get(productId) || 0) + quantity
      );

      if (note) {
        notes.set(
          productId,
          [
            notes.get(productId),
            note,
          ]
            .filter(Boolean)
            .join("; ")
            .slice(0, 500)
        );
      }
    }

    const ids = [...normalized.keys()];

    const products = await Product.find({
      _id: { $in: ids },
    })
      .select("_id sku nameEn nameAr")
      .lean();

    const productsById = new Map(
      products.map((product: any) => [
        String(product._id),
        product,
      ])
    );

    if (productsById.size !== ids.length) {
      return NextResponse.json(
        {
          error:
            "One or more products could not be found. Refresh the page and try again.",
        },
        { status: 400 }
      );
    }

    const items = ids.map((productId) => {
      const product: any = productsById.get(productId);

      return {
        productId: product._id,
        sku: product.sku || "-",
        nameEn: product.nameEn || product.nameAr || "-",
        nameAr: product.nameAr || product.nameEn || "",
        quantity: normalized.get(productId),
        note: notes.get(productId) || "",
      };
    });

    const saved = await StoreRequest.create({
      date,
      items,
      requestNote,
    });

    const result = saved.toObject();

    return NextResponse.json(
      {
        success: true,
        message: "Store request saved.",
        request: {
          ...result,
          _id: String(result._id),
          items: result.items.map((item: any) => ({
            ...item,
            productId: String(item.productId),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE STORE REQUEST ERROR:", error);

    return NextResponse.json(
      { error: "Failed to save store request." },
      { status: 500 }
    );
  }
}