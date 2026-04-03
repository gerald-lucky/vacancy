"use client";

import { useState } from "react";
import { MessageSquarePlus, StickyNote } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import type { Unit, UnitNote } from "@/lib/types";
import { UnitNoteModal } from "./UnitNoteModal";
import { Badge } from "@/components/ui/badge";

interface UnitRow extends Unit {
  unit_notes: UnitNote[];
  last_changed?: string | null;
}

interface UnitTableProps {
  units: UnitRow[];
  onNoteUpdate?: (unitId: string, notes: UnitNote[]) => void;
}

export function UnitTable({ units, onNoteUpdate }: UnitTableProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);

  function handleNoteSaved(unitId: string, note: UnitNote) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    const existing = unit.unit_notes.find((n) => n.id === note.id);
    const newNotes = existing
      ? unit.unit_notes.map((n) => (n.id === note.id ? note : n))
      : [note, ...unit.unit_notes];
    onNoteUpdate?.(unitId, newNotes);
    if (selectedUnit?.id === unitId) {
      setSelectedUnit({ ...selectedUnit, unit_notes: newNotes });
    }
  }

  function handleNoteDeleted(unitId: string, noteId: string) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    const newNotes = unit.unit_notes.filter((n) => n.id !== noteId);
    onNoteUpdate?.(unitId, newNotes);
    if (selectedUnit?.id === unitId) {
      setSelectedUnit({ ...selectedUnit, unit_notes: newNotes });
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                Lot #
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                Last Changed
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                Notes
              </th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {units.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No units found.
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr
                  key={unit.id}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    unit.current_status === "vacant" && "bg-red-50/40"
                  )}
                >
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {unit.lot_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {UNIT_TYPE_LABELS[unit.unit_type]}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={unit.current_status === "occupied" ? "success" : "destructive"}
                      className={cn(
                        unit.current_status === "vacant"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-green-100 text-green-700 border-green-200"
                      )}
                    >
                      {unit.current_status === "occupied" ? "Occupied" : "Vacant"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {unit.last_changed ? formatDate(unit.last_changed) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {unit.unit_notes.length > 0 ? (
                      <button
                        onClick={() => setSelectedUnit(unit)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                        {unit.unit_notes.length}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUnit(unit)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Add/view notes"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUnit && (
        <UnitNoteModal
          unit={selectedUnit}
          notes={selectedUnit.unit_notes}
          open={!!selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onNoteSaved={(note) => handleNoteSaved(selectedUnit.id, note)}
          onNoteDeleted={(noteId) => handleNoteDeleted(selectedUnit.id, noteId)}
        />
      )}
    </>
  );
}
