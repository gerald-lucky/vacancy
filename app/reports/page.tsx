import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteReportButton } from "@/components/DeleteReportButton";
import type { WeeklyReport } from "@/lib/types";
import { formatDate } from "@/lib/utils";

async function getReports(): Promise<WeeklyReport[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_date", { ascending: false });
  return (data ?? []) as WeeklyReport[];
}

export const revalidate = 0;

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report History</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} report{reports.length !== 1 ? "s" : ""} uploaded</p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload New Report
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-500 mb-2">No reports yet</h2>
          <p className="text-gray-400 mb-6">Upload your first weekly vacancy report.</p>
          <Link href="/upload">
            <Button>Upload Report</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {formatDate(report.week_date)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      {report.file_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(report.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {report.processed ? (
                      <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Processed
                      </span>
                    ) : report.error ? (
                      <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium" title={report.error}>
                        <XCircle className="h-4 w-4" />
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-yellow-600 text-xs font-medium">
                        <Clock className="h-4 w-4" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DeleteReportButton
                      reportId={report.id}
                      weekDate={formatDate(report.week_date)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
