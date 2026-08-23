import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRP Lab Reports",
  description:
    "Pathology report generator for Tandi Ratnanagar Polyclinic — demonstration build",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
