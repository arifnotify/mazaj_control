import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import SavedShoppingList from "@/models/SavedShoppingList";
import { isAdminSessionValid } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const valid = await isAdminSessionValid();
  if (!valid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin login required." },
      { status: 401 }
    );
  }
  return null;
}

// GET: return saved shopping lists, newest updated first.
export async function GET() {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    await connectDB();

    const lists = await SavedShoppingList.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, lists });
  } catch (error) {
    console.error("Saved shopping lists GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load saved shopping lists." },
      { status: 500 }
    );
  }
}

// POST: create a saved shopping list.
export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    await connectDB();

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const productIds = Array.isArray(body?.productIds)
      ? [...new Set(body.productIds.filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id)))]
      : [];

    if (!name) {
      return NextResponse.json({ success: false, error: "Shopping list name is required." }, { status: 400 });
    }
    if (!Array.isArray(body?.productIds) || productIds.length === 0 || productIds.length !== body.productIds.length) {
      return NextResponse.json({ success: false, error: "Select at least one valid product." }, { status: 400 });
    }

    const list = await SavedShoppingList.create({ name, productIds });
    return NextResponse.json({ success: true, list }, { status: 201 });
  } catch (error) {
    console.error("Saved shopping list POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to save shopping list." }, { status: 500 });
  }
}

// PUT: rename a saved shopping list or update its selected products.
export async function PUT(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    await connectDB();

    const body = await req.json();
    const listId = typeof body?.listId === "string" ? body.listId : "";
    if (!mongoose.isValidObjectId(listId)) {
      return NextResponse.json({ success: false, error: "Invalid shopping list." }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ success: false, error: "Shopping list name is required." }, { status: 400 });
      update.name = name;
    }
    if (body?.productIds !== undefined) {
      if (!Array.isArray(body.productIds)) return NextResponse.json({ success: false, error: "Product IDs must be an array." }, { status: 400 });
      const ids = [...new Set(body.productIds.filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id)))];
      if (ids.length === 0 || ids.length !== body.productIds.length) return NextResponse.json({ success: false, error: "Select at least one valid product." }, { status: 400 });
      update.productIds = ids;
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ success: false, error: "Nothing to update." }, { status: 400 });

    const list = await SavedShoppingList.findByIdAndUpdate(listId, { $set: update }, { new: true, runValidators: true });
    if (!list) return NextResponse.json({ success: false, error: "Shopping list not found." }, { status: 404 });
    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error("Saved shopping list PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update shopping list." }, { status: 500 });
  }
}

// DELETE: remove a saved shopping list.
export async function DELETE(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin();
    if (unauthorized) return unauthorized;
    await connectDB();

    const body = await req.json();
    const listId = typeof body?.listId === "string" ? body.listId : "";
    if (!mongoose.isValidObjectId(listId)) {
      return NextResponse.json({ success: false, error: "Invalid shopping list." }, { status: 400 });
    }
    const list = await SavedShoppingList.findByIdAndDelete(listId);
    if (!list) return NextResponse.json({ success: false, error: "Shopping list not found." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Shopping list deleted." });
  } catch (error) {
    console.error("Saved shopping list DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete shopping list." }, { status: 500 });
  }
}
