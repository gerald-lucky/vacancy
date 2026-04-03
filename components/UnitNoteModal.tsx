"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { UnitNote, Unit } from "@/lib/types";
import { UNIT_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface UnitNoteModalProps {
  unit: Unit;
  notes: UnitNote[];
  open: boolean;
  onClose: () => void;
  onNoteSaved: (note: UnitNote) => void;
  onNoteDeleted: (noteId: string) => void;
}

export function UnitNoteModal({
  unit,
  notes,
  open,
  onClose,
  onNoteSaved,
  onNoteDeleted,
}: UnitNoteModalProps) {
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/unit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: unit.id, note: newNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onNoteSaved(json.note);
      setNewNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditNote(noteId: string) {
    if (!editText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/unit-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, note: editText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onNoteSaved(json.note);
      setEditingId(null);
      setEditText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const res = await fetch("/api/unit-notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      onNoteDeleted(noteId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete note");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Lot {unit.lot_number} — {UNIT_TYPE_LABELS[unit.unit_type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-3 bg-gray-50">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEditNote(note.id)} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingId(note.id); setEditText(note.note); }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="new-note">Add a note</Label>
          <Textarea
            id="new-note"
            placeholder="e.g. Tenant moved out 3/28, cleaning scheduled..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleAddNote} disabled={saving || !newNote.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
