import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";

// GET categories
export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find()
      .sort({ nameEn: 1 })
      .lean();

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch categories",
      },
      {
        status: 500,
      }
    );
  }
}

// POST category
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    const nameEn = String(body.nameEn || "").trim();
    const nameAr = String(body.nameAr || "").trim();

    const descriptionEn = String(
      body.descriptionEn || ""
    ).trim();

    const descriptionAr = String(
      body.descriptionAr || ""
    ).trim();

    if (!nameEn) {
      return NextResponse.json(
        {
          error: "English category name is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!nameAr) {
      return NextResponse.json(
        {
          error: "Arabic category name is required",
        },
        {
          status: 400,
        }
      );
    }

    // Check English name
    const existingEnglish = await Category.findOne({
      nameEn: {
        $regex: `^${nameEn}$`,
        $options: "i",
      },
    });

    if (existingEnglish) {
      return NextResponse.json(
        {
          error: "English category already exists",
        },
        {
          status: 409,
        }
      );
    }

    // Check Arabic name
    const existingArabic = await Category.findOne({
      nameAr: {
        $regex: `^${nameAr}$`,
        $options: "i",
      },
    });

    if (existingArabic) {
      return NextResponse.json(
        {
          error: "Arabic category already exists",
        },
        {
          status: 409,
        }
      );
    }

    const category = await Category.create({
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      active: true,
    });

    return NextResponse.json(category, {
      status: 201,
    });
  } catch (error: any) {
    console.error("CREATE CATEGORY ERROR:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error: "Category already exists",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create category",
      },
      {
        status: 500,
      }
    );
  }
}