import { Router } from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";

export default Router().get("/", (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const channel = u.channel.getChannel();
  res.json(success({ id: channel.id, ...channel.capabilities }));
});
