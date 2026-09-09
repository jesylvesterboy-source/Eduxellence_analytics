import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/admin/",
        "/messages/",
        "/checkout/",
        "/settings/",
        "/auth/",
      ],
    },
    sitemap: "https://experts.eduxellence.org/sitemap.xml",
  };
}