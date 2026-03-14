"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function LegacyOpcLabRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const suffix = pathname.replace(/^\/opclab/, "");
    router.replace(`/litopc${suffix}`);
  }, [pathname, router]);

  return null;
}

export function generateStaticParams() {
  return [];
}
