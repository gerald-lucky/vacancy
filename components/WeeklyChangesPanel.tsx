"use client";

import { useState } from "react";
import { ArrowUpFromLine, ArrowDownToLine, StickyNote } from "lucide-react";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import type { Unit, UnitNote } from "@/lib/types";
import { UnitNoteModal } from "./UnitNoteModal";

interface ChangedUnit extends Unit {
  unit_notes: UnitNote[];
}

interface WeeklyChangesPanelProps {
  vacatedUnits: ChangedUnit[];
  occupiedUnits: ChangedUnit[];
  weekDate: string;
  onNoteUpdate?: (unitId: string, notes: UnitNote[]) => void;
}

export function WeeklyChangesPanel({
  vacatedUnits,
  occupiedUnits,
  weekDate,
  onNoteUpdate,
}: WeeklyChangesPanelProps) {
  const [selectedUnit, setSelectedUnit] = useState<ChangedUnit | null>(null);

  function handleNoteSaved(unitId: string, note: UnitNote) {
    const unit = [...vacatedUnits, ...occupiedUnits].find((u) => u.id === unitId);
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
    const unit = [...vacatedUnits, ...occupiedUnits].find((u) => u.id === unitId);
    if (!unit) return;
    const newNotes = unit.unit_notes.filter((n) => n.id !== noteId);
    onNoteUpdate?.(unitId, newNotes);
    if (selectedUnit?.id === unitId) {
      setSelectedUnit({ ...selectedUnit, unit_notes: newNotes });
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vacated units */}
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-red-600" />
            <h3 className="font-semibold text-red-800 text-sm">
              Became Vacant ({vacatedUnits.length})
            </h3>
          </div>
          {vacatedUnits.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No units vacated this week
            </div>
          ) : (
            <ul className="divide-y divide-red-100">
              {vacatedUnits.map((unit) => (
                <li
                  key={unit.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-red-50/50 cursor-pointer"
                  onClick={() => setSelectedUnit(unit)}
                >
                  <div>
                    <span className="font-mono font-semibold text-gray-900">
                      Lot {unit.lot_number}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {UNIT_TYPE_LABELS[unit.unit_type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unit.unit_notes.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <StickyNote className="h-3.5 w-3.5" />
                        {unit.unit_notes.length}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 hover:text-blue-600">+ note</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Occupied units */}
        <div className="border border-green-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-3 flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-green-600" />
            <h3 className="font-semibold text-green-800 text-sm">
              Got Occupied ({occupiedUnits.length})
            </h3>
          </div>
          {occupiedUnits.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              No units filled this week
            </div>
          ) : (
            <ul className="divide-y divide-green-100">
              {occupiedUnits.map((unit) => (
                <li
                  key={unit.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-green-50/50 cursor-pointer"
                  onClick={() => setSelectedUnit(unit)}
                >
                  <div>
                    <span className="font-mono font-semibold text-gray-900">
                      Lot {unit.lot_number}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {UNIT_TYPE_LABELS[unit.unit_type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unit.unit_notes.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <StickyNote className="h-3.5 w-3.5" />
                        {unit.unit_notes.length}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 hover:text-blue-600">+ note</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
