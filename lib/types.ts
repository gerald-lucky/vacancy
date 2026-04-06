export type UnitType =
  | "lot"
  | "poh"
  | "rv_lot"
  | "storage"
  | "lot_rv_accessible"
  | "abandoned_home"
  | "na";

export type UnitStatus = "occupied" | "vacant";

export interface Park {
  id: string;
  name: string;
  slug: string;
  total_lots: number;
  created_at: string;
}

export interface Unit {
  id: string;
  park_id: string;
  lot_number: string;
  unit_type: UnitType;
  current_status: UnitStatus;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReport {
  id: string;
  week_date: string;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
}

export interface VacancySnapshot {
  id: string;
  park_id: string;
  report_id: string;
  week_date: string;
  total_units: number;
  vacant_units: number;
}

export interface UnitHistory {
  id: string;
  unit_id: string;
  report_id: string;
  week_date: string;
  status: UnitStatus;
  changed_from: UnitStatus | null;
  changed_to: UnitStatus | null;
  created_at: string;
}

export interface UnitNote {
  id: string;
  unit_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

// Enriched types for UI

export interface UnitWithNotes extends Unit {
  unit_notes: UnitNote[];
  parks?: Park;
}

export interface UnitHistoryWithUnit extends UnitHistory {
  units: Unit & { parks: Park };
}

export interface ParkWithSnapshot extends Park {
  latest_snapshot: VacancySnapshot | null;
  previous_snapshot: VacancySnapshot | null;
}

export interface ParkCardData {
  park: Park;
  total_units: number;
  vacant_units: number;
  vacancy_pct: number;
  prev_vacant_units: number | null;
  prev_vacancy_pct: number | null;
  delta: number | null; // positive = went up (bad), negative = went down (good)
}

// Claude parsing output
// The Excel file is a vacancy-only report — only vacant units are listed.
// Total unit counts come from the park section header.
export interface ClaudeVacantUnit {
  lot_number: string;
  unit_type: UnitType;
  days_vacant: number;
  rent_amount: number;
}

export interface ClaudePark {
  park_name: string;
  total_units: number;
  vacant_count: number;
  vacant_units: ClaudeVacantUnit[];
}

export interface ClaudeParseResult {
  parks: ClaudePark[];
}

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  lot: "Lot",
  poh: "POH",
  rv_lot: "RV Lot",
  storage: "Storage",
  lot_rv_accessible: "Lot/RV Accessible",
  abandoned_home: "Abandoned Home",
  na: "N/A",
};
