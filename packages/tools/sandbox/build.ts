import { createToolConfig } from "@toonflow/tools-scaffold";

await createToolConfig({
  name: "sandbox",
  displayName: "代码沙盒",
  description: "在独立内存文件系统中执行 Bash、JavaScript 和 Python，并按需保存输出文件。",
  prompt: `运行技能代码前先通过 skillOperator 读取相关技能说明，再用 imports 导入所需脚本和资料，或用 files 提供脚本内容。
sandbox 每次调用使用全新的内存文件系统，工作目录为 /workspace；只导入显式指定的文件，只有成功执行后的 exports 才会写回工作区，默认不覆盖已有文件。
脚本报错后，下一次调用须重新提供修改后的完整脚本及所需 imports，不能直接用 sed 修改上次调用创建的脚本；rm、mkdir 等只影响虚拟文件系统，不能用于清理或创建真实工作区文件、目录。
不要用 sandbox 的 sleep 等待画布节点生成或本机 FFmpeg；节点状态先通过 getNodeTools 查询，再调用实际注册的状态函数，本机 FFmpeg 等待 ffmpeg 工具返回结果。
JavaScript 使用 js-exec 运行，环境是 QuickJS，不具备完整 Node.js API；Python 使用 python3 运行，仅提供随附标准库，不支持 pip 安装或本机程序。沙盒禁用网络，不能据此承诺支持任意技能依赖。`,
  author: "Toonflow",
  github: "https://github.com/HBAI-Ltd/Toonflow-app",
  configRules: [],
}, import.meta.url);
