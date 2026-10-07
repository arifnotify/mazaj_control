import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

// GET: একটি product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT: product update
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    // SKU
    if (body.sku !== undefined) {
      updateData.sku = String(body.sku).trim();
    }

    // Name - English
    if (body.nameEn !== undefined) {
      updateData.nameEn = String(body.nameEn).trim();
    }

    // Name - Arabic
    if (body.nameAr !== undefined) {
      updateData.nameAr = String(body.nameAr).trim();
    }

    // Description - English
    if (body.descriptionEn !== undefined) {
      updateData.descriptionEn = String(body.descriptionEn).trim();
    }

    // Description - Arabic
    if (body.descriptionAr !== undefined) {
      updateData.descriptionAr = String(body.descriptionAr).trim();
    }

    // Image
    if (body.image !== undefined) {
      updateData.image = String(body.image).trim();
    }

    // Category - English
    if (body.categoryEn !== undefined) {
      updateData.categoryEn = String(body.categoryEn).trim();
    }

    // Category - Arabic
    if (body.categoryAr !== undefined) {
      updateData.categoryAr = String(body.categoryAr).trim();
    }

    // Price
    if (body.price !== undefined) {
      const price = Number(body.price);

      if (Number.isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Invalid price" },
          { status: 400 }
        );
      }

      updateData.price = price;
    }

    // Stock
    if (body.stock !== undefined) {
      const stock = Number(body.stock);

      if (Number.isNaN(stock) || stock < 0) {
        return NextResponse.json(
          { error: "Invalid stock" },
          { status: 400 }
        );
      }

      updateData.stock = stock;
    }

    // ON / OFF
    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("UPDATE PRODUCT ERROR:", error);

    // Duplicate SKU
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE: product delete
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}