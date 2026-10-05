import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/Issue";

// GET: সব issues
export async function GET() {
  try {
    await connectDB();

    const issues = await Issue.find()
      .populate("productId")
      .sort({ createdAt: -1 });

    return NextResponse.json(issues);
  } catch (error) {
    console.error("GET ISSUES ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch issues",
      },
      {
        status: 500,
      }
    );
  }
}

// POST: নতুন issue তৈরি
export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();

    if (!body.productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!body.marketplace) {
      return NextResponse.json(
        { error: "Marketplace is required" },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: "Issue type is required" },
        { status: 400 }
      );
    }

    const issue = await Issue.create({
      productId: body.productId,
      marketplace: body.marketplace,
      type: body.type,
      note: body.note || "",
      status: "open",
    });

    return NextResponse.json(issue, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE ISSUE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create issue",
      },
      {
        status: 500,
      }
    );
  }
}