import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import methodOverride from "method-override";
import expressLayouts = require("express-ejs-layouts");
import { attachLocals, attachUser } from "./middlewares/auth.middleware";
import { csrfProtection, exposeCsrfToken } from "./middlewares/csrf.middleware";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { authLimiter, publicLimiter } from "./middlewares/rate-limit.middleware";
import { router as adminRouter } from "./routes/admin.routes";
import { router as blogRouter } from "./routes/blog.routes";
import { router as seoRouter } from "./routes/seo.routes";
import { env } from "./config/env";

export const app = express();

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(expressLayouts);
app.set("layout", "layouts/blog");

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(attachUser);
app.use(attachLocals);
app.use((req, res, next) => {
  if (req.is("multipart/form-data")) {
    next();
    return;
  }

  csrfProtection(req, res, next);
});
app.use(exposeCsrfToken);

app.locals.appName = "CMS Blog";

app.use("/admin", authLimiter, adminRouter);
app.use("/", publicLimiter, blogRouter);
app.use("/", seoRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use(notFound);
app.use(errorHandler);
