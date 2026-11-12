import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isAllowedOrigin } from "@/lib/origin";

const ACCESS_COOKIE = "pdp_app_access";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAccessPage = pathname === "/acesso";
  const isUnlockEndpoint = pathname === "/api/access/unlock";

  if (!isAccessPage && !isUnlockEndpoint) {
    const accessPassword = process.env.APP_ACCESS_PASSWORD;
    const accessSecret = process.env.APP_ACCESS_SECRET;

    if (!accessPassword || accessPassword.length < 16 || !accessSecret || accessSecret.length < 32) {
      return new NextResponse("A proteção privada do aplicativo não está configurada.", { status: 503 });
    } else {
      const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
      try {
        const { payload } = await jwtVerify(accessToken ?? "", new TextEncoder().encode(accessSecret));
        if (payload.scope !== "app-access") throw new Error("Escopo de acesso inválido.");
      } catch {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Informe a senha de acesso ao aplicativo." }, { status: 401 });
        }
        const destination = new URL("/acesso", req.url);
        destination.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(destination);
      }
    }
  }

  // Requisições que alteram dados só valem se vierem da mesma origem.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!isAllowedOrigin(req.headers.get("origin"), [
      req.headers.get("x-forwarded-host"),
      req.headers.get("host"),
      req.nextUrl.host,
    ])) {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }
  }

  if (pathname.startsWith("/painel")) {
    const token = req.cookies.get("pdp_session")?.value;
    try {
      await jwtVerify(token ?? "", new TextEncoder().encode(process.env.SESSION_SECRET!));
    } catch {
      return NextResponse.redirect(new URL("/entrar", req.url));
    }
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
