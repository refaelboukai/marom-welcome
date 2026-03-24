import { useEffect, useRef } from "react";

export function useAutoUpdate(intervalMs = 10000) {
  const lastEtag = useRef<string | null>(null);

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const res = await fetch(window.location.origin + "/index.html", {
          method: "HEAD",
          cache: "no-cache",
        });
        const etag = res.headers.get("etag") || res.headers.get("last-modified");
        if (etag && lastEtag.current && etag !== lastEtag.current) {
          window.location.reload();
        }
        if (etag) lastEtag.current = etag;
      } catch {
        // ignore network errors
      }
    };

    checkForUpdate();
    const id = setInterval(checkForUpdate, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
