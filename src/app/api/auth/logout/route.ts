import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
export async function POST() {
  await destroySession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("pdp_app_access", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
