import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToasterProvider } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Management",
  description: "Student, staff, fee, and academic administration.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-slate antialiased">
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
