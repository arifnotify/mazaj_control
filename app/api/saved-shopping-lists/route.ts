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

    const rawLists = await SavedShoppingList.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    // Older lists only have productIds; expose them as quantity 1 items.
    const lists = rawLists.map((list: any) => ({
      ...list,
      items: Array.isArray(list.items) && list.items.length
        ? list.items
        : (list.productIds || []).map((productId: string) => ({ productId, quantity: 1 })),
    }));

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
    const rawItems = Array.isArray(body?.items)
      ? body.items
      : (Array.isArray(body?.productIds) ? body.productIds.map((productId: string) => ({ productId, quantity: 1 })) : []);
    const items = rawItems.map((item: any) => ({
      productId: typeof item?.productId === "string" ? item.productId : "",
      quantity: Number(item?.quantity ?? 1),
    }));
    const validItems = items.length > 0 && items.every((item: any) =>
      mongoose.isValidObjectId(item.productId) && Number.isInteger(item.quantity) && item.quantity >= 1
    );

    if (!name) {
      return NextResponse.json({ success: false, error: "Shopping list name is required." }, { status: 400 });
    }
    if (!validItems) {
      return NextResponse.json({ success: false, error: "Each item must have a valid product and quantity of at least 1." }, { status: 400 });
    }

    const productIds = items.map((item: any) => item.productId);
    const list = await SavedShoppingList.create({ name, items, productIds });
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
    if (body?.items !== undefined || body?.productIds !== undefined) {
      const rawItems = Array.isArray(body?.items)
        ? body.items
        : (Array.isArray(body?.productIds) ? body.productIds.map((productId: string) => ({ productId, quantity: 1 })) : null);
      if (!rawItems) return NextResponse.json({ success: false, error: "Items must be an array." }, { status: 400 });
      const items = rawItems.map((item: any) => ({
        productId: typeof item?.productId === "string" ? item.productId : "",
        quantity: Number(item?.quantity ?? 1),
      }));
      const validItems = items.length > 0 && items.every((item: any) =>
        mongoose.isValidObjectId(item.productId) && Number.isInteger(item.quantity) && item.quantity >= 1
      );
      if (!validItems) return NextResponse.json({ success: false, error: "Each item must have a valid product and quantity of at least 1." }, { status: 400 });
      update.items = items;
      update.productIds = items.map((item: any) => item.productId);
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
