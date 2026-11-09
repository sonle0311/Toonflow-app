import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().get("/", validateFields({ code: z.string().regex(/^TF[A-Z0-9]{8}$/) }, "query"), async (req, res) => {
  res.json(success(await u.market.getOrder(String(req.query.code))));
});
