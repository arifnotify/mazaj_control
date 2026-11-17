import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({ active: true })
      .select("sku nameEn nameAr descriptionEn descriptionAr image categoryEn categoryAr price stock productType singleWeight singleUnit variants")
      .sort({ createdAt: -1 })
      .lean();
    const publicProducts = products.map((product: any) => ({
      _id: String(product._id),
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      descriptionEn: product.descriptionEn,
      descriptionAr: product.descriptionAr,
      image: product.image,
      categoryEn: product.categoryEn,
      categoryAr: product.categoryAr,
      price: product.price,
      inStock: Number(product.stock) > 0,
      productType: product.productType,
      singleWeight: product.singleWeight,
      singleUnit: product.singleUnit,
      variants: product.variants,
    }));
    return NextResponse.json(publicProducts, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("GET /api/storefront/products", error);
    return NextResponse.json({ error: "Unable to load products" }, { status: 500 });
  }
}
