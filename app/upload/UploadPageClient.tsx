"use client";

import { useRouter } from "next/navigation";
import { UploadReport } from "@/components/UploadReport";

export function UploadPageClient() {
  const router = useRouter();

  return (
    <UploadReport
      onComplete={() => {
        setTimeout(() => router.push("/"), 1500);
      }}
    />
  );
}
