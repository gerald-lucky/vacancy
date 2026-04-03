import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const weekDate = formData.get("weekDate") as string | null;

    if (!file || !weekDate) {
      return NextResponse.json(
        { error: "file and weekDate are required" },
        { status: 400 }
      );
    }

    // Validate week date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
      return NextResponse.json(
        { error: "weekDate must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Check for duplicate week
    const { data: existing } = await supabaseAdmin
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

    // Upload file to Supabase Storage
    const fileName = file.name;
    const filePath = `${weekDate}/${Date.now()}_${fileName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("vacancy-reports")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    // Create weekly_reports record
    const { data: report, error: dbErr } = await supabaseAdmin
      .from("weekly_reports")
      .insert({
        week_date: weekDate,
        file_path: filePath,
        file_name: fileName,
      })
      .select()
      .single();

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
