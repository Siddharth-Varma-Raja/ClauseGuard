import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    if (request.cookies.has("cg_signed_in")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: "/",
};