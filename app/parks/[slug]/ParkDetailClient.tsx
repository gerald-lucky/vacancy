"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Building2 } from "lucide-react";
import { VacancyTrendChart } from "@/components/VacancyTrendChart";
import { WeeklyChangesPanel } from "@/components/WeeklyChangesPanel";
import { UnitTable } from "@/components/UnitTable";
import { cn, formatPct, formatDate } from "@/lib/utils";
import type { Park, Unit, VacancySnapshot, UnitNote } from "@/lib/types";

interface UnitWithHistory extends Unit {
  unit_notes: UnitNote[];
  last_changed: string | null;
}

interface ParkDetailClientProps {
  park: Park;
  units: UnitWithHistory[];
  snapshots: VacancySnapshot[];
  latestSnapshot: VacancySnapshot | null;
  vacatedUnits: (Unit & { unit_notes: UnitNote[] })[];
  occupiedUnits: (Unit & { unit_notes: UnitNote[] })[];
  totalUnits: number;
  vacantUnits: number;
  vacancyPct: number;
}

export function ParkDetailClient({
  park,
  units,
  snapshots,
  latestSnapshot,
  vacatedUnits,
  occupiedUnits,
  totalUnits,
  vacantUnits,
  vacancyPct,
}: ParkDetailClientProps) {
  const [unitList, setUnitList] = useState(units);
  const [vacated, setVacated] = useState(vacatedUnits);
  const [occupied, setOccupied] = useState(occupiedUnits);
  const [statusFilter, setStatusFilter] = useState<"all" | "vacant" | "occupied">("all");

  function handleNoteUpdate(unitId: string, notes: UnitNote[]) {
    setUnitList((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, unit_notes: notes } : u))
    );
    setVacated((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, unit_notes: notes } : u))
    );
    setOccupied((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, unit_notes: notes } : u))
    );
  }

  const filteredUnits = unitList.filter((u) => {
    if (statusFilter === "all") return true;
    return u.current_status === statusFilter;
  });

  return (
    <div className="space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-start gap-3">
          <Building2 className="h-8 w-8 text-blue-500 mt-1 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{park.name}</h1>
            {latestSnapshot && (
              <p className="text-sm text-gray-500 mt-1">
                Week of {formatDate(latestSnapshot.week_date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalUnits}</div>
          <div className="text-xs text-gray-500 mt-1">Total Units</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{totalUnits - vacantUnits}</div>
          <div className="text-xs text-gray-500 mt-1">Occupied</div>
        </div>
        <div className={cn(
          "rounded-xl border p-4 text-center",
          vacantUnits > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
        )}>
          <div className={cn("text-2xl font-bold", vacantUnits > 0 ? "text-red-600" : "text-green-700")}>
            {vacantUnits}
          </div>
          <div className="text-xs text-gray-500 mt-1">Vacant</div>
        </div>
        <div className={cn(
          "rounded-xl border p-4 text-center",
          vacancyPct > 10 ? "bg-red-50 border-red-200" : vacancyPct > 5 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"
        )}>
          <div className={cn(
            "text-2xl font-bold",
            vacancyPct > 10 ? "text-red-600" : vacancyPct > 5 ? "text-yellow-600" : "text-green-700"
          )}>
            {formatPct(vacancyPct)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Vacancy Rate</div>
        </div>
      </div>

      {/* Trend chart */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Vacancy Trend</h2>
          <VacancyTrendChart snapshots={snapshots} parks={[park]} singlePark />
        </div>
      )}

      {/* Weekly changes */}
      {(vacated.length > 0 || occupied.length > 0) && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">This Week&apos;s Changes</h2>
          <WeeklyChangesPanel
            vacatedUnits={vacated}
            occupiedUnits={occupied}
            weekDate={latestSnapshot?.week_date ?? ""}
            onNoteUpdate={handleNoteUpdate}
          />
        </div>
      )}

      {/* Unit table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            All Units ({filteredUnits.length})
          </h2>
          <div className="flex gap-2">
            {(["all", "occupied", "vacant"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  statusFilter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <UnitTable units={filteredUnits} onNoteUpdate={handleNoteUpdate} />
      </div>
    </div>
  );
}
