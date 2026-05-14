import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  avatar: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal(""))
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama."
  });
