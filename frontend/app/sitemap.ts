import { MetadataRoute } from "next";
import { getAllPosts } from "../lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://litopc.com";
  const routes = [
    { path: "/",             changeFrequency: "weekly" as const, priority: 1.0 },
    { path: "/litopc",       changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/blog",         changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/model-summary",changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/opc-guide",    changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/about",        changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/privacy",      changeFrequency: "yearly" as const,  priority: 0.3 },
    { path: "/terms",        changeFrequency: "yearly" as const,  priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const posts = getAllPosts();
  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
