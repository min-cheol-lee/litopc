import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "../../components/MarketingShell";
import { getAllPosts } from "../../lib/blog";

export const metadata: Metadata = {
  title: "Blog | litopc — Lithography & OPC Insights",
  description:
    "In-depth articles on optical proximity correction, aerial image simulation, DUV vs EUV lithography, EPE, and process window analysis.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <MarketingShell>
      <section className="blog-index-section">
        <div className="blog-index-head">
          <div className="landing-eyebrow">Blog</div>
          <h1 className="blog-index-title">Lithography &amp; OPC Insights</h1>
          <p className="blog-index-sub">
            Physics-accurate explanations of optical proximity correction, aerial imaging, and semiconductor patterning.
          </p>
        </div>

        <div className="blog-card-grid">
          {posts.map((post) => (
            <article key={post.slug} className="blog-card">
              <time className="blog-card-date" dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h2 className="blog-card-title">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="blog-card-cta">
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
