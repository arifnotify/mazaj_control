import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import CustomerOrder from "@/models/CustomerOrder";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

function normalizeWhatsApp(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const customerId = request.nextUrl.searchParams.get("customerId");

    const filter: Record<string, unknown> = {};

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return NextResponse.json(
          { error: "Invalid customer ID." },
          { status: 400 }
        );
      }

      filter.customerId = customerId;
    }

    const orders = await CustomerOrder.find(filter)
      .populate("customerId", "name whatsapp")
      .sort({ orderDate: -1 })
      .limit(500)
      .lean();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Customer orders GET error:", error);
    return NextResponse.json(
      { error: "Could not load orders." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const name = String(body.customer?.name || "").trim();
    const whatsapp = normalizeWhatsApp(
      String(body.customer?.whatsapp || "")
    );

    const address = String(body.customer?.address || "").trim();
    const area = String(body.customer?.area || "").trim();

    if (!name || whatsapp.length < 7) {
      return NextResponse.json(
        { error: "Customer name and valid WhatsApp number are required." },
        { status: 400 }
      );
    }

    const platform = String(body.platform || "");
    const allowedPlatforms = [
      "Talabat",
      "Snoonu",
      "Rafeeq",
      "Keeta",
      "Direct",
    ];

    if (!allowedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: "Invalid order platform." },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Delivered",
      "Cancelled",
    ];

    const status = body.status || "Pending";

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one product." },
        { status: 400 }
      );
    }

    const orderDate = new Date(body.orderDate || Date.now());

    if (Number.isNaN(orderDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid order date." },
        { status: 400 }
      );
    }

    // Find existing customer by normalized WhatsApp number.
    const customer = await Customer.findOneAndUpdate(
      { whatsapp },
      {
        $set: { name, address, area },
        $setOnInsert: {
          whatsapp,
          totalOrders: 0,
          totalSpent: 0,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const items = [];
    let orderTotal = 0;

    for (const input of body.items) {
      const productId = String(input.productId || "");
      const quantity = Number(input.quantity);
      const unitPrice = Number(input.unitPrice);

      if (
        !mongoose.Types.ObjectId.isValid(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return NextResponse.json(
          { error: "Invalid product, quantity, or price." },
          { status: 400 }
        );
      }

      const product = await Product.findById(productId)
        .select("_id name nameEn nameAr sku")
        .lean();

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        );
      }

      const productName = body.language === "ar"
        ? product.nameAr || product.nameEn || product.name || "منتج بلا اسم"
        : product.nameEn || product.name || product.nameAr || "Unnamed Product";

      const lineTotal = quantity * unitPrice;

      items.push({
        productId: product._id,
        productName,
        sku: product.sku || "",
        quantity,
        unitPrice,
        lineTotal,
      });

      orderTotal += lineTotal;
    }

    const order = await CustomerOrder.create({
      customerId: customer._id,
      orderDate,
      platform,
      status,
      items,
      orderTotal,
      notes: String(body.notes || ""),
    });

    // Refresh Customer totals from saved orders.
    // Cancelled orders are excluded from purchase statistics.
    const stats = await CustomerOrder.aggregate([
      {
        $match: {
          customerId: customer._id,
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$orderTotal" },
          firstOrderAt: { $min: "$orderDate" },
          lastOrderAt: { $max: "$orderDate" },
        },
      },
    ]);

    const summary = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    };

    await Customer.findByIdAndUpdate(customer._id, {
      $set: {
        totalOrders: summary.totalOrders,
        totalSpent: summary.totalSpent,
        firstOrderAt: summary.firstOrderAt,
        lastOrderAt: summary.lastOrderAt,
      },
    });

    return NextResponse.json(
      {
        message: "Order saved successfully.",
        customerId: String(customer._id),
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer order POST error:", error);

    return NextResponse.json(
      { error: "Could not save order." },
      { status: 500 }
    );
  }
}