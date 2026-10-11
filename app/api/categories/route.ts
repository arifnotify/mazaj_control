
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";

// ======================================================
// HELPERS
// ======================================================

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// ======================================================
// GET ALL CATEGORIES
// ======================================================

export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find({})
      .sort({ nameEn: 1 })
      .lean();

    return NextResponse.json(categories, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("GET CATEGORIES ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch categories",
        details: getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// CREATE NEW CATEGORY
// ======================================================

export async function POST(request: Request) {
  try {
    await connectDB();

    let body: Record<string, unknown>;

    try {
      body = await request.json();

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        return NextResponse.json(
          {
            error: "Invalid request body",
          },
          {
            status: 400,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // NORMALIZE INPUT
    // ==================================================

    const nameEn = normalizeText(body.nameEn);
    const nameAr = normalizeText(body.nameAr);

    const descriptionEn = normalizeText(
      body.descriptionEn
    );

    const descriptionAr = normalizeText(
      body.descriptionAr
    );

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!nameEn) {
      return NextResponse.json(
        {
          error: "English category name is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!nameAr) {
      return NextResponse.json(
        {
          error: "Arabic category name is required",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // CHECK DUPLICATE ENGLISH NAME
    // ==================================================

    const existingEnglish = await Category.findOne({
      nameEn: {
        $regex: `^${escapeRegex(nameEn)}$`,
        $options: "i",
      },
    }).lean();

    if (existingEnglish) {
      return NextResponse.json(
        {
          error: "English category already exists",
          field: "nameEn",
          existingCategory: existingEnglish.nameEn,
        },
        {
          status: 409,
        }
      );
    }

    // ==================================================
    // CHECK DUPLICATE ARABIC NAME
    // ==================================================

    const existingArabic = await Category.findOne({
      nameAr: {
        $regex: `^${escapeRegex(nameAr)}$`,
        $options: "i",
      },
    }).lean();

    if (existingArabic) {
      return NextResponse.json(
        {
          error: "Arabic category already exists",
          field: "nameAr",
          existingCategory: existingArabic.nameAr,
        },
        {
          status: 409,
        }
      );
    }

    // ==================================================
    // CREATE CATEGORY
    // ==================================================

    const category = await Category.create({
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      active: true,
    });

    console.log("CATEGORY CREATED:", category._id);

    return NextResponse.json(
      {
        _id: category._id,
        nameEn: category.nameEn,
        nameAr: category.nameAr,
        descriptionEn: category.descriptionEn,
        descriptionAr: category.descriptionAr,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
      {
        status: 201,
      }
    );
  } catch (error: unknown) {
    console.error("CREATE CATEGORY ERROR:", error);

    // ==================================================
    // MONGODB DUPLICATE KEY ERROR
    // ==================================================

    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    if (mongoError?.code === 11000) {
      const field =
        Object.keys(mongoError.keyPattern || {})[0] ||
        Object.keys(mongoError.keyValue || {})[0] ||
        "unknown";

      console.error("DUPLICATE KEY FIELD:", field);
      console.error(
        "DUPLICATE KEY VALUE:",
        mongoError.keyValue
      );

      let message = "Category already exists";

      if (field === "nameEn") {
        message = "English category already exists";
      } else if (field === "nameAr") {
        message = "Arabic category already exists";
      } else {
        message = `Duplicate value detected for: ${field}`;
      }

      return NextResponse.json(
        {
          error: message,
          field,
        },
        {
          status: 409,
        }
      );
    }

    // ==================================================
    // VALIDATION ERROR
    // ==================================================

    if (
      error instanceof Error &&
      error.name === "ValidationError"
    ) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // UNKNOWN ERROR
    // ==================================================

    return NextResponse.json(
      {
        error: "Failed to create category",
      },
      {
        status: 500,
      }
    );
  }
}
