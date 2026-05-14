import slugify from "slugify";

export function makeSlug(value: string): string {
  return slugify(value, {
    lower: true,
    strict: true,
    trim: true
  });
}
