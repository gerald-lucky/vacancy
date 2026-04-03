import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const { unitId, note } = await request.json();
    if (!unitId || !note?.trim()) {
      return NextResponse.json({ error: "unitId and note are required" }, { status: 400 });
    }
    const { data, error } = await db
      .from("unit_notes")
      .insert({ unit_id: unitId, note: note.trim() })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const { noteId, note } = await request.json();
    if (!noteId || !note?.trim()) {
      return NextResponse.json({ error: "noteId and note are required" }, { status: 400 });
    }
    const { data, error } = await db
      .from("unit_notes")
      .update({ note: note.trim(), updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getSupabaseAdmin();
  try {
    const { noteId } = await request.json();
    if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    const { error } = await db.from("unit_notes").delete().eq("id", noteId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
