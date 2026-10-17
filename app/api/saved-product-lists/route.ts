
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { isAdminSessionValid } from "@/lib/adminSession";
import SavedProductList from "@/models/SavedProductList";

export const dynamic = "force-dynamic";

async function checkAdmin() {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return null;

  const normalized = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== "object") return null;

    const value = item as Record<string, unknown>;
    const productId =
      typeof value.productId === "string" ? value.productId.trim() : "";
    const name = typeof value.name === "string" ? value.name.trim() : "";

    if (!productId || !name || seen.has(productId)) return null;

    seen.add(productId);
    normalized.push({
      productId,
      sku: typeof value.sku === "string" ? value.sku : "",
      name,
      nameEn: typeof value.nameEn === "string" ? value.nameEn : "",
      nameAr: typeof value.nameAr === "string" ? value.nameAr : "",
      image: typeof value.image === "string" ? value.image : "",
      category:
        typeof value.category === "string" && value.category.trim()
          ? value.category.trim()
          : "Uncategorized",
    });
  }

  return normalized;
}

// GET: Load saved lists
export async function GET() {
  try {
    const unauthorized = await checkAdmin();
    if (unauthorized) return unauthorized;

    await connectDB();

    const lists = await SavedProductList.find({})
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      lists: lists.map((list: any) => ({
        ...list,
        _id: String(list._id),
        items: list.items || [],
      })),
    });
  } catch (error) {
    console.error("Load saved lists error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load saved lists" },
      { status: 500 }
    );
  }
}

// POST: Create a new saved list
export async function POST(req: NextRequest) {
  try {
    const unauthorized = await checkAdmin();
    if (unauthorized) return unauthorized;

    await connectDB();

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const items = normalizeItems(body.items);

    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, message: "List name is required (max 100 characters)" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one product" },
        { status: 400 }
      );
    }

    const list = await SavedProductList.create({ name, items });

    return NextResponse.json(
      { success: true, list },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create saved list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create saved list" },
      { status: 500 }
    );
  }
}

// PATCH: Edit an existing saved list
export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await checkAdmin();
    if (unauthorized) return unauthorized;

    await connectDB();

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const items = normalizeItems(body.items);

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid list ID" },
        { status: 400 }
      );
    }

    if (!name || name.length > 100 || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid name and select products" },
        { status: 400 }
      );
    }

    const list = await SavedProductList.findByIdAndUpdate(
      id,
      { $set: { name, items } },
      { new: true, runValidators: true }
    );

    if (!list) {
      return NextResponse.json(
        { success: false, message: "Saved list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error("Update saved list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update saved list" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a saved list
export async function DELETE(req: NextRequest) {
  try {
    const unauthorized = await checkAdmin();
    if (unauthorized) return unauthorized;

    await connectDB();

    const id = req.nextUrl.searchParams.get("id") || "";

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid list ID" },
        { status: 400 }
      );
    }

    const list = await SavedProductList.findByIdAndDelete(id);

    if (!list) {
      return NextResponse.json(
        { success: false, message: "Saved list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete saved list" },
      { status: 500 }
    );
  }
}
