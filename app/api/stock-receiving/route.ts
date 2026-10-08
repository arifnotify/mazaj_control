import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import StockReceiving from "@/models/StockReceiving";

/**
 * GET
 * Stock receiving records দেখাবে
 *
 * Optional:
 * /api/stock-receiving?month=2026-10
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const filter: Record<string, unknown> = {};

    // Month filter
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          {
            error: "Invalid month format. Use YYYY-MM",
          },
          { status: 400 }
        );
      }

      const [yearString, monthString] = month.split("-");

      const year = Number(yearString);
      const monthNumber = Number(monthString);

      if (monthNumber < 1 || monthNumber > 12) {
        return NextResponse.json(
          {
            error: "Invalid month",
          },
          { status: 400 }
        );
      }

      const startDate = `${year}-${String(monthNumber).padStart(
        2,
        "0"
      )}-01`;

      let nextYear = year;
      let nextMonth = monthNumber + 1;

      if (nextMonth === 13) {
        nextYear++;
        nextMonth = 1;
      }

      const endDate = `${nextYear}-${String(nextMonth).padStart(
        2,
        "0"
      )}-01`;

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const records = await StockReceiving.find(filter)
      .populate(
        "productId",
        "sku nameEn nameAr categoryEn categoryAr image price stock active"
      )
      .sort({
        date: -1,
        createdAt: -1,
      });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET STOCK RECEIVING ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch stock receiving records",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 * নতুন Stock Receiving entry তৈরি করবে
 */
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const productId = String(body.productId || "").trim();
    const date = String(body.date || "").trim();
    const quantity = Number(body.quantity);
    const note = String(body.note || "").trim();

    // Product ID validation
    if (!productId) {
      return NextResponse.json(
        {
          error: "Product is required",
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

    // Date validation
    if (!date) {
      return NextResponse.json(
        {
          error: "Date is required",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          error: "Invalid date format. Use YYYY-MM-DD",
        },
        { status: 400 }
      );
    }

    // Quantity validation
    if (
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          error: "Quantity must be a whole number greater than 0",
        },
        { status: 400 }
      );
    }

    // Check product exists
    const product = await Product.findById(productId);

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // Create receiving record
    const receiving = await StockReceiving.create({
      productId,
      date,
      quantity,
      note,
    });

    // Product information populate করে ফেরত পাঠানো
    const populatedReceiving =
      await StockReceiving.findById(receiving._id).populate(
        "productId",
        "sku nameEn nameAr categoryEn categoryAr image price stock active"
      );

    return NextResponse.json(populatedReceiving, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE STOCK RECEIVING ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create stock receiving record",
      },
      { status: 500 }
    );
  }
}