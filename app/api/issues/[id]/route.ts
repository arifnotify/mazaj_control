
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/Issue";
import "@/models/Product";
import "@/models/Employee";

const validStatuses = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "Invalid issue ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, string> = {};

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !validStatuses.includes(body.status)
      ) {
        return NextResponse.json(
          { message: "Invalid issue status." },
          { status: 400 }
        );
      }

      updateData.status = body.status;
    }

    if (body.note !== undefined) {
      if (typeof body.note !== "string") {
        return NextResponse.json(
          { message: "Note must be text." },
          { status: 400 }
        );
      }

      updateData.note = body.note.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided to update." },
        { status: 400 }
      );
    }

    const issue = await Issue.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("productId")
      .populate("reporterEmployeeId")
      .lean();

    if (!issue) {
      return NextResponse.json(
        { message: "Issue not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(issue, { status: 200 });
  } catch (error) {
    console.error("PUT /api/issues/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to update issue." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "Invalid issue ID." },
        { status: 400 }
      );
    }

    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return NextResponse.json(
        { message: "Issue not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Issue deleted successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/issues/[id] error:", error);

    return NextResponse.json(
      { message: "Failed to delete issue." },
      { status: 500 }
    );
  }
}