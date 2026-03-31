import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SaaS Hotele — System zarządzania ofertami",
  description:
    "System do zarządzania ofertami eventowymi i agendami dla hoteli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={cn("font-sans", plusJakarta.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
