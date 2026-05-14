import { z } from "zod";

export const mediaSchema = z.object({
  altText: z.string().optional().or(z.literal(""))
});
