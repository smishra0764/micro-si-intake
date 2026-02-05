import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://micro-si-intake.vercel.app";
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/crm-contact-center-integration-blueprint`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
