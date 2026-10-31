import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MarketplaceLink from "@/models/MarketplaceLink";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await connectDB(); return NextResponse.json(await MarketplaceLink.find().lean()); }
  catch (error) { console.error(error); return NextResponse.json({ error: "Could not load marketplace links." }, { status: 500 }); }
}
export async function PUT(request: NextRequest) {
  try {
    await connectDB(); const body = await request.json();
    const allowed = ["Talabat", "Snoonu", "Rafeeq", "Keeta", "Direct"];
    if (!Array.isArray(body.links)) return NextResponse.json({ error: "Links must be an array." }, { status: 400 });
    const operations = body.links.filter((x: {platform?: string; url?: string}) => allowed.includes(String(x.platform))).map((x: {platform: string; url?: string}) => {
      const url = String(x.url || "").trim();
      if (url && !/^https:\/\//i.test(url)) throw new Error("Marketplace URLs must start with https://");
      return { updateOne: { filter: { platform: x.platform }, update: { $set: { url } }, upsert: true } };
    });
    if (operations.length) await MarketplaceLink.bulkWrite(operations);
    return NextResponse.json(await MarketplaceLink.find().lean());
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save links." }, { status: 400 }); }
}
