import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/Issue";

const allowedStatuses = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid issue ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid issue status" },
        { status: 400 }
      );
    }

    const updateData: {
      status?: string;
      note?: string;
    } = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.note !== undefined) {
      updateData.note = body.note;
    }

    const issue = await Issue.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("productId");

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(issue);
  } catch (error) {
    console.error("UPDATE ISSUE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update issue" },
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
        { error: "Invalid issue ID" },
        { status: 400 }
      );
    }

    const issue = await Issue.findByIdAndDelete(id);

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    console.error("DELETE ISSUE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete issue" },
      { status: 500 }
    );
  }
}