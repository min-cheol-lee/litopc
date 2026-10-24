import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  CREATOR_LINKEDIN_URL,
  CREATOR_WEBSITE_URL,
  SIMULATOR_URL,
} from "../../lib/marketing";
import { ROUTES } from "./routes";
import { ShellA, Wordmark } from "./ShellA";

/** Page metadata: "<title> | litopc", with the page as its own canonical address. */
export function docMetadataA(title: string, description: string, path: string): Metadata {
  return {
    title: `${title} | litopc`,
    description,
    alternates: { canonical: path },
  };
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className="pa-doc-breadcrumb" aria-label="Breadcrumb">
      <Link href={ROUTES.home} aria-label="litopc home">
        <Wordmark />
      </Link>
      <span aria-hidden="true">/</span>
      <span>{current}</span>
    </nav>
  );
}

/** A technical article: title, sticky contents rail, body, and the two closing actions. */
export function TechnicalArticleA({
  title,
  introduction,
  contents,
  children,
  next,
}: {
  title: string;
  introduction: ReactNode;
  contents: { id: string; label: string }[];
  children: ReactNode;
  next: { href: string; label: string };
}) {
  return (
    <ShellA>
      <article className="pa-doc pa-doc-technical">
        <div className="pa-container pa-doc-layout">
          <header className="pa-doc-header" data-reveal>
            <Breadcrumb current={title} />
            <h1>{introduction}</h1>
          </header>
          <nav className="pa-doc-contents" aria-label="On this page">
            <span className="pa-doc-contents-head" aria-hidden="true">
              On this page
            </span>
            {contents.map((item) => (
              <a href={`#${item.id}`} key={item.id}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pa-doc-body">
            {children}
            <div className="pa-doc-actions">
              <a className="pa-button" href={SIMULATOR_URL}>
                Open <Wordmark /> simulator
              </a>
              <Link className="pa-button pa-button-outline" href={next.href}>
                {next.label}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </ShellA>
  );
}

export function TechnicalSectionA({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="pa-doc-section"
      id={id}
      aria-labelledby={`${id}-label`}
      data-reveal
    >
      <h2 className="pa-visually-hidden" id={`${id}-label`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// Static, author-written MathML. No user HTML is accepted. Native math preserves
// selectable notation, screen-reader semantics and avoids a remote font/runtime.
export function EquationA({
  math,
  label,
  number,
}: {
  math: string;
  label: string;
  number?: string;
}) {
  return (
    <div className="pa-doc-equation" tabIndex={0} role="group" aria-label={label}>
      <div
        dangerouslySetInnerHTML={{
          __html: `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-label="${label}">${math}</math>`,
        }}
      />
      {number && <span>({number})</span>}
    </div>
  );
}

/** A reading page: breadcrumb, title, description, sections, and optional actions. */
export function MarketingDocumentA({
  eyebrow,
  title,
  description,
  children,
  action = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: boolean;
}) {
  return (
    <ShellA>
      <article className="pa-doc pa-doc-plain">
        <div className="pa-container pa-doc-narrow">
          <Breadcrumb current={eyebrow} />
          <header className="pa-doc-header" data-reveal>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
          {action && (
            <div className="pa-doc-actions">
              <a className="pa-button" href={SIMULATOR_URL}>
                Open <Wordmark /> simulator
              </a>
              <Link className="pa-button pa-button-outline" href={ROUTES.contact}>
                Get in touch
              </Link>
            </div>
          )}
        </div>
      </article>
    </ShellA>
  );
}

export function DocSectionA({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="pa-doc-section" id={id} data-reveal>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** The creator's website and LinkedIn as quiet glass pills with icons. */
export function CreatorLinksA() {
  return (
    <div className="pa-doc-creator-links">
      <a href={CREATOR_WEBSITE_URL} target="_blank" rel="noreferrer">
        <span className="pa-doc-creator-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18M4.8 6.8c2.1 1.2 4.5 1.8 7.2 1.8s5.1-.6 7.2-1.8M4.8 17.2c2.1-1.2 4.5-1.8 7.2-1.8s5.1.6 7.2 1.8" />
          </svg>
        </span>
        <span>mincheollee.com</span>
      </a>
      <a href={CREATOR_LINKEDIN_URL} target="_blank" rel="noreferrer">
        <span className="pa-doc-creator-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.53v16.94C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.53V3.53C22 2.68 21.31 2 20.45 2ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.1-.02-2.51-1.53-2.51-1.53 0-1.76 1.2-1.76 2.43v4.73H9.56V9.2h2.83v1.3h.04c.4-.75 1.36-1.53 2.8-1.53 3 0 3.52 1.97 3.52 4.52v5.26Z" />
          </svg>
        </span>
        <span>LinkedIn</span>
      </a>
    </div>
  );
}
