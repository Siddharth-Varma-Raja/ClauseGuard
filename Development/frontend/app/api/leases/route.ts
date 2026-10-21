import { NextResponse } from "next/server";
import { createUpload } from "@/lib/fakeServer";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF" }, { status: 400 });
  }

  const id = createUpload(file.name);
  return NextResponse.json({ id });
}