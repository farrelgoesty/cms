import csrf from "csurf";
import type { Request, Response, NextFunction } from "express";

const csrfProtection = csrf({ cookie: true });

export { csrfProtection };

export function exposeCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (typeof req.csrfToken === "function") {
    res.locals.csrfToken = req.csrfToken();
  }

  next();
}
