import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" >
          <Logo />
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-4 py-2 font-semibold text-brand-dark hover:bg-surface"
          >
            Log in
          </Link>

          <ButtonLink
            href="/register"
            size="md"
            className="min-h-11"
          >
            Sign up
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
