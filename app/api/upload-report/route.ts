import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const weekDate = formData.get("weekDate") as string | null;

    if (!file || !weekDate) {
      return NextResponse.json({ error: "file and weekDate are required" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
      return NextResponse.json({ error: "weekDate must be in YYYY-MM-DD format" }, { status: 400 });
    }

    // Check for duplicate week
    const { data: existing } = await db
      .from("weekly_reports")
      .select("id")
      .eq("week_date", weekDate)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `A report for ${weekDate} already exists. Delete it first to re-upload.` },
        { status: 409 }
      );
    }

    // Upload to Storage
    const fileName = file.name;
    const filePath = `${weekDate}/${Date.now()}_${fileName}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadErr } = await db.storage
      .from("vacancy-reports")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Create report record
    const { data: report, error: dbErr } = await db
      .from("weekly_reports")
      .insert({ week_date: weekDate, file_path: filePath, file_name: fileName })
      .select()
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
