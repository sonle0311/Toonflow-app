import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({ slug: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/) }), async (req, res) => {
  res.json(success(await u.market.installAddon(req.body.slug)));
});
