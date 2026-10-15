'use client'

import Link from "next/link"

// styling for the links in the footer
const linkHoverClass = "text-sm hover:text-brand transition-colors duration-300 ease-in-out text-left"

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white p-3">
      <div className="flex flex-row justify-between items-center gap-4 container mx-auto px-6 py-6 text-mute">
        <p className="text-sm">@2026 ClauseGuard</p>
        <nav className="flex flex-row gap-5">
          <Link href="/terms" className={linkHoverClass}>Terms</Link>
          <Link href="/privacy" className={linkHoverClass}>Privacy</Link>
          <Link href="/contact" className={linkHoverClass}>Contact</Link>
          <Link href="/about" className={linkHoverClass}>About</Link>
        </nav>
      </div>
    </footer>
  )
}