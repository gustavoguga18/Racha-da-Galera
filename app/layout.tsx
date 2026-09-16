import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Racha FC",
  description: "Gestão de rachas de futebol",
  manifest: "/manifest.webmanifest",
  themeColor: "#111827"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}