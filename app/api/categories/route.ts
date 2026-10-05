import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";

// GET categories
export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find()
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(categories);
  } catch (error) {
    console.error(
      "GET CATEGORIES ERROR:",
      error
    );

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
export async function POST(
  request: Request
) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(
      body.name || ""
    ).trim();

    const description = String(
      body.description || ""
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          error: "Category name is required",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await Category.findOne({
        name: {
          $regex: `^${name}$`,
          $options: "i",
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Category already exists",
        },
        {
          status: 409,
        }
      );
    }

    const category =
      await Category.create({
        name,
        description,
        active: true,
      });

    return NextResponse.json(
      category,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE CATEGORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create category",
      },
      {
        status: 500,
      }
    );
  }
}