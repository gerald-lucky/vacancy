import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const db = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  try {
    // 1. Fetch report to get file path and affected parks
    const { data: report, error: reportErr } = await db
      .from("weekly_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Get affected park IDs before deleting
    const { data: snapshots } = await db
      .from("vacancy_snapshots")
      .select("park_id")
      .eq("report_id", reportId);

    const affectedParkIds = [...new Set((snapshots ?? []).map((s) => s.park_id))];

    // 3. Delete the report — cascades to vacancy_snapshots and unit_history
    const { error: deleteErr } = await db
      .from("weekly_reports")
      .delete()
      .eq("id", reportId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // 4. Delete file from storage
    await db.storage.from("vacancy-reports").remove([report.file_path]);

    // 5. Re-evaluate current_status for all units in affected parks
    //    based on their most recent remaining unit_history entry
    if (affectedParkIds.length > 0) {
      const { data: affectedUnits } = await db
        .from("units")
        .select("id")
        .in("park_id", affectedParkIds);

      const unitIds = (affectedUnits ?? []).map((u) => u.id);

      if (unitIds.length > 0) {
        // Get the most recent history entry per unit (after the deletion cascade)
        const { data: remainingHistory } = await db
          .from("unit_history")
          .select("unit_id, status, week_date")
          .in("unit_id", unitIds)
          .order("week_date", { ascending: false });

        // Build map: unit_id → most recent status
        const latestStatusMap = new Map<string, "vacant" | "occupied">();
        for (const h of remainingHistory ?? []) {
          if (!latestStatusMap.has(h.unit_id)) {
            latestStatusMap.set(h.unit_id, h.status as "vacant" | "occupied");
          }
        }

        // Batch update: units with remaining history
        const nowVacant = unitIds.filter((id) => latestStatusMap.get(id) === "vacant");
        const nowOccupied = unitIds.filter((id) => latestStatusMap.get(id) !== "vacant");

        const now = new Date().toISOString();
        if (nowVacant.length > 0) {
          await db
            .from("units")
            .update({ current_status: "vacant", updated_at: now })
            .in("id", nowVacant);
        }
        if (nowOccupied.length > 0) {
          await db
            .from("units")
            .update({ current_status: "occupied", updated_at: now })
            .in("id", nowOccupied);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete-report error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
