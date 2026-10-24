"use client";

import React, { useEffect, useRef } from "react";

/** One-time reveals. Content is visible without JavaScript and with reduced motion. */
export function RevealA({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const show = (element: HTMLElement) => {
      element.dataset.revealed = "true";
    };
    items.forEach((element) => {
      if (preference.matches || element.getBoundingClientRect().top < window.innerHeight + 40) show(element);
    });
    root.dataset.ready = "true";
    if (preference.matches || !("IntersectionObserver" in window)) {
      items.forEach(show);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    items.forEach((element) => {
      if (element.dataset.revealed !== "true") observer.observe(element);
    });
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      let container = target.closest<HTMLElement>("[data-reveal]");
      while (container) {
        show(container);
        container = container.parentElement?.closest<HTMLElement>("[data-reveal]") ?? null;
      }
    };
    const onPreference = () => {
      if (preference.matches) items.forEach(show);
    };
    root.addEventListener("focusin", onFocus);
    preference.addEventListener("change", onPreference);
    return () => {
      observer.disconnect();
      root.removeEventListener("focusin", onFocus);
      preference.removeEventListener("change", onPreference);
      delete root.dataset.ready;
    };
  }, []);
  return (
    <div ref={ref} className="pa-motion" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
