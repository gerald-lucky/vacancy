import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { parseExcelBuffer, sheetsToText } from "@/lib/excel";
import { parseVacancyReport } from "@/lib/claude";
import { matchParkName } from "@/lib/utils";
import type { UnitType } from "@/lib/types";

// Allow up to 5 minutes on Vercel (Pro plan max)
export const maxDuration = 300;

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

    // 5. Fetch all parks for matching (select * so missing columns don't cause errors)
    const { data: allParks, error: parksErr } = await db.from("parks").select("*");

    if (parksErr || !allParks) {
      await db.from("weekly_reports").update({ error: `Failed to fetch parks: ${parksErr?.message}` }).eq("id", reportId);
      return NextResponse.json({ error: "Failed to fetch parks" }, { status: 500 });
    }

    const weekDate = report.week_date;
    const now = new Date().toISOString();

    const parkLookup = new Map(allParks.map((p) => [p.id, p]));

    // 6. Process each park with batched DB operations (O(5) per park instead of O(N))
    for (const claudePark of parseResult.parks) {
      const parkId = matchParkName(claudePark.park_name, allParks);
      if (!parkId) {
        console.warn(`Could not match park: ${claudePark.park_name}`);
        continue;
      }
      const park = parkLookup.get(parkId)!;

      // Step A: Fetch all currently-known units for this park in one query
      const { data: existingUnits } = await db
        .from("units")
        .select("id, lot_number, current_status")
        .eq("park_id", parkId);

      const existingMap = new Map(
        (existingUnits ?? []).map((u) => [u.lot_number, u])
      );

      // If existingMap has entries, this park has prior report data.
      // Any lot appearing as vacant for the first time (not in existingMap) is a move-out
      // (it was occupied last week and just became vacant).
      // If existingMap is empty, this is the first-ever report — no transitions to record.
      const isFirstReport = existingMap.size === 0;

      const newVacantLotNumbers = new Set(
        claudePark.vacant_units.map((u) => u.lot_number.trim())
      );

      // Units previously tracked as vacant but absent from this report → move-in (vacancy filled)
      const nowOccupied = (existingUnits ?? []).filter(
        (u) => u.current_status === "vacant" && !newVacantLotNumbers.has(u.lot_number)
      );

      // Step B: Batch upsert all vacant units for this park
      const vacantRows = claudePark.vacant_units.map((u) => ({
        park_id: parkId,
        lot_number: u.lot_number.trim(),
        unit_type: u.unit_type as UnitType,
        current_status: "vacant" as const,
        updated_at: now,
      }));

      let upsertedVacant: { id: string; lot_number: string }[] = [];
      if (vacantRows.length > 0) {
        const { data, error } = await db
          .from("units")
          .upsert(vacantRows, { onConflict: "park_id,lot_number", ignoreDuplicates: false })
          .select("id, lot_number");
        if (error) {
          console.error(`Failed to batch upsert units for ${claudePark.park_name}:`, error);
        } else {
          upsertedVacant = data ?? [];
        }
      }

      const upsertedMap = new Map(upsertedVacant.map((u) => [u.lot_number, u.id]));

      // Step C: Batch update now-occupied units in one query
      if (nowOccupied.length > 0) {
        const ids = nowOccupied.map((u) => u.id);
        await db
          .from("units")
          .update({ current_status: "occupied", updated_at: now })
          .in("id", ids);
      }

      // Step D: Build all unit_history rows in memory, then batch upsert
      const historyRows: {
        unit_id: string;
        report_id: string;
        week_date: string;
        status: "vacant" | "occupied";
        changed_from: "vacant" | "occupied" | null;
        changed_to: "vacant" | "occupied" | null;
      }[] = [];

      for (const u of claudePark.vacant_units) {
        const lot = u.lot_number.trim();
        const unitId = upsertedMap.get(lot);
        if (!unitId) continue;

        const existing = existingMap.get(lot);
        const prevStatus = existing?.current_status ?? null;

        // Move-out = lot is vacant this week AND was occupied before:
        //   - prevStatus === "occupied": was explicitly tracked as occupied
        //   - prevStatus === null && !isFirstReport: lot never seen before,
        //     meaning it was occupied in all prior weeks → just became vacant
        const isMoveOut =
          (prevStatus !== null && prevStatus !== "vacant") ||
          (prevStatus === null && !isFirstReport);

        historyRows.push({
          unit_id: unitId,
          report_id: reportId,
          week_date: weekDate,
          status: "vacant",
          changed_from: isMoveOut ? "occupied" : null,
          changed_to: isMoveOut ? "vacant" : null,
        });
      }

      for (const u of nowOccupied) {
        historyRows.push({
          unit_id: u.id,
          report_id: reportId,
          week_date: weekDate,
          status: "occupied",
          changed_from: "vacant",
          changed_to: "occupied",
        });
      }

      if (historyRows.length > 0) {
        await db
          .from("unit_history")
          .upsert(historyRows, { onConflict: "unit_id,week_date" });
      }

      // Step E: Upsert vacancy snapshot using counts from Claude's header parsing
      await db.from("vacancy_snapshots").upsert(
        {
          park_id: parkId,
          report_id: reportId,
          week_date: weekDate,
          total_units: park.total_lots,
          vacant_units: claudePark.vacant_count,
        },
        { onConflict: "park_id,week_date" }
      );
    }

    // 7. Mark processed
    await db
      .from("weekly_reports")
      .update({ processed: true, processed_at: now, error: null })
      .eq("id", reportId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("process-report error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
