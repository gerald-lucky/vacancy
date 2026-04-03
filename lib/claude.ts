import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeParseResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a data extraction specialist for mobile home park vacancy reports.
Your job is to parse Excel spreadsheet data and extract structured vacancy information.
You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.`;

const USER_PROMPT_TEMPLATE = `Parse the following mobile home park vacancy report data extracted from an Excel file.

Extract all units for each property and return ONLY valid JSON in this exact schema:
{
  "parks": [
    {
      "park_name": "the property name exactly as it appears in the report",
      "units": [
        {
          "lot_number": "the lot or unit identifier (e.g. '101', 'A-5', 'LOT 12')",
          "unit_type": "one of: lot, poh, rv_lot, storage, lot_rv_accessible, abandoned_home, na",
          "status": "occupied or vacant"
        }
      ]
    }
  ]
}

Unit type mapping rules:
- "lot" → lot (standard residential lot)
- "poh", "park owned", "park owned home", "park-owned" → poh
- "rv", "rv lot", "rv space", "rv pad" → rv_lot
- "storage", "storage unit", "storage shed" → storage
- "lot/rv", "lot rv", "rv accessible", "lot/rv accessible" → lot_rv_accessible
- "abandoned", "abandoned home", "demo" → abandoned_home
- anything unclear or not applicable → na

Status rules:
- vacant if the unit is empty, available, open, unoccupied, or listed as a vacancy
- occupied if someone lives there / it is rented / filled

Critical rules:
- Include ALL units in the report, not just vacant ones
- Do not include header rows, summary rows, total rows, or footer rows
- If a sheet contains multiple parks, split them into separate park entries
- The lot_number is the identifier for the individual unit/space/lot
- If park name is unclear, use the sheet name as the park name

Excel data:
{EXCEL_TEXT}`;

export async function parseVacancyReport(
  excelText: string
): Promise<ClaudeParseResult> {
  const prompt = USER_PROMPT_TEMPLATE.replace("{EXCEL_TEXT}", excelText);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Strip any accidental markdown fences
  let text = content.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }

  const result = JSON.parse(text) as ClaudeParseResult;
  return result;
}
