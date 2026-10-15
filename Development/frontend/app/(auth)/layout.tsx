import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
            <Link href="/" >
              <Logo />
            </Link>
          </div>
        </header>
        {children}
    </div>
    
  );
}