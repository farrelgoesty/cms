declare module "express-ejs-layouts" {
  import type { RequestHandler } from "express";

  const layouts: RequestHandler;
  export = layouts;
}
