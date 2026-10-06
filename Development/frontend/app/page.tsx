import Navbar from "@/components/Navbar";

export default function Home() {

  return (
    <main className="min-h-screen flex-col items-center justify-between p-24 bg-white px-6">
      <div className="gap-7 flex flex-col justify-center">
      <h1 className="text-4xl font-bold text-black ">Welcome to <span className="text-teal-600 ">Clause</span>Guard</h1>
      <p className="text-lg text-gray-700">Your trusted lease checker for tenants.</p>
      <div className="flex gap-4">
        <a href="/about" className="px-4 py-2 bg-teal-600 text-white rounded border border-transparent transition-colors duration-200 hover:bg-white hover:text-teal-600 hover:border-teal-600">Learn More</a>
        <a href="/login" className="px-4 py-2 bg-white text-teal-600 rounded border border-teal-600 transition-colors duration-200 hover:bg-white hover:border-white">Login</a>
      </div>
      </div>
    </main>
  );
}
