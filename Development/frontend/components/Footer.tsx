'use client'

import Link from "next/link"

// styling for the links in the footer
const linkHoverClass = "text-sm hover:text-white transition-colors duration-300 ease-in-out text-left"

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-4">
      <div className="container mx-auto text-center">
        <div className="flex flex-row justify-between items-center">
            <p className="text-6xl font-semibold text-slate-300 tracking-wider mb-auto">ClauseGuard</p>
            
            <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold text-slate-300 tracking-wider mb-auto">Navigation</p>
                <div className="flex flex-col gap-2">
                    <Link href="/" className={linkHoverClass}>Home</Link>
                    <Link href="/how-it-works" className={linkHoverClass}>How It Works</Link>
                    <Link href="/about" className={linkHoverClass}>About</Link>
                    <Link href="/check-lease" className={linkHoverClass}>Check My Lease</Link>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold text-slate-300 tracking-wider mb-auto">Legal</p>
                <div className="flex flex-col gap-2">
                    <Link href="/privacy-policy" className={linkHoverClass}>Privacy Policy</Link>
                    <Link href="/terms-of-service" className={linkHoverClass}>Terms of Service</Link>
                    <Link href="/disclaimer" className={linkHoverClass}>Disclaimer</Link>
                    <Link href="/contact-us" className={linkHoverClass}>Contact Us</Link>
                </div>
            </div>

            
        </div>
      </div>
    </footer>
  )
}