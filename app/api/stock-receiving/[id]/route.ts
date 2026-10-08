import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import StockReceiving from "@/models/StockReceiving";

/**
 * GET
 * একটি নির্দিষ্ট Stock Receiving record দেখাবে
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          error: "Invalid stock receiving ID",
        },
        { status: 400 }
      );
    }

    const receiving = await StockReceiving.findById(id).populate(
      "productId",
      "sku nameEn nameAr categoryEn categoryAr image price stock active"
    );

    if (!receiving) {
      return NextResponse.json(
        {
          error: "Stock receiving record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(receiving);
  } catch (error) {
    console.error("GET STOCK RECEIVING BY ID ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch stock receiving record",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT
 * Stock Receiving record update করবে
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          error: "Invalid stock receiving ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // Product
    if (body.productId !== undefined) {
      const productId = String(body.productId).trim();

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

      const product = await Product.findById(productId);

      if (!product) {
        return NextResponse.json(
          {
            error: "Product not found",
          },
          { status: 404 }
        );
      }

      updateData.productId = productId;
    }

    // Date
    if (body.date !== undefined) {
      const date = String(body.date).trim();

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

      updateData.date = date;
    }

    // Quantity
    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);

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

      updateData.quantity = quantity;
    }

    // Note
    if (body.note !== undefined) {
      updateData.note = String(body.note || "").trim();
    }

    // Update
    const receiving = await StockReceiving.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate(
      "productId",
      "sku nameEn nameAr categoryEn categoryAr image price stock active"
    );

    if (!receiving) {
      return NextResponse.json(
        {
          error: "Stock receiving record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(receiving);
  } catch (error) {
    console.error("UPDATE STOCK RECEIVING ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to update stock receiving record",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 * Stock Receiving record delete করবে
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          error: "Invalid stock receiving ID",
        },
        { status: 400 }
      );
    }

    const receiving = await StockReceiving.findByIdAndDelete(id);

    if (!receiving) {
      return NextResponse.json(
        {
          error: "Stock receiving record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Stock receiving record deleted successfully",
    });
  } catch (error) {
    console.error("DELETE STOCK RECEIVING ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to delete stock receiving record",
      },
      { status: 500 }
    );
  }
}