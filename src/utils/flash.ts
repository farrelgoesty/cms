export type NoticeType = "success" | "error" | "warning" | "info";

export function normalizeNoticeType(value: unknown): NoticeType {
  if (value === "success" || value === "error" || value === "warning" || value === "info") {
    return value;
  }

  return "info";
}

export function appendNotice(url: string, message: string, type: NoticeType = "success") {
  if (!message) {
    return url;
  }

  const parsed = new URL(url, "http://cms.local");
  parsed.searchParams.set("notice", message);
  parsed.searchParams.set("noticeType", type);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
