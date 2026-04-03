import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseExcelBuffer, sheetsToText } from "@/lib/excel";
import { parseVacancyReport } from "@/lib/claude";
import { matchParkName } from "@/lib/utils";
import type { UnitType } from "@/lib/types";

export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();

  try {
    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // 1. Fetch the report record
    const { data: report, error: reportErr } = await db
      .from("weekly_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Download file from Supabase Storage
    const { data: fileData, error: downloadErr } = await db.storage
      .from("vacancy-reports")
      .download(report.file_path);

    if (downloadErr || !fileData) {
      await db.from("weekly_reports").update({ error: "Failed to download file from storage" }).eq("id", reportId);
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    // 3. Parse Excel
    const arrayBuffer = await fileData.arrayBuffer();
    const sheets = parseExcelBuffer(arrayBuffer);
    const excelText = sheetsToText(sheets);

    // 4. Call Claude — returns vacancy-only data with total_units from section headers
    const parseResult = await parseVacancyReport(excelText);

    // 5. Fetch all parks for matching
    const { data: allParks } = await db.from("parks").select("id, name, slug");

    if (!allParks) {
      await db.from("weekly_reports").update({ error: "Failed to fetch parks" }).eq("id", reportId);
      return NextResponse.json({ error: "Failed to fetch parks" }, { status: 500 });
    }

    const weekDate = report.week_date;

    // 6. Process each park
    for (const claudePark of parseResult.parks) {
      const parkId = matchParkName(claudePark.park_name, allParks);
      if (!parkId) {
        console.warn(`Could not match park: ${claudePark.park_name}`);
        continue;
      }

      const currentVacantLotNumbers = new Set(
        claudePark.vacant_units.map((u) => u.lot_number.trim())
      );

      // 7. Upsert each currently-vacant unit
      for (const claudeUnit of claudePark.vacant_units) {
        const lotNumber = claudeUnit.lot_number.trim();

        const { data: upsertedUnit, error: upsertErr } = await db
          .from("units")
          .upsert(
            {
              park_id: parkId,
              lot_number: lotNumber,
              unit_type: claudeUnit.unit_type as UnitType,
              current_status: "vacant",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "park_id,lot_number", ignoreDuplicates: false }
          )
          .select("id, current_status")
          .single();

        if (upsertErr || !upsertedUnit) {
          console.error(`Failed to upsert unit ${lotNumber}:`, upsertErr);
          continue;
        }

        // Detect if this unit was previously occupied (status transition)
        const { data: prevHistory } = await db
          .from("unit_history")
          .select("status")
          .eq("unit_id", upsertedUnit.id)
          .lt("week_date", weekDate)
          .order("week_date", { ascending: false })
          .limit(1)
          .single();

        const previousStatus = prevHistory?.status ?? null;
        const changed = previousStatus !== null && previousStatus !== "vacant";

        await db.from("unit_history").upsert(
          {
            unit_id: upsertedUnit.id,
            report_id: reportId,
            week_date: weekDate,
            status: "vacant",
            changed_from: changed ? previousStatus : null,
            changed_to: changed ? "vacant" : null,
          },
          { onConflict: "unit_id,week_date" }
        );
      }

      // 8. Mark units that were previously vacant but are NOT in this report as occupied
      const { data: previouslyVacantUnits } = await db
        .from("units")
        .select("id, lot_number")
        .eq("park_id", parkId)
        .eq("current_status", "vacant");

      if (previouslyVacantUnits) {
        for (const unit of previouslyVacantUnits) {
          if (!currentVacantLotNumbers.has(unit.lot_number)) {
            // This unit was vacant before but is not in the current report → now occupied
            await db
              .from("units")
              .update({ current_status: "occupied", updated_at: new Date().toISOString() })
              .eq("id", unit.id);

            await db.from("unit_history").upsert(
              {
                unit_id: unit.id,
                report_id: reportId,
                week_date: weekDate,
                status: "occupied",
                changed_from: "vacant",
                changed_to: "occupied",
              },
              { onConflict: "unit_id,week_date" }
            );
          }
        }
      }

      // 9. Vacancy snapshot — use counts directly from Claude (parsed from section header)
      await db.from("vacancy_snapshots").upsert(
        {
          park_id: parkId,
          report_id: reportId,
          week_date: weekDate,
          total_units: claudePark.total_units,
          vacant_units: claudePark.vacant_count,
        },
        { onConflict: "park_id,week_date" }
      );
    }

    // 10. Mark processed
    await db
      .from("weekly_reports")
      .update({ processed: true, processed_at: new Date().toISOString(), error: null })
      .eq("id", reportId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("process-report error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
