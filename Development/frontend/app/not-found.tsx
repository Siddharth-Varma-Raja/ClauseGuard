"use client";

import { FileQuestion } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Card from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function NotFound() {  
  const { user } = useAuth();
  
  return (
    <>
<header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={user ? "/dashboard" : "/"} >
          <Logo />
        </Link>
      </div>
    </header>
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-4">
      

      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
          <FileQuestion size={36} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-brand-dark">We couldn't find that page</h1>
        <p className="mt-2 text-mute">The page you are looking for doesn't exist</p>
        <ButtonLink href={user ? "/dashboard" : "/"} className="mt-6">
          Back to ClauseGuard
        </ButtonLink>
      </Card>
    </main>
    </>
  );
}
