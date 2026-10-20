import NoticeForm from "@/components/notices/NoticeForm";
import PastNotices from "@/components/notices/PastNotices";
import BackLink from "@/components/ui/BackLink";
import PageHeader from "@/components/ui/PageHeader";

export default function NoticesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackLink label="Back to dashboard" />
      <PageHeader
        title="Check a notice"
        description="Tell us about a notice you've received and we'll check it against the tenancy rules that applied on the date it was served."
      />
      <NoticeForm />
      <PastNotices />
    </main>
  );
}
