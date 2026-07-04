import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Lead Response & Booking Control Center",
  description: "AI receptionist and lead automation dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
