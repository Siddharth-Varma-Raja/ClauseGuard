"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageTour from "@/components/PageTour";
import UploadBox from "@/components/lease/UploadBox";
import LoadingState from "@/components/ui/LoadingState";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAnalyses } from "@/lib/api";
import { UPLOAD_TOUR } from "@/lib/tours";

export default function NewLeasePage() {
  const { user } = useAuth();
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const firstName = user?.displayName?.split(" ")[0];

  useEffect(() => {
    let cancelled = false;
    getAnalyses()
      .then((leases) => !cancelled && setIsNewUser(leases.length === 0))
      .catch(() => !cancelled && setIsNewUser(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (isNewUser === null) return <LoadingState label="Getting things ready…" />;

  return (
    <div className="mx-auto max-w-600xl">
      <div className="flex items-center justify-between">
        <Link href={isNewUser ? "/dashboard" : "/lease"} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline max-md:hidden">
          <ArrowLeft size={18} />
          {isNewUser ? "Back to dashboard" : "Back to my leases"}
        </Link>
        <PageTour tourId="upload" steps={UPLOAD_TOUR} />
      </div>
      {isNewUser ? (
        <UploadBox
          title="Check your lease"
          highlight="before you sign"
          subtitle={`Welcome${firstName ? `, ${firstName}` : ""}! Renting in Ireland is stressful. We read every clause and tell you, in plain English, what's fair and what to question.`}
          isNewUser
        />
      ) : (
        <UploadBox title="Check another lease" highlight="before you sign" subtitle="We read every clause and flag anything that may break Irish tenancy law." />
      )}
    </div>
  );
}