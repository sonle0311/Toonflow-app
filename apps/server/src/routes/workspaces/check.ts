import { Router } from "express";
import { realpath } from "@toonflow/file";
import { dirname, relative, resolve } from "node:path";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { error, success } from "@/lib/responseFormat";

const router = Router();

export default router.get("/", validateFields({ directory: z.string().min(1).max(4096) }, "query"), async (req, res) => {
  const directory = await u.workspace.resolveWorkspace(req, req.query.directory as string);
  const workspaceRoot = await realpath(resolve(dirname(u.conf.path), "workspaces")).catch((cause: NodeJS.ErrnoException) => {
    if (cause.code === "ENOENT") return null;
    throw cause;
  });
  if (workspaceRoot && relative(workspaceRoot, directory) === "") {
    res.status(400).json(error("请进入或新建项目文件夹，不能将服务器工作区根目录作为项目", null, 400));
    return;
  }
  res.set("Cache-Control", "no-store").json(success({ directory }));
});
