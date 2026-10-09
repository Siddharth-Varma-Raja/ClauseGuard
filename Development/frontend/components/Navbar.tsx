'use client'

import Link from "next/link";
import GlobalStyles from "../styles/globals.css";

const linkHoverClass = "hover:text-[var(--primary-hover)] transition-colors duration-100 ease-in-out"

export default function Navbar() {
return(
    <nav className="flex justify-between items-center px-6 py-4 bg-white text-black">
        <Link href="/" className="text-xl font-bold"><span className="text-[var(--primary)] ">Clause</span>Guard</Link>

        <div className="flex gap-6 items-center text-sm text-slate-600">
        <Link href="/" className={linkHoverClass}>Home</Link>
        <Link href="/about" className={linkHoverClass}>About</Link>
        <Link href="/workflow" className={linkHoverClass}>How it works</Link>
        <Link href="/login" className={linkHoverClass}>Login</Link>
        </div>
    </nav>
    ); 
}