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

    // Check MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          error: "Invalid product ID",
        },
        {
          status: 400,
        }
      );
    }

    const product = await Product.findById(id);

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

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch product",
      },
      {
        status: 500,
      }
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
        {
          error: "Invalid product ID",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const product = await Product.findByIdAndUpdate(
      id,
      {
        ...(body.sku !== undefined && {
          sku: body.sku.trim(),
        }),

        ...(body.name !== undefined && {
          name: body.name.trim(),
        }),

        ...(body.category !== undefined && {
          category: body.category.trim(),
        }),

        ...(body.description !== undefined && {
          description: body.description.trim(),
        }),

        ...(body.image !== undefined && {
          image: body.image.trim(),
        }),

        ...(body.price !== undefined && {
          price: Number(body.price),
        }),

        ...(body.stock !== undefined && {
          stock: Number(body.stock),
        }),

        ...(body.active !== undefined && {
          active: Boolean(body.active),
        }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

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

    return NextResponse.json(product);
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to update product",
      },
      {
        status: 500,
      }
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
        {
          error: "Invalid product ID",
        },
        {
          status: 400,
        }
      );
    }

    const product = await Product.findByIdAndDelete(id);

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

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to delete product",
      },
      {
        status: 500,
      }
    );
  }
}