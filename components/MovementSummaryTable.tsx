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
  moveIns: number;   // vacancies decreased start→end (lots filled)
  moveOuts: number;  // vacancies increased start→end (new lots vacant)
  startVacant: number;
  endVacant: number;
}

export function MovementSummaryTable({
  parks,
  snapshots,
  startWeek,
  endWeek,
  filterParkId,
}: MovementSummaryTableProps) {
  // Index snapshots by park_id + week_date for O(1) lookup
  const snapIndex = new Map<string, VacancySnapshot>();
  for (const s of snapshots) {
    snapIndex.set(`${s.park_id}:${s.week_date}`, s);
  }

  const rows: ParkMovement[] = parks
    .filter((p) => filterParkId === "all" || p.id === filterParkId)
    .flatMap((park) => {
      const start = snapIndex.get(`${park.id}:${startWeek}`);
      const end = snapIndex.get(`${park.id}:${endWeek}`);

      // Need both endpoints to compute a comparison
      if (!start || !end || startWeek === endWeek) return [];

      const diff = end.vacant_units - start.vacant_units;
      return [{
        park,
        moveIns: diff < 0 ? -diff : 0,
        moveOuts: diff > 0 ? diff : 0,
        startVacant: start.vacant_units,
        endVacant: end.vacant_units,
      }];
    })
    .filter((r) => r.moveIns > 0 || r.moveOuts > 0)
    .sort((a, b) => b.moveOuts - a.moveOuts || b.moveIns - a.moveIns);

  if (startWeek === endWeek) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        Select different start and end weeks to see movement.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-6">
        No vacancy changes between the selected weeks.
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
            <th className="text-right py-2 px-4 font-medium text-gray-400">Vacant (start)</th>
            <th className="text-right py-2 px-4 font-medium text-gray-400">Vacant (end)</th>
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
          {rows.map(({ park, moveIns, moveOuts, startVacant, endVacant }) => (
            <tr key={park.id} className="hover:bg-gray-50">
              <td className="py-2 pr-6 text-gray-800">{park.name}</td>
              <td className="py-2 px-4 text-right text-gray-500">{startVacant}</td>
              <td className="py-2 px-4 text-right text-gray-500">{endVacant}</td>
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
            <td className="py-2 pr-6 font-semibold text-gray-700" colSpan={3}>Total</td>
            <td className="py-2 px-4 text-right font-semibold text-green-700">{totalMoveIns}</td>
            <td className="py-2 pl-4 text-right font-semibold text-red-600">{totalMoveOuts}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
