import { createClient } from "@supabase/supabase-js";
import type { Park, VacancySnapshot, ParkCardData, MovementEvent } from "@/lib/types";
import { DashboardClient } from "./DashboardClient";

async function getData() {
  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: parks }, { data: snapshots }, { data: movements }] = await Promise.all([
    supabaseServer.from("parks").select("*").order("name"),
    supabaseServer
      .from("vacancy_snapshots")
      .select("*")
      .order("week_date", { ascending: false }),
    // Per-lot transitions: move-ins (→ occupied) and move-outs (→ vacant)
    supabaseServer
      .from("unit_history")
      .select("week_date, changed_to, units(park_id)")
      .not("changed_to", "is", null),
  ]);

  const movementEvents: MovementEvent[] = (movements ?? [])
    .map((m: any) => ({
      week_date: m.week_date as string,
      park_id: m.units?.park_id as string,
      changed_to: m.changed_to as "vacant" | "occupied",
    }))
    .filter((m) => m.park_id);

  return {
    parks: (parks ?? []) as Park[],
    snapshots: (snapshots ?? []) as VacancySnapshot[],
    movements: movementEvents,
  };
}

export const revalidate = 0;

export default async function DashboardPage() {
  const { parks, snapshots, movements } = await getData();

  const parkCardData: ParkCardData[] = parks.map((park) => {
    const parkSnaps = snapshots
      .filter((s) => s.park_id === park.id)
      .sort((a, b) => b.week_date.localeCompare(a.week_date));

    const latest = parkSnaps[0] ?? null;
    const previous = parkSnaps[1] ?? null;

    const total = park.total_lots ?? 0;
    const vacant = latest?.vacant_units ?? 0;
    const pct = total > 0 ? (vacant / total) * 100 : 0;

    const prevVacant = previous?.vacant_units ?? null;
    const prevPct = prevVacant !== null && total > 0 ? (prevVacant / total) * 100 : null;

    const delta = prevVacant !== null ? vacant - prevVacant : null;

    return {
      park,
      total_units: total,
      vacant_units: vacant,
      vacancy_pct: pct,
      prev_vacant_units: prevVacant,
      prev_vacancy_pct: prevPct,
      delta,
    };
  });

  const totalUnits = parkCardData.reduce((s, p) => s + p.total_units, 0);
  const totalVacant = parkCardData.reduce((s, p) => s + p.vacant_units, 0);
  const overallPct = totalUnits > 0 ? ((totalVacant / totalUnits) * 100).toFixed(1) : "0.0";

  return (
    <DashboardClient
      parks={parks}
      snapshots={snapshots}
      movements={movements}
      parkCardData={parkCardData}
      totalUnits={totalUnits}
      totalVacant={totalVacant}
      overallPct={overallPct}
    />
  );
}
