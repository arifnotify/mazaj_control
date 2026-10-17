import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductMarketplace from "@/models/ProductMarketplace";
import Supplier from "@/models/Supplier";
import PurchaseOrder from "@/models/PurchaseOrder";

export const dynamic = "force-dynamic";

const marketplaceNames = ["Talabat", "Snoonu", "Rafeeq", "Keeta"];

function productName(product: any): string {
  return product.nameEn || product.name || product.nameAr || "";
}
function productNameArabic(product: any): string {
  return product.nameAr || product.nameEn || "اسم المنتج غير متوفر";
}
function productImage(product: any): string {
  return product.image || product.imageUrl || "";
}
function productCategoryEn(product: any): string {
  return product.categoryEn?.trim() || "Uncategorized";
}
function productCategoryAr(product: any): string {
  return product.categoryAr?.trim() || "غير مصنف";
}

// GET: products, marketplaces, suppliers (including supplier-specific catalog), and orders
export async function GET() {
  try {
    await connectDB();
    const [products, marketplaceRecords, suppliers, orders] = await Promise.all([
      Product.find({})
        .select("_id sku name nameEn nameAr descriptionEn descriptionAr image imageUrl categoryEn categoryAr price stock active")
        .sort({ nameEn: 1 }).lean(),
      ProductMarketplace.find({}).lean(),
      Supplier.find({ active: true }).sort({ name: 1 }).lean(),
      PurchaseOrder.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    const marketplaceMap = new Map<string, any[]>();
    for (const record of marketplaceRecords as any[]) {
      const key = String(record.productId);
      marketplaceMap.set(key, [...(marketplaceMap.get(key) || []), {
        marketplace: record.marketplace,
        connected: record.syncStatus !== "not_connected",
        available: Boolean(record.available),
        syncStatus: record.syncStatus || "not_connected",
      }]);
    }

    const formattedProducts = (products as any[]).map((product) => {
      const records = marketplaceMap.get(String(product._id)) || [];
      const marketplaces = marketplaceNames.map((name) => {
        const record = records.find((item) => String(item.marketplace).toLowerCase() === name.toLowerCase());
        return { name, connected: record?.connected ?? false, available: record?.available ?? false, syncStatus: record?.syncStatus ?? "not_connected" };
      });
      const stock = Number(product.stock ?? 0);
      return {
        _id: String(product._id), sku: String(product.sku ?? ""),
        name: productName(product), nameEn: product.nameEn || "", nameAr: productNameArabic(product),
        descriptionEn: product.descriptionEn || "", descriptionAr: product.descriptionAr || "",
        image: productImage(product), imageUrl: productImage(product),
        categoryEn: productCategoryEn(product), categoryAr: productCategoryAr(product),
        price: Number(product.price ?? 0), stock, active: product.active !== false, outOfStock: stock <= 0,
        marketplaces,
        marketplaceInactive: marketplaces.some((marketplace) => marketplace.connected && !marketplace.available),
      };
    });

    const formattedSuppliers = (suppliers as any[]).map((supplier) => ({
      ...supplier,
      _id: String(supplier._id),
      supplierProducts: (supplier.supplierProducts || []).map((item: any) => ({
        productId: String(item.productId), sku: item.sku || "", nameEn: item.nameEn || "",
        nameAr: item.nameAr || "", image: item.image || "", unitCost: Number(item.unitCost || 0), notes: item.notes || "",
      })),
    }));

    return NextResponse.json({ success: true, products: formattedProducts, suppliers: formattedSuppliers, orders });
  } catch (error) {
    console.error("Purchase center GET error:", error);
    return NextResponse.json({ success: false, message: "Failed to load purchase center" }, { status: 500 });
  }
}

// PUT: save a supplier's product catalog and supplier-specific prices
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const body: any = await req.json();
    const supplierId = typeof body?.supplierId === "string" ? body.supplierId : "";
    if (!mongoose.isValidObjectId(supplierId)) {
      return NextResponse.json({ success: false, message: "Select a valid supplier" }, { status: 400 });
    }
    if (!Array.isArray(body.supplierProducts)) {
      return NextResponse.json({ success: false, message: "Supplier product list is required" }, { status: 400 });
    }

    const seen = new Set<string>();
    const requested: { productId: string; unitCost: number; notes: string }[] = [];
    for (const raw of body.supplierProducts) {
      const productId = typeof raw?.productId === "string" ? raw.productId : "";
      const unitCost = Number(raw?.unitCost);
      if (!mongoose.isValidObjectId(productId) || !Number.isFinite(unitCost) || unitCost < 0 || seen.has(productId)) {
        return NextResponse.json({ success: false, message: "Check product selections and supplier prices" }, { status: 400 });
      }
      seen.add(productId);
      requested.push({ productId, unitCost, notes: typeof raw?.notes === "string" ? raw.notes.trim() : "" });
    }

    const supplier = await Supplier.findOne({ _id: supplierId, active: true });
    if (!supplier) return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });

    const products = requested.length ? await Product.find({ _id: { $in: requested.map((item) => item.productId) } })
      .select("_id sku name nameEn nameAr image imageUrl").lean() : [];
    if (products.length !== requested.length) {
      return NextResponse.json({ success: false, message: "One or more products were not found" }, { status: 404 });
    }
    const productMap = new Map((products as any[]).map((p) => [String(p._id), p]));
    supplier.set("supplierProducts", requested.map((item) => {
      const p: any = productMap.get(item.productId);
      return { productId: p._id, sku: String(p.sku || ""), nameEn: p.nameEn || p.name || "", nameAr: p.nameAr || "",
        image: p.image || p.imageUrl || "", unitCost: Math.round(item.unitCost * 100) / 100, notes: item.notes };
    }));
    await supplier.save();
    return NextResponse.json({ success: true, message: "Supplier product list saved", supplier });
  } catch (error) {
    console.error("Supplier product catalog save error:", error);
    return NextResponse.json({ success: false, message: "Failed to save supplier product list" }, { status: 500 });
  }
}

// POST: create purchase order and update the supplier's saved prices for products ordered
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    const data = body as Record<string, unknown>;
    const supplierType = data.supplierType === "market" ? "market" : "regular";
    const supplierId = typeof data.supplierId === "string" ? data.supplierId : "";
    const newSupplierName = typeof data.newSupplierName === "string" ? data.newSupplierName.trim() : "";
    let supplier: any = null;

    if (supplierType === "regular") {
      if (!mongoose.isValidObjectId(supplierId)) return NextResponse.json({ success: false, message: "Select a valid supplier" }, { status: 400 });
      supplier = await Supplier.findOne({ _id: supplierId, active: true });
      if (!supplier) return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    } else if (!newSupplierName) {
      return NextResponse.json({ success: false, message: "Enter the new market or supplier name" }, { status: 400 });
    }

    if (!Array.isArray(data.items) || data.items.length === 0) return NextResponse.json({ success: false, message: "Add at least one product" }, { status: 400 });
    const requestedItems: { productId: string; quantity: number; unitCost: number }[] = [];
    for (const rawItem of data.items) {
      if (!rawItem || typeof rawItem !== "object") return NextResponse.json({ success: false, message: "Invalid purchase item" }, { status: 400 });
      const item = rawItem as Record<string, unknown>;
      const productId = typeof item.productId === "string" ? item.productId : "";
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      if (!mongoose.isValidObjectId(productId) || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(unitCost) || unitCost < 0) {
        return NextResponse.json({ success: false, message: "Check the selected products, quantities and prices" }, { status: 400 });
      }
      requestedItems.push({ productId, quantity, unitCost });
    }
    const uniqueProductIds = [...new Set(requestedItems.map((item) => item.productId))];
    if (uniqueProductIds.length !== requestedItems.length) return NextResponse.json({ success: false, message: "A product may only appear once in an order" }, { status: 400 });

    const products = await Product.find({ _id: { $in: uniqueProductIds } }).select("_id sku name nameEn nameAr image imageUrl categoryEn categoryAr").lean();
    if (products.length !== uniqueProductIds.length) return NextResponse.json({ success: false, message: "One or more products were not found" }, { status: 404 });
    const productMap = new Map((products as any[]).map((product) => [String(product._id), product]));
    const items = requestedItems.map((item) => {
      const product: any = productMap.get(item.productId)!;
      return { productId: product._id, sku: String(product.sku ?? ""), name: productName(product), nameEn: product.nameEn || "", nameAr: productNameArabic(product), image: productImage(product), quantity: item.quantity, unitCost: item.unitCost, lineTotal: Math.round(item.quantity * item.unitCost * 100) / 100 };
    });
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;

    const order = await PurchaseOrder.create({
      orderNumber, supplierId: supplier?._id ?? null, supplierName: supplier?.name || newSupplierName, supplierType,
      supplierPhone: supplier?.phone || (typeof data.newSupplierPhone === "string" ? data.newSupplierPhone.trim() : ""),
      supplierEmail: supplier?.email || (typeof data.newSupplierEmail === "string" ? data.newSupplierEmail.trim() : ""),
      marketName: supplier?.marketName || (typeof data.marketName === "string" ? data.marketName.trim() : ""),
      items, subtotal, notes: typeof data.notes === "string" ? data.notes.trim() : "", status: "draft",
    });

    // Remember prices for regular suppliers whenever a purchase order is created.
    if (supplier) {
      const existing = new Map<string, any>((supplier.supplierProducts || []).map((p: any) => [String(p.productId), p.toObject ? p.toObject() : p]));
      for (const item of items) {
        const product: any = productMap.get(String(item.productId))!;
        existing.set(String(item.productId), { productId: product._id, sku: item.sku, nameEn: item.nameEn, nameAr: item.nameAr, image: item.image, unitCost: item.unitCost, notes: existing.get(String(item.productId))?.notes || "" });
      }
      supplier.set("supplierProducts", Array.from(existing.values()));
      await supplier.save();
    }

    return NextResponse.json({ success: true, message: "Purchase order created", order }, { status: 201 });
  } catch (error) {
    console.error("Purchase order creation error:", error);
    return NextResponse.json({ success: false, message: "Failed to create purchase order" }, { status: 500 });
  }
}

// PATCH: update purchase order status
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    const data = body as Record<string, unknown>;
    const orderId = typeof data.orderId === "string" ? data.orderId : "";
    const status = data.status;
    const allowedStatuses = ["draft", "ordered", "received", "cancelled"];
    if (!mongoose.isValidObjectId(orderId) || typeof status !== "string" || !allowedStatuses.includes(status)) return NextResponse.json({ success: false, message: "Invalid order or status" }, { status: 400 });
    const order = await PurchaseOrder.findByIdAndUpdate(orderId, { $set: { status, receivedAt: status === "received" ? new Date() : null } }, { new: true, runValidators: true });
    if (!order) return NextResponse.json({ success: false, message: "Purchase order not found" }, { status: 404 });
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Purchase order update error:", error);
    return NextResponse.json({ success: false, message: "Failed to update purchase order" }, { status: 500 });
  }
}
