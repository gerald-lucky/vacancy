import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeParseResult } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a data extraction specialist for mobile home park vacancy reports.
Your job is to parse Excel spreadsheet data and extract structured vacancy information.
You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.`;

const USER_PROMPT_TEMPLATE = `Parse the following mobile home park vacancy report extracted from an Excel file.

IMPORTANT: This is a VACANCY-ONLY report. It lists ONLY vacant units — every unit row you see IS vacant.
The file does NOT list occupied units.

The structure is:
1. A header section (ignore it)
2. Per-park sections, each starting with a header line like:
   "Chef One Mobile Home Park, LLC   Vacant Units: 2 of 51 | Vacancy: 3.92%"
   Followed by rows for each vacant unit:
   "   11   Lot   13801 Chef Menteur Hwy   [comment]   0   154   575.00"
   Columns are: Unit (lot number), Unit Type, Default Address, Comment, Sq. Ft., Days Vacant, Rent Amount
   Followed by a totals row like "Totals for Chef One Mobile Home Park, LLC   ..."
3. A "Summary" section at the very end (ignore it entirely)

Return ONLY valid JSON in this exact schema:
{
  "parks": [
    {
      "park_name": "the property name exactly as it appears in the section header",
      "total_units": 51,
      "vacant_count": 2,
      "vacant_units": [
        {
          "lot_number": "11",
          "unit_type": "lot",
          "days_vacant": 154,
          "rent_amount": 575.00
        }
      ]
    }
  ]
}

Extraction rules:
- park_name: the text before "   Vacant Units:" in the section header line
- total_units: the Y in "Vacant Units: X of Y"
- vacant_count: the X in "Vacant Units: X of Y"
- lot_number: the value in the first column (trim whitespace); use the full identifier as-is (e.g. "11", "C", "B-3", "Rembert Ct. # 10", "Lot 37")
- days_vacant: the 6th column (integer); use 0 if blank or missing
- rent_amount: the 7th column (float); use 0 if blank or missing
- Skip any row that starts with "Totals for"
- Skip the entire "Summary" section and everything after it
- If a park has zero vacant units, still include it with an empty vacant_units array

Unit type mapping (map the Unit Type column to one of these exact values):
- "Lot" → "lot"
- "POH" or "Park Owned Home" or "Park-Owned" → "poh"
- "RV Lot" or "RV Space" or "RV Pad" or "RV" → "rv_lot"
- "Storage" or "Storage Unit" → "storage"
- "Lot / RV Accessible" or "Lot/RV Accessible" or "Lot/RV" or "Lot / RV" → "lot_rv_accessible"
- "Abandoned Home" or "Abandoned" → "abandoned_home"
- "N/A" or anything unclear → "na"

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
