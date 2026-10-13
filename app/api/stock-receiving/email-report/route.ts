
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@mazajnuts.com";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { error: "EMAIL_FROM is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const date = String(body.date || "").trim();
    const subject = String(body.subject || "").trim();
    const reportBody = String(body.body || "").trim();

    // Validate report date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return NextResponse.json(
        { error: "Invalid report date." },
        { status: 400 }
      );
    }

    if (!subject || !reportBody) {
      return NextResponse.json(
        { error: "Report subject and body are required." },
        { status: 400 }
      );
    }

    if (reportBody.length > 100_000) {
      return NextResponse.json(
        { error: "Report is too large to email." },
        { status: 413 }
      );
    }

    // Send email directly using Resend.
    // This does not open the user's email application.
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [ADMIN_EMAIL],
          subject,
          text: reportBody,
        }),
        cache: "no-store",
      }
    );

    const resendData = await resendResponse
      .json()
      .catch(() => null);

    if (!resendResponse.ok) {
      console.error("RESEND EMAIL ERROR:", resendData);

      return NextResponse.json(
        {
          error:
            resendData?.message ||
            "Resend could not send the email. Check your sender verification and API key.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Report sent to ${ADMIN_EMAIL}.`,
      emailId: resendData?.id || null,
    });
  } catch (error) {
    console.error("STOCK RECEIVING EMAIL ERROR:", error);

    return NextResponse.json(
      { error: "Failed to send stock receiving report." },
      { status: 500 }
    );
  }
}