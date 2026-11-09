import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().get("/", validateFields({ id: z.uuid() }, "query"), (req, res) => {
  res.json(success(u.oauth.getOAuthSession(String(req.query.id))));
});
