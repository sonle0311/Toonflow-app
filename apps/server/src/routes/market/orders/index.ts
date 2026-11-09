import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({ planCode: z.string().min(1).max(40) }), async (req, res) => {
  res.json(success(await u.market.createOrder(req.body.planCode)));
});
