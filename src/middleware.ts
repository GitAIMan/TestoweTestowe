import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Publiczne ścieżki — nie wymagają logowania
  const publicPaths = ["/login", "/klient", "/kuchnia", "/api/auth", "/api/public"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) return NextResponse.next();

  // Brak sesji → redirect do logowania
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Ścieżki tylko dla KIEROWNIK
  const kierownikOnly = ["/ustawienia", "/podsumowania"];
  const isKierownikRoute = kierownikOnly.some((path) => pathname.startsWith(path));

  if (isKierownikRoute && req.auth.user.role !== "KIEROWNIK") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
