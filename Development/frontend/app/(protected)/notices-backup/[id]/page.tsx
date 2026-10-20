import NoticeResult from "@/components/notices/NoticeResult";
import BackLink from "@/components/ui/BackLink";

type NoticeResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NoticeResultPage({ params }: NoticeResultPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackLink href="/notices" label="Back to Check a notice" />
      <NoticeResult noticeId={id} />
    </main>
  );
}
