import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Masukkan email yang valid."),
  password: z.string().min(6, "Password minimal 6 karakter.")
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  email: z.string().trim().toLowerCase().email("Masukkan email yang valid."),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(100, "Password maksimal 100 karakter.")
    .regex(/[a-z]/, "Password harus mengandung huruf kecil.")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar.")
    .regex(/[0-9]/, "Password harus mengandung angka."),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok.",
  path: ["confirmPassword"]
});
