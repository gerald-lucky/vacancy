"use client";

import type { Park, VacancySnapshot } from "@/lib/types";

interface MovementSummaryTableProps {
  parks: Park[];
  snapshots: VacancySnapshot[];
  startWeek: string;
  endWeek: string;
  filterParkId: string;
}

interface ParkMovement {
  park: Park;
  moveIns: number;   // vacancies filled (vacant count decreased week-over-week)
  moveOuts: number;  // new vacancies (vacant count increased week-over-week)
}

export function MovementSummaryTable({
  parks,
  snapshots,
  startWeek,
  endWeek,
  filterParkId,
}: MovementSummaryTableProps) {
  const parkMap = new Map(parks.map((p) => [p.id, p]));

  // For each park, collect snapshots sorted by week within the range
  // We need one week before startWeek as the "previous" baseline for the first comparison
  const parkMoves = new Map<string, { moveIns: number; moveOuts: number }>();

  for (const park of parks) {
    // All snapshots for this park sorted ascending, including the week just before startWeek
    const parkSnaps = snapshots
      .filter((s) => s.park_id === park.id)
      .sort((a, b) => a.week_date.localeCompare(b.week_date));

    let totalMoveIns = 0;
    let totalMoveOuts = 0;

    for (let i = 1; i < parkSnaps.length; i++) {
      const prev = parkSnaps[i - 1];
      const curr = parkSnaps[i];

      // Only count transitions where the current week is within the selected range
      if (curr.week_date < startWeek || curr.week_date > endWeek) continue;

      const diff = curr.vacant_units - prev.vacant_units;
      if (diff > 0) {
        totalMoveOuts += diff; // vacancies increased → people moved out
      } else if (diff < 0) {
        totalMoveIns += -diff; // vacancies decreased → people moved in
      }
    }

    if (totalMoveIns > 0 || totalMoveOuts > 0) {
      parkMoves.set(park.id, { moveIns: totalMoveIns, moveOuts: totalMoveOuts });
    }
  }

  const rows: ParkMovement[] = parks
    .filter((p) => filterParkId === "all" || p.id === filterParkId)
    .map((park) => ({
      park,
      moveIns: parkMoves.get(park.id)?.moveIns ?? 0,
      moveOuts: parkMoves.get(park.id)?.moveOuts ?? 0,
    }))
    .filter((r) => r.moveIns > 0 || r.moveOuts > 0)
    .sort((a, b) => b.moveOuts - a.moveOuts || b.moveIns - a.moveIns);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        No move-ins or move-outs recorded in the selected date range.
        {snapshots.length < 2 && (
          <span className="block mt-1">Upload at least two weekly reports to see changes.</span>
        )}
      </div>
    );
  }

  const totalMoveIns = rows.reduce((s, r) => s + r.moveIns, 0);
  const totalMoveOuts = rows.reduce((s, r) => s + r.moveOuts, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-6 font-medium text-gray-500">Park</th>
            <th className="text-right py-2 px-4 font-medium text-green-700">
              Move-Ins
              <span className="block text-xs font-normal text-gray-400">vacancies filled</span>
            </th>
            <th className="text-right py-2 pl-4 font-medium text-red-600">
              Move-Outs
              <span className="block text-xs font-normal text-gray-400">new vacancies</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(({ park, moveIns, moveOuts }) => (
            <tr key={park.id} className="hover:bg-gray-50">
              <td className="py-2 pr-6 text-gray-800">{park.name}</td>
              <td className="py-2 px-4 text-right">
                {moveIns > 0 ? (
                  <span className="font-medium text-green-700">{moveIns}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-2 pl-4 text-right">
                {moveOuts > 0 ? (
                  <span className="font-medium text-red-600">{moveOuts}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td className="py-2 pr-6 font-semibold text-gray-700">Total</td>
            <td className="py-2 px-4 text-right font-semibold text-green-700">{totalMoveIns}</td>
            <td className="py-2 pl-4 text-right font-semibold text-red-600">{totalMoveOuts}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
