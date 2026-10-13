
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "admin@mazajnuts.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const smtpError = error as Error & {
      code?: string;
      command?: string;
      responseCode?: number;
      response?: string;
    };

    return {
      message: smtpError.message,
      code: smtpError.code ?? null,
      command: smtpError.command ?? null,
      responseCode: smtpError.responseCode ?? null,
      response: smtpError.response ?? null,
    };
  }

  return {
    message: "Unknown error",
    code: null,
    command: null,
    responseCode: null,
    response: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const smtpHost = process.env.ZOHO_SMTP_HOST;
    const smtpPort = Number(process.env.ZOHO_SMTP_PORT || 465);
    const senderEmail = process.env.ZOHO_EMAIL;
    const appPassword = process.env.ZOHO_APP_PASSWORD;

    if (!smtpHost || !senderEmail || !appPassword) {
      console.error("Zoho SMTP configuration is incomplete.");

      return NextResponse.json(
        {
          success: false,
          error:
            "Zoho SMTP configuration is missing. Check your Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    if (!Number.isInteger(smtpPort) || ![465, 587].includes(smtpPort)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Zoho SMTP port. Use 465 or 587.",
        },
        { status: 500 }
      );
    }

    const data = await request.json();

    const date =
      typeof data.date === "string" ? data.date.trim() : "";

    const subject =
      typeof data.subject === "string" ? data.subject.trim() : "";

    const body =
      typeof data.body === "string" ? data.body.trim() : "";

    if (!date || !subject || !body) {
      return NextResponse.json(
        {
          success: false,
          error: "Date, subject, and report body are required.",
        },
        { status: 400 }
      );
    }

    if (
      date.length > 100 ||
      subject.length > 250 ||
      body.length > 50000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The report is too long.",
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: senderEmail,
        pass: appPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    try {
      await transporter.verify();
    } catch (error) {
      const details = getErrorDetails(error);

      console.error("ZOHO SMTP VERIFY ERROR", details);

      return NextResponse.json(
        {
          success: false,
          error: "Zoho SMTP connection or authentication failed.",
          code: details.code,
          responseCode: details.responseCode,
          details:
            process.env.NODE_ENV === "development"
              ? details.message
              : "Check Vercel function logs for ZOHO SMTP VERIFY ERROR.",
        },
        { status: 502 }
      );
    }

    const safeDate = escapeHtml(date);
    const safeSubject = escapeHtml(subject);
    const safeBody = escapeHtml(body);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
          <h2>Stock Receiving Report</h2>
          <p><strong>Report Date:</strong> ${safeDate}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <hr />
          <div style="white-space: pre-wrap;">${safeBody}</div>
          <hr />
          <p style="font-size: 12px; color: #777;">
            Sent automatically from Mazaj Control Dashboard.
          </p>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: {
        name: "Mazaj Control Dashboard",
        address: senderEmail,
      },
      to: ADMIN_EMAIL,
      subject,
      text: `Stock Receiving Report\nDate: ${date}\n\n${body}`,
      html,
    });

    console.log("Stock Receiving Report email sent:", {
      messageId: result.messageId,
      to: ADMIN_EMAIL,
    });

    return NextResponse.json({
      success: true,
      message: "Stock Receiving Report emailed successfully.",
      recipient: ADMIN_EMAIL,
    });
  } catch (error) {
    const details = getErrorDetails(error);

    console.error("ZOHO SMTP ERROR", details);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send Stock Receiving Report email.",
        code: details.code,
        responseCode: details.responseCode,
        details:
          process.env.NODE_ENV === "development"
            ? details.message
            : "Check Vercel function logs for ZOHO SMTP ERROR.",
      },
      { status: 500 }
    );
  }
}