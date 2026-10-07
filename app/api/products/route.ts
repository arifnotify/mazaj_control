import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET() {
  try {
    await connectDB();

    const products = await Product.find().sort({ createdAt: -1 });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    // Required fields
    if (!body.sku) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }

    if (!body.nameEn) {
      return NextResponse.json(
        { error: "English product name is required" },
        { status: 400 }
      );
    }

    if (!body.nameAr) {
      return NextResponse.json(
        { error: "Arabic product name is required" },
        { status: 400 }
      );
    }

    if (body.price === undefined || body.price === "") {
      return NextResponse.json(
        { error: "Price is required" },
        { status: 400 }
      );
    }

    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    if (Number.isNaN(stock) || stock < 0) {
      return NextResponse.json(
        { error: "Invalid stock" },
        { status: 400 }
      );
    }

    const product = await Product.create({
      sku: body.sku.trim(),

      // Name
      nameEn: body.nameEn.trim(),
      nameAr: body.nameAr.trim(),

      // Description
      descriptionEn: body.descriptionEn?.trim() || "",
      descriptionAr: body.descriptionAr?.trim() || "",

      // Image
      image: body.image?.trim() || "",

      // Category
      categoryEn: body.categoryEn?.trim() || "",
      categoryAr: body.categoryAr?.trim() || "",

      // Price & Stock
      price,
      stock,

      // ON / OFF
      active: body.active ?? true,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("CREATE PRODUCT ERROR:", error);

    // Duplicate SKU
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}