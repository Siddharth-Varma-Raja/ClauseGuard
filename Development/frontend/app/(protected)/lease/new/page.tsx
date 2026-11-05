"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTour from "@/components/PageTour";
import UploadBox from "@/components/lease/UploadBox";
import { UPLOAD_TOUR } from "@/lib/tours";

export default function NewLeasePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <Link href="/lease" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline">
          <ArrowLeft size={18} />
          Back to my leases
        </Link>
        <PageTour tourId="upload" steps={UPLOAD_TOUR} />
      </div>
      <UploadBox title="Check another lease" highlight="before you sign" subtitle="We read every clause and flag anything that may break Irish tenancy law." />
    </div>
  );
}
