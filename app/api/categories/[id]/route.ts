import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.nameEn !== undefined) {
      const nameEn = String(body.nameEn).trim();

      if (!nameEn) {
        return NextResponse.json(
          { error: "English category name is required" },
          { status: 400 }
        );
      }

      updateData.nameEn = nameEn;
    }

    if (body.nameAr !== undefined) {
      const nameAr = String(body.nameAr).trim();

      if (!nameAr) {
        return NextResponse.json(
          { error: "Arabic category name is required" },
          { status: 400 }
        );
      }

      updateData.nameAr = nameAr;
    }

    if (body.descriptionEn !== undefined) {
      updateData.descriptionEn =
        String(body.descriptionEn).trim();
    }

    if (body.descriptionAr !== undefined) {
      updateData.descriptionAr =
        String(body.descriptionAr).trim();
    }

    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }

    // Check duplicate English name
    if (updateData.nameEn) {
      const duplicateEnglish = await Category.findOne({
        _id: { $ne: id },
        nameEn: {
          $regex: `^${String(updateData.nameEn)}$`,
          $options: "i",
        },
      });

      if (duplicateEnglish) {
        return NextResponse.json(
          { error: "English category already exists" },
          { status: 409 }
        );
      }
    }

    // Check duplicate Arabic name
    if (updateData.nameAr) {
      const duplicateArabic = await Category.findOne({
        _id: { $ne: id },
        nameAr: {
          $regex: `^${String(updateData.nameAr)}$`,
          $options: "i",
        },
      });

      if (duplicateArabic) {
        return NextResponse.json(
          { error: "Arabic category already exists" },
          { status: 409 }
        );
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("UPDATE CATEGORY ERROR:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}