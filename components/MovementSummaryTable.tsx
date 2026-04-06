"use client";

import type { Park, MovementEvent } from "@/lib/types";

interface MovementSummaryTableProps {
  parks: Park[];
  movements: MovementEvent[];
  startWeek: string;
  endWeek: string;
  filterParkId: string;
}

interface ParkMovement {
  park: Park;
  moveIns: number;   // lots that disappeared from vacant list (vacancy filled → someone moved in)
  moveOuts: number;  // lots that newly appeared as vacant (someone moved out)
}

export function MovementSummaryTable({
  parks,
  movements,
  startWeek,
  endWeek,
  filterParkId,
}: MovementSummaryTableProps) {
  // Filter to the selected date range
  const filtered = movements.filter(
    (m) => m.week_date >= startWeek && m.week_date <= endWeek
  );

  // Aggregate per park
  const counts = new Map<string, { moveIns: number; moveOuts: number }>();
  for (const m of filtered) {
    if (!counts.has(m.park_id)) {
      counts.set(m.park_id, { moveIns: 0, moveOuts: 0 });
    }
    const c = counts.get(m.park_id)!;
    if (m.changed_to === "occupied") {
      c.moveIns++;   // lot left the vacant list → someone moved in
    } else {
      c.moveOuts++;  // lot newly appeared as vacant → someone moved out
    }
  }

  const rows: ParkMovement[] = parks
    .filter((p) => filterParkId === "all" || p.id === filterParkId)
    .map((park) => ({
      park,
      moveIns: counts.get(park.id)?.moveIns ?? 0,
      moveOuts: counts.get(park.id)?.moveOuts ?? 0,
    }))
    .filter((r) => r.moveIns > 0 || r.moveOuts > 0)
    .sort((a, b) => b.moveOuts - a.moveOuts || b.moveIns - a.moveIns);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        No lot changes recorded in the selected date range.
        {movements.length === 0 && (
          <span className="block mt-1 text-xs">
            Upload at least two weekly reports to see move-in/move-out tracking.
          </span>
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
              <span className="block text-xs font-normal text-gray-400">lot left vacant list</span>
            </th>
            <th className="text-right py-2 pl-4 font-medium text-red-600">
              Move-Outs
              <span className="block text-xs font-normal text-gray-400">lot appeared as vacant</span>
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
