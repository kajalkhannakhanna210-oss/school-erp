import type { MetadataRoute } from "next";

const baseUrl = "https://school-erp-lime-three.vercel.app";
const publicRoutes = [
  "/", "/about", "/principal-message", "/chairman-message", "/facilities",
  "/academics", "/admissions", "/fee-structure", "/alumni", "/contact",
  "/gallery", "/events", "/notices",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((path, index) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : 0.7,
  }));
}
