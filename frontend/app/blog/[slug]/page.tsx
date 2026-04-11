import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { MarketingShell } from "../../../components/MarketingShell";
import { getAllPosts, getPost } from "../../../lib/blog";

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { frontmatter } = getPost(params.slug);
  return {
    title: `${frontmatter.title} | litopc Blog`,
    description: frontmatter.excerpt,
  };
}

export default function BlogPostPage({ params }: Props) {
  const { frontmatter, content } = getPost(params.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    datePublished: frontmatter.date,
    author: {
      "@type": "Person",
      name: "Min-Cheol Lee",
      url: "https://mincheollee.com",
    },
    publisher: {
      "@type": "Organization",
      name: "litopc",
      url: "https://litopc.com",
    },
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="blog-post-wrap">
        {/* Breadcrumb */}
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true"> › </span>
          <span>{frontmatter.title}</span>
        </nav>

        <header className="blog-post-header">
          <time className="blog-card-date" dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <h1 className="blog-post-title">{frontmatter.title}</h1>
          <p className="blog-post-excerpt">{frontmatter.excerpt}</p>
        </header>

        <div className="blog-prose">
          <MDXRemote source={content} />
        </div>

        <div className="blog-post-back">
          <Link href="/blog" className="blog-back-link">
            ← Back to Blog
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
