export type YoutubePosition = "TOP" | "MIDDLE" | "BOTTOM";

type YoutubePreview = {
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
  watchUrl: string;
};

function extractYoutubeIdFromUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return videoId || null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v") ?? "";
        return videoId || null;
      }

      const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch) {
        return embedMatch[1] ?? null;
      }

      const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) {
        return shortsMatch[1] ?? null;
      }

      const liveMatch = url.pathname.match(/^\/live\/([^/]+)/);
      if (liveMatch) {
        return liveMatch[1] ?? null;
      }

      const legacyMatch = url.pathname.match(/^\/v\/([^/]+)/);
      if (legacyMatch) {
        return legacyMatch[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function buildYoutubePreview(value?: string | null): YoutubePreview | null {
  if (!value) {
    return null;
  }

  const videoId = extractYoutubeIdFromUrl(value);
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

export function normalizeYoutubeUrl(value?: string | null): string | null {
  const preview = buildYoutubePreview(value ?? "");
  return preview ? preview.watchUrl : null;
}

export function isValidYoutubeUrl(value?: string | null): boolean {
  return Boolean(buildYoutubePreview(value ?? ""));
}
