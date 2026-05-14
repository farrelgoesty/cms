import { User, PostStatus, CommentStatus, UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      role: UserRole;
      name: string;
      avatar?: string | null;
    }

    interface Request {
      authUser?: UserPayload | undefined;
    }
  }
}

declare module "express-serve-static-core" {
  interface Locals {
    csrfToken?: string;
    user?: {
      id: string;
      email: string;
      role: UserRole;
      name: string;
      avatar?: string | null;
    } | undefined;
    appName?: string;
    currentYear?: number;
    meta?: {
      title: string;
      description: string;
      canonical?: string;
      image?: string;
      type?: string;
    };
    layout?: string;
  }
}

export {};
