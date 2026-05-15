"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!mounted) return;
        if (res.ok) {
          router.replace('/sonar/home');
        } else {
          router.replace('/login');
        }
      } catch (e) {
        if (!mounted) return;
        router.replace('/login');
      }
    })();

    return () => { mounted = false; };
  }, [router]);

  return null;
}
