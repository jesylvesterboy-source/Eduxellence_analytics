import { MetadataRoute } from "next";

// If using Supabase / Database to fetch public experts or public projects dynamically:
// import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://experts.eduxellence.org";

  // Static Public Routes (Do NOT add /dashboard, /admin, /api, or auth routes)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/experts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  /* 
  // Dynamic Public Slugs Example (Uncomment and connect to your database):
  // const supabase = createClient();
  // const { data: experts } = await supabase.from('profiles').select('slug, updated_at').eq('is_public', true);
  // const expertRoutes = (experts || []).map((expert) => ({
  //   url: `${baseUrl}/experts/${expert.slug}`,
  //   lastModified: new Date(expert.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }));
  */

  return [...staticRoutes];
}