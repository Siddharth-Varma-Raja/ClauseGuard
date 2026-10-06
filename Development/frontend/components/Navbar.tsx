import Link from "next/link";
import GlobalStyles from "../styles/globals.css";

export default function Navbar() {
return(
    <nav className="flex justify-between items-center px-6 py-4 bg-white text-black">
        <Link href="/" className="text-xl font-bold">ClauseGuard</Link>

        <div className="flex gap-6 items-center text-sm text-slate-600">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/workflow">How it works</Link>
        <button>Login</button>
        </div>
    </nav>
    ); 
}