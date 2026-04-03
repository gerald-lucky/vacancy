import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { ParkDetailClient } from "./ParkDetailClient";
import type { Park, Unit, VacancySnapshot, UnitNote, UnitHistory } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: park } = await supabase
    .from("parks")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!park) return null;

  const { data: units } = await supabase
    .from("units")
    .select("*, unit_notes(*)")
    .eq("park_id", park.id)
    .order("lot_number");

  const { data: snapshots } = await supabase
    .from("vacancy_snapshots")
    .select("*")
    .eq("park_id", park.id)
    .order("week_date", { ascending: false });

  const latestSnapshot = snapshots?.[0] ?? null;
  let changedHistory: (UnitHistory & { units: Unit & { unit_notes: UnitNote[] } })[] = [];

  if (latestSnapshot) {
    const { data: history } = await supabase
      .from("unit_history")
      .select("*, units!inner(*, unit_notes(*))")
      .eq("report_id", latestSnapshot.report_id)
      .not("changed_to", "is", null);
    changedHistory = (history ?? []) as (UnitHistory & { units: Unit & { unit_notes: UnitNote[] } })[];
  }

  return {
    park: park as Park,
    units: (units ?? []) as (Unit & { unit_notes: UnitNote[] })[],
    snapshots: (snapshots ?? []) as VacancySnapshot[],
    latestSnapshot,
    changedHistory,
  };
}

export const revalidate = 0;

export default async function ParkDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  const { park, units, snapshots, latestSnapshot, changedHistory } = data;

  const vacatedUnits = changedHistory
    .filter((h) => h.changed_to === "vacant")
    .map((h) => h.units);

  const occupiedUnits = changedHistory
    .filter((h) => h.changed_to === "occupied")
    .map((h) => h.units);

  const totalUnits = latestSnapshot?.total_units ?? units.length;
  const vacantUnits = latestSnapshot?.vacant_units ?? units.filter((u) => u.current_status === "vacant").length;
  const vacancyPct = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

  const unitsWithHistory = units.map((unit) => {
    const lastChange = changedHistory.find((h) => h.units.id === unit.id);
    return {
      ...unit,
      last_changed: lastChange?.week_date ?? null,
    };
  });

  return (
    <ParkDetailClient
      park={park}
      units={unitsWithHistory}
      snapshots={snapshots}
      latestSnapshot={latestSnapshot}
      vacatedUnits={vacatedUnits}
      occupiedUnits={occupiedUnits}
      totalUnits={totalUnits}
      vacantUnits={vacantUnits}
      vacancyPct={vacancyPct}
    />
  );
}
