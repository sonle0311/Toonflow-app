import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
}), async (req, res) => {
  await u.market.login(req.body.email, req.body.password);
  res.json(success(await u.market.getStatus()));
});
