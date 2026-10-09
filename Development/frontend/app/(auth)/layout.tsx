import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div>
      <nav className="flex justify-between items-center px-6 py-4 bg-white text-black">
        <Link href="/" className="text-xl font-bold"><span className="text-[var(--primary)] ">Clause</span>Guard</Link>
      </nav>
        {children}
    </div>
  );
}
