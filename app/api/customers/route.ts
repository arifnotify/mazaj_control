import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import CustomerOrder from "@/models/CustomerOrder";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
const normalize = (value: string) => value.replace(/\D/g, "");

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const platform = request.nextUrl.searchParams.get("platform") || "";
    const productId = request.nextUrl.searchParams.get("productId") || "";
    const match: Record<string, unknown> = {};
    if (search) {
      const digits = normalize(search);
      match.$or = [
        { name: { $regex: search, $options: "i" } },
        { whatsapp: { $regex: digits || search, $options: "i" } },
        { area: { $regex: search, $options: "i" } },
      ];
    }
    const customers = await Customer.find(match).sort({ updatedAt: -1 }).limit(1000).lean();
    const ids = customers.map((c) => c._id);
    const orderMatch: Record<string, unknown> = { customerId: { $in: ids }, status: { $ne: "Cancelled" } };
    if (platform) orderMatch.platform = platform;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) orderMatch["items.productId"] = new mongoose.Types.ObjectId(productId);
    const orders = await CustomerOrder.find(orderMatch).select("customerId platform items orderDate").sort({ orderDate: -1 }).lean();
    const aggregate = new Map<string, { platforms: Set<string>; products: Map<string, { productId: string; productName: string; sku: string; image: string }> }>();
    for (const order of orders) {
      const cid = String(order.customerId);
      if (!aggregate.has(cid)) aggregate.set(cid, { platforms: new Set(), products: new Map() });
      const entry = aggregate.get(cid)!;
      entry.platforms.add(order.platform);
      for (const item of order.items as Array<{productId: unknown; productName: string; sku?: string; image?: string}>) {
        const pid = String(item.productId);
        if (!entry.products.has(pid)) entry.products.set(pid, { productId: pid, productName: item.productName, sku: item.sku || "", image: item.image || "" });
      }
    }
    const result = customers.map((c) => {
      const data = aggregate.get(String(c._id));
      return { ...c, platforms: data ? [...data.platforms] : [], productHistory: data ? [...data.products.values()] : [] };
    }).filter((c) => (!platform || c.platforms.includes(platform)) && (!productId || c.productHistory.some((p: { productId: string }) => p.productId === productId)));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Customer GET error:", error);
    return NextResponse.json({ error: "Could not load customers." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const whatsapp = normalize(String(body.whatsapp || ""));
    if (!name || whatsapp.length < 7) return NextResponse.json({ error: "Valid customer name and WhatsApp number are required." }, { status: 400 });
    const customer = await Customer.findOneAndUpdate({ whatsapp }, { $set: { name, address: String(body.address || "").trim(), area: String(body.area || "").trim(), notes: String(body.notes || "") }, $setOnInsert: { whatsapp, totalOrders: 0, totalSpent: 0 } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    return NextResponse.json({ customer, created: customer.totalOrders === 0 });
  } catch (error) {
    console.error("Customer POST error:", error);
    return NextResponse.json({ error: "Could not save customer." }, { status: 500 });
  }
}
