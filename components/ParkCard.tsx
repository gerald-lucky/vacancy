import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, Building2 } from "lucide-react";
import { cn, formatPct } from "@/lib/utils";
import type { ParkCardData } from "@/lib/types";

interface ParkCardProps {
  data: ParkCardData;
}

export function ParkCard({ data }: ParkCardProps) {
  const { park, total_units, vacant_units, vacancy_pct, delta } = data;
  const occupancy_pct = 100 - vacancy_pct;

  const deltaDisplay = (() => {
    if (delta === null) return null;
    if (delta === 0) return { icon: Minus, label: "No change", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" };
    if (delta > 0) return {
      icon: TrendingUp,
      label: `+${delta} units`,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    };
    return {
      icon: TrendingDown,
      label: `${delta} units`,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
    };
  })();

  return (
    <Link href={`/parks/${park.slug}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
              {park.name}
            </h3>
          </div>
          {deltaDisplay && (
            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium shrink-0", deltaDisplay.bg, deltaDisplay.color)}>
              <deltaDisplay.icon className="h-3 w-3" />
              <span>{deltaDisplay.label}</span>
            </div>
          )}
        </div>

        {/* Vacancy bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Occupied</span>
            <span>Vacant</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${occupancy_pct}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900">{total_units}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700">{total_units - vacant_units}</div>
            <div className="text-xs text-gray-500">Occupied</div>
          </div>
          <div className={cn("rounded-lg p-2", vacant_units > 0 ? "bg-red-50" : "bg-green-50")}>
            <div className={cn("text-lg font-bold", vacant_units > 0 ? "text-red-600" : "text-green-700")}>
              {vacant_units}
            </div>
            <div className="text-xs text-gray-500">Vacant</div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className={cn(
            "text-sm font-semibold",
            vacancy_pct > 10 ? "text-red-600" : vacancy_pct > 5 ? "text-yellow-600" : "text-green-600"
          )}>
            {formatPct(vacancy_pct)} vacancy
          </span>
        </div>
      </div>
    </Link>
  );
}
