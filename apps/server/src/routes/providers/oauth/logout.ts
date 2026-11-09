import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({ providerId: z.string().min(1).max(96) }), async (req, res) => {
  await u.oauth.logoutOAuthProvider(req.body.providerId);
  res.json(success(null));
});
