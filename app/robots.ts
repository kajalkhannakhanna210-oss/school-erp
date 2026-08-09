import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://school-erp-lime-three.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/", "/dashboard/", "/login", "/forgot-password", "/setup-otp", "/verify-otp",
        "/students/", "/staff/", "/academic/", "/attendance/", "/cms/", "/exams/", "/fees/",
        "/payments/", "/reports/", "/role-access/", "/master/", "/profile/", "/admissions-admin/",
        "/student/", "/teacher/", "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
