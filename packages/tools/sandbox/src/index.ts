import { z } from "zod";
import type { ToolPlugin } from "@toonflow/tools-scaffold/runtime";
import { sandboxRequestSchema } from "./schema";

const configSchema = z.object({}).strict();

const plugin: ToolPlugin = {
  validateConfig: config => configSchema.parse(config),
  createTools({ config, sandbox }) {
    configSchema.parse(config);
    if (!sandbox) return [];
    return [{
      name: "sandbox",
      label: "代码沙盒",
      description: "在独立的内存文件系统中执行 Bash、JavaScript（js-exec）和 Python（python3）。工作目录为 /workspace，通过 files 创建文本文件或 imports 导入指定文件；仅成功执行后按 exports 写回工作区，默认不覆盖。返回退出码和输出。环境禁网，JavaScript 不提供完整 Node.js API，Python 不支持 pip 或本机程序。",
      promptSnippet: "在隔离的内存环境中运行技能的 JS/Python 脚本，并显式导入和导出文件。",
      promptGuidelines: [
        "执行技能附带代码前，先读取技能说明，确认需要的脚本、输入文件和依赖。用 imports 导入需要的文件；沙盒不会自动读取脚本相邻文件。",
        "脚本使用 js-exec script.js 或 python3 script.py；JS 含 import/export 时使用 js-exec -m script.js。支持的 fs API 只访问虚拟文件系统。导入和导出文件总大小分别最多 16 MiB，文本输出最多 64 KiB。",
        "每次调用都是全新的 /workspace；上次创建的脚本和中间文件不会保留，需要保留的结果必须显式指定 exports，后续调用需重新导入。脚本报错后，下一次调用须重新提供修改后的完整脚本及所需 imports，不能直接用 sed 修改上次调用创建的脚本。imports 中的 path 是真实来源，target 是脚本应读取的虚拟路径，两者不同时不能继续读取原始 path。",
        "exports 仅在命令成功后写回真实工作区，并创建缺失的父目录；沙盒内 rm、mkdir 等只影响虚拟文件系统，不能用于清理或创建真实工作区文件、目录。覆盖工作区文件前确认用户意图，并显式设置 overwrite=true。",
        "不要用 sandbox 的 sleep 等待画布节点生成或本机 FFmpeg；节点状态先通过 getNodeTools 查询，再调用实际注册的状态函数，本机 FFmpeg 等待 ffmpeg 工具返回结果。",
        "JavaScript 使用 QuickJS，Python 仅提供随附标准库；不支持完整 Node.js、pip、本机程序或联网。遇到缺失依赖应说明限制，不将沙盒成功运行等同于完整技能验证。",
      ],
      parameters: z.toJSONSchema(sandboxRequestSchema, { io: "input", target: "draft-07" }),
      executionMode: "sequential",
      execute(id, params, signal, onUpdate, context) {
        signal?.throwIfAborted();
        return sandbox.execute(id, sandboxRequestSchema.parse(params), signal, onUpdate, context);
      },
    }];
  },
};

export default plugin;
