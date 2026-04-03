import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseExcelBuffer, sheetsToText } from "@/lib/excel";
import { parseVacancyReport } from "@/lib/claude";
import { matchParkName } from "@/lib/utils";
import type { UnitType, UnitStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    // 1. Fetch the report record
    const { data: report, error: reportErr } = await supabaseAdmin
      .from("weekly_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Download file from Supabase Storage
    const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
      .from("vacancy-reports")
      .download(report.file_path);

    if (downloadErr || !fileData) {
      await markReportError(reportId, "Failed to download file from storage");
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    // 3. Parse Excel
    const arrayBuffer = await fileData.arrayBuffer();
    const sheets = parseExcelBuffer(arrayBuffer);
    const excelText = sheetsToText(sheets);

    // 4. Call Claude
    const parseResult = await parseVacancyReport(excelText);

    // 5. Fetch all parks for matching
    const { data: allParks } = await supabaseAdmin
      .from("parks")
      .select("id, name, slug");

    if (!allParks) {
      await markReportError(reportId, "Failed to fetch parks");
      return NextResponse.json({ error: "Failed to fetch parks" }, { status: 500 });
    }

    const weekDate = report.week_date;

    // 6. Process each park's units
    for (const claudePark of parseResult.parks) {
      const parkId = matchParkName(claudePark.park_name, allParks);
      if (!parkId) {
        console.warn(`Could not match park: ${claudePark.park_name}`);
        continue;
      }

      // Upsert each unit
      for (const claudeUnit of claudePark.units) {
        const unitData = {
          park_id: parkId,
          lot_number: claudeUnit.lot_number,
          unit_type: claudeUnit.unit_type as UnitType,
          current_status: claudeUnit.status as UnitStatus,
          updated_at: new Date().toISOString(),
        };

        const { data: upsertedUnit, error: upsertErr } = await supabaseAdmin
          .from("units")
          .upsert(unitData, {
            onConflict: "park_id,lot_number",
            ignoreDuplicates: false,
          })
          .select("id, current_status")
          .single();

        if (upsertErr || !upsertedUnit) {
          console.error(`Failed to upsert unit ${claudeUnit.lot_number}:`, upsertErr);
          continue;
        }

        // 7. Fetch previous history to detect changes
        const { data: prevHistory } = await supabaseAdmin
          .from("unit_history")
          .select("status")
          .eq("unit_id", upsertedUnit.id)
          .lt("week_date", weekDate)
          .order("week_date", { ascending: false })
          .limit(1)
          .single();

        const previousStatus = prevHistory?.status ?? null;
        const currentStatus = claudeUnit.status as UnitStatus;
        const changed =
          previousStatus !== null && previousStatus !== currentStatus;

        await supabaseAdmin.from("unit_history").upsert(
          {
            unit_id: upsertedUnit.id,
            report_id: reportId,
            week_date: weekDate,
            status: currentStatus,
            changed_from: changed ? previousStatus : null,
            changed_to: changed ? currentStatus : null,
          },
          { onConflict: "unit_id,week_date" }
        );
      }

      // 8. Build vacancy snapshot for this park
      const totalUnits = claudePark.units.length;
      const vacantUnits = claudePark.units.filter(
        (u) => u.status === "vacant"
      ).length;

      await supabaseAdmin.from("vacancy_snapshots").upsert(
        {
          park_id: parkId,
          report_id: reportId,
          week_date: weekDate,
          total_units: totalUnits,
          vacant_units: vacantUnits,
        },
        { onConflict: "park_id,week_date" }
      );
    }

    // 9. Mark report as processed
    await supabaseAdmin
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

async function markReportError(reportId: string, error: string) {
  await supabaseAdmin
    .from("weekly_reports")
    .update({ error })
    .eq("id", reportId);
}
