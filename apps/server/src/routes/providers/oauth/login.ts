import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({
  providerId: z.string().min(1).max(96),
  method: z.string().min(1).max(32).optional(),
}), async (req, res) => {
  res.json(success(await u.oauth.startOAuthLogin(req.body.providerId, req.body.method)));
});
