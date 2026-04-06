import { createClient } from "@supabase/supabase-js";
import type { Park, VacancySnapshot, ParkCardData } from "@/lib/types";
import { DashboardClient } from "./DashboardClient";

async function getData() {
  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: parks }, { data: snapshots }] = await Promise.all([
    supabaseServer.from("parks").select("*").order("name"),
    supabaseServer
      .from("vacancy_snapshots")
      .select("*")
      .order("week_date", { ascending: false }),
  ]);

  return {
    parks: (parks ?? []) as Park[],
    snapshots: (snapshots ?? []) as VacancySnapshot[],
  };
}

export const revalidate = 0;

export default async function DashboardPage() {
  const { parks, snapshots } = await getData();

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
      parkCardData={parkCardData}
      totalUnits={totalUnits}
      totalVacant={totalVacant}
      overallPct={overallPct}
    />
  );
}
