import { UploadReport } from "@/components/UploadReport";
import { UploadPageClient } from "./UploadPageClient";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Weekly Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your Excel vacancy report. Claude will automatically parse units and vacancy
          status for each park.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <UploadPageClient />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">What happens when you upload:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Your Excel file is stored securely in Supabase Storage</li>
          <li>Claude reads every sheet and extracts lot numbers, unit types, and vacancy status</li>
          <li>Units are saved or updated in the database</li>
          <li>Weekly vacancy snapshots are created for trend tracking</li>
          <li>Changed units (newly vacant or newly occupied) are recorded</li>
        </ol>
      </div>
    </div>
  );
}
