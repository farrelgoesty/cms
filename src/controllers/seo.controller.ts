import type { Request, Response } from "express";
import { seoService } from "../services/seo.service";

export const seoController = {
  async sitemap(req: Request, res: Response) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const xml = await seoService.buildSitemap(baseUrl);
    res.type("application/xml").send(xml);
  },

  robots(req: Request, res: Response) {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("text/plain").send(seoService.buildRobots(baseUrl));
  }
};
