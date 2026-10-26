"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "On this page" for the guides: a sticky rail beside the text on wide screens, one
 * swipeable row of pills on narrow ones. The section being read is marked (ink, and a
 * spectrum stroke on the rail's hairline); on the narrow row it is scrolled into view.
 */
export function ContentsNav({ items }: { items: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // The current section is the last one whose top has passed 40% of the window.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let next: string | null = null;
      for (const { id } of items) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) next = id;
      }
      setCurrent(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  // Narrow screens: keep the marked pill inside the row (the row scrolls, never the page).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const link = nav.querySelector<HTMLAnchorElement>(`a[href="#${current}"]`);
    if (link) nav.scrollTo({ left: link.offsetLeft - 16, behavior: "smooth" });
  }, [current]);

  return (
    <nav ref={navRef} className="pa-doc-contents" aria-label="On this page">
      <span className="pa-doc-contents-head" aria-hidden="true">
        On this page
      </span>
      {items.map((item) => (
        <a
          href={`#${item.id}`}
          key={item.id}
          className={item.id === current ? "is-current" : undefined}
          aria-current={item.id === current ? "location" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
