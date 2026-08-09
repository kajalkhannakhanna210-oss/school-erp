import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToasterProvider } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://school-erp-lime-three.vercel.app"),
  title: {
    default: "School ERP & School Management System | Registrar",
    template: "%s | Registrar",
  },
  description:
    "A modern school management system for managing students, teachers, attendance, fees, examinations, notices, reports, and school administration.",
  alternates: { canonical: "/" },
  applicationName: "Registrar",
  generator: "Next.js",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "Registrar",
    title: "School ERP & School Management System | Registrar",
    description: "Manage students, teachers, fees, attendance, examinations, notices, reports, and school administration in one school ERP.",
    images: [{ url: "/about-school.jpg", width: 1200, height: 630, alt: "School campus and learning environment" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "School ERP & School Management System | Registrar",
    description: "Modern school management software for students, teachers, fees, attendance, examinations, and administration.",
    images: ["/about-school.jpg"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-slate antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "Registrar", url: "https://school-erp-lime-three.vercel.app", description: "School ERP and school management system for school administration." },
            { "@type": "WebSite", name: "Registrar", url: "https://school-erp-lime-three.vercel.app" },
          ],
        }) }} />
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
