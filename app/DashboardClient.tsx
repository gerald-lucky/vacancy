"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { ParkCard } from "@/components/ParkCard";
import { VacancyTrendChart } from "@/components/VacancyTrendChart";
import { MovementSummaryTable } from "@/components/MovementSummaryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Park, VacancySnapshot, ParkCardData } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface DashboardClientProps {
  parks: Park[];
  snapshots: VacancySnapshot[];
  parkCardData: ParkCardData[];
  totalUnits: number;
  totalVacant: number;
  overallPct: string;
}

export function DashboardClient({
  parks,
  snapshots,
  parkCardData,
  totalUnits,
  totalVacant,
  overallPct,
}: DashboardClientProps) {
  const [filterPark, setFilterPark] = useState<string>("all");

  // Sorted unique week dates from snapshots
  const allWeekDates = useMemo(() => {
    return [...new Set(snapshots.map((s) => s.week_date))].sort();
  }, [snapshots]);

  const [startWeek, setStartWeek] = useState<string>(() => allWeekDates[0] ?? "");
  const [endWeek, setEndWeek] = useState<string>(() => allWeekDates[allWeekDates.length - 1] ?? "");

  const filteredCards =
    filterPark === "all"
      ? parkCardData
      : parkCardData.filter((d) => d.park.id === filterPark);

  const filteredParks =
    filterPark === "all" ? parks : parks.filter((p) => p.id === filterPark);

  // Apply both park filter and date range to snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      const inPark = filterPark === "all" || s.park_id === filterPark;
      const inRange = s.week_date >= startWeek && s.week_date <= endWeek;
      return inPark && inRange;
    });
  }, [snapshots, filterPark, startWeek, endWeek]);

  const hasData = parkCardData.some((d) => d.total_units > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacancy Dashboard</h1>
          {hasData && (
            <p className="text-sm text-gray-500 mt-1">
              {totalUnits} total units · {totalVacant} vacant · {overallPct}% overall vacancy
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-56">
            <Select value={filterPark} onValueChange={setFilterPark}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by park" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                {parks.map((park) => (
                  <SelectItem key={park.id} value={park.id}>
                    {park.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Link href="/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Report
            </Button>
          </Link>
        </div>
      </div>

      {!hasData ? (
        /* Empty state */
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-500 mb-2">No data yet</h2>
          <p className="text-gray-400 mb-6">Upload your first weekly vacancy report to get started.</p>
          <Link href="/upload">
            <Button>Upload First Report</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Trend chart + date range */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                Weekly Vacancy Trend
                {filterPark !== "all" ? ` — ${parks.find((p) => p.id === filterPark)?.name}` : ""}
              </h2>
              {allWeekDates.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">From</span>
                  <Select value={startWeek} onValueChange={(v) => {
                    setStartWeek(v);
                    if (v > endWeek) setEndWeek(v);
                  }}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allWeekDates.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {formatDate(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-gray-500">to</span>
                  <Select value={endWeek} onValueChange={(v) => {
                    setEndWeek(v);
                    if (v < startWeek) setStartWeek(v);
                  }}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allWeekDates.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {formatDate(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <VacancyTrendChart
              snapshots={filteredSnapshots}
              parks={filteredParks}
              singlePark={filterPark !== "all"}
            />
          </div>

          {/* Move-ins / Move-outs */}
          {snapshots.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900">Move-Ins & Move-Outs</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Units filled (move-in) or vacated (move-out) in the selected date range
                </p>
              </div>
              <MovementSummaryTable
                parks={parks}
                snapshots={snapshots}
                startWeek={startWeek}
                endWeek={endWeek}
                filterParkId={filterPark}
              />
            </div>
          )}

          {/* Park cards grid */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Parks ({filteredCards.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.map((data) => (
                <ParkCard key={data.park.id} data={data} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
