import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(80),
}), async (req, res) => {
  await u.market.register(req.body.email, req.body.password, req.body.name);
  res.json(success(await u.market.getStatus()));
});
