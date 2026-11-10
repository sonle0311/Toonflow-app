import { Router } from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { translateMessage } from "@/lib/i18n";

const router = Router();

export default router.get("/", async (req, res) => {
  const canManage = u.workspace.isLocalWorkspaceRequest(req);
  // ACT: tên tool cũng lấy từ metadata plugin; dịch ở host để đồng nhất ngôn ngữ UI.
  const tools = (await u.plugins.listTools()).map(tool => ({ ...tool, displayName: translateMessage(tool.displayName), builtin: req.app.locals.builtinPlugins.tool.has(tool.name) }));
  res.json(success({ tools: canManage ? tools : tools.map(tool => ({ ...tool, config: {} })), canManage }));
});
