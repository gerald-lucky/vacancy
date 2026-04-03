import * as XLSX from "xlsx";

export interface SheetData {
  sheetName: string;
  rows: string[][];
}

/**
 * Parse an Excel file buffer into structured sheet data.
 * Returns an array of sheets, each with a name and rows (array of cell values).
 */
export function parseExcelBuffer(buffer: ArrayBuffer): SheetData[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: SheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][];

    // Filter out completely empty rows
    const filteredRows = rows.filter((row) =>
      row.some((cell) => String(cell).trim() !== "")
    );

    if (filteredRows.length > 0) {
      sheets.push({ sheetName, rows: filteredRows });
    }
  }

  return sheets;
}

/**
 * Convert sheet data to a readable text representation for Claude.
 */
export function sheetsToText(sheets: SheetData[]): string {
  return sheets
    .map((sheet) => {
      const header = `=== Sheet: ${sheet.sheetName} ===`;
      const rows = sheet.rows
        .map((row) => row.map((cell) => String(cell).trim()).join("\t"))
        .join("\n");
      return `${header}\n${rows}`;
    })
    .join("\n\n");
}
