import { NextResponse } from "next/server";
// import { getAnalysis } from "@/lib/fakeServer";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // const result = getAnalysis(id);

  // if (!result) {
  //   return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  // }
  // return NextResponse.json(result);
}