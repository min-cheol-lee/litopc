"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OpcLabRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/litopc");
  }, [router]);
  return null;
}
