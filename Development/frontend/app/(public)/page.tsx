import Navbar from "@/components/Navbar";

export default function Home() {

  return (
    <main className="flex-col items-center justify-between py-30 bg-white px-6">
      <div className="gap-7 flex flex-col justify-center">
      <h1 className="text-4xl font-bold text-black ">Welcome to <span className="text-teal-600 ">Clause</span>Guard</h1>
      <p className="text-lg text-gray-700">Your trusted lease checker for tenants.</p>
      <div className="flex gap-4">
        <a href="/about" className="px-4 py-2 bg-teal-600 text-white rounded border border-transparent transition-colors duration-200 hover:bg-white hover:text-teal-600 hover:border-teal-600">Learn More</a>
        <a href="/login" className="px-4 py-2 bg-white text-teal-600 rounded border border-teal-600 transition-colors duration-200 hover:bg-white hover:border-white">Login</a>
      </div>
      </div>
      <h2 className="mt-25 text-2xl font-bold text-black">How it works</h2>
      <section id="how-it-works" className="mt-3 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-semibold text-teal-600">Step 1</p>
          <h3 className="mt-1 font-bold text-black">Upload your lease</h3>
          <p className="mt-2 text-sm text-gray-600">Add your rental agreement as a PDF.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-semibold text-teal-600">Step 2</p>
          <h3 className="mt-1 font-bold text-black">We scan every clause</h3>
          <p className="mt-2 text-sm text-gray-600">ClauseGuard checks for clauses that could cost you.</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <p className="text-sm font-semibold text-teal-600">Step 3</p>
          <h3 className="mt-1 font-bold text-black">See what to look for</h3>
          <p className="mt-2 text-sm text-gray-600">Get simple explanations of risky clauses.</p>
        </div>
      </section>
      <section id="about" className="mt-20 scroll-mt-24">
        <h2 className="text-2xl font-bold text-black">About ClauseGuard</h2>
        <p className="mt-3 max-w-2xl text-gray-700">
          AI-powered lease checker for Irish renters. Upload a lease, and ClauseGuard flags potentially unlawful or unfair clauses with plain-English explanations and citations to the Residential Tenancies Acts and RTB guidance.
        </p>
</section>
    </main>
  );
}
