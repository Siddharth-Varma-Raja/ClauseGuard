
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Upload } from "lucide-react";

export default function NewLeasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setFile(null);

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The file must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  function handleUpload() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    try{
        //Send the file to the backend
    }
    catch (error) {
        setError("Your file has failed to uploaded. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/lease"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <ArrowLeft size={18} />
        Back to my leases
      </Link>

      <header className="mt-8">
        <h1 className="text-3xl font-semibold text-brand font-display">
          Upload a lease
        </h1>
        <p className="mt-2 text-mute">
          Upload your rental agreement to begin the review process.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-dark">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-brand font-display">
              Rental agreement
            </h2>
            <p className="text-sm text-mute">
              Maximum size 10 MB
            </p>
          </div>
        </div>

        <label
          htmlFor="lease-file"
          className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-brand-dark focus-within:outline-2 focus-within:outline-offset-4"
        >
          <Upload size={28} />
          <span className="mt-3 font-semibold text-brand">
            Choose a file
          </span>
          <span className="mt-1 text-sm text-mute">
            Select your rental agreement from your device
          </span>

          <input
            id="lease-file"
            name="lease-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="mt-4 max-w-full text-sm"
          />
        </label>

        <p id="file-help" className="mt-3 text-sm text-mute">
          Make sure the document is readable and does not exceed 10 MB.
        </p>

        {file && (
          <p className="mt-4 break-words rounded-lg bg-brand-soft p-3 text-sm text-brand">
            Selected file: {file.name}
          </p>
        )}

        {error && (
          <p
            id="file-error"
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Upload size={18} />
          Continue
        </button>
      </section>
    </main>
  );
}
