
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import StoreRequest from "@/models/StoreRequest";

export const runtime = "nodejs";

// DELETE: Remove a store request from MongoDB
export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid store request ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = await StoreRequest.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Store request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Store request deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE STORE REQUEST ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete store request." },
      { status: 500 }
    );
  }
}
