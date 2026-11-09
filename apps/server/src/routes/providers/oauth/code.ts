import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({
  id: z.uuid(),
  code: z.string().trim().min(1).max(16384),
}), (req, res) => {
  u.oauth.submitOAuthCode(req.body.id, req.body.code);
  res.json(success(null));
});
