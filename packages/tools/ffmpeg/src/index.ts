import { z } from "zod";
import { chainMethods, queryMethods, runMethods } from "@toonflow/ffmpeg/remote";
import type { ToolPlugin } from "@toonflow/tools-scaffold/runtime";

const configSchema = z.strictObject({});
const probeSchema = z.strictObject({
  path: z.string().min(1).describe("工作区媒体文件，相对路径或工作区内的绝对路径"),
  options: z.array(z.string()).optional().describe("原生 ffprobe 选项，按参数数组原样传递"),
});
const processSchema = z.strictObject({
  options: z.strictObject({
    source: z.string().optional(),
    cwd: z.string().optional(),
    niceness: z.number().optional(),
    priority: z.number().optional(),
    stdoutLines: z.number().optional(),
    timeout: z.number().optional(),
  }).optional().describe("原生 fluent 构造选项；不设置固定超时"),
  steps: z.array(z.strictObject({
    method: z.enum(chainMethods),
    args: z.array(z.json()),
    undefinedArgs: z.array(z.number().int().nonnegative()).optional().describe("需要传 undefined 的参数位置，其他参数保持原值"),
  })).default([]).describe("按 fluent-ffmpeg 顺序配置，方法及其别名沿用宿主；选项、滤镜和文件序列原样传递"),
  operation: z.strictObject({
    method: z.enum([...runMethods, ...queryMethods]),
    args: z.array(z.json()),
    undefinedArgs: z.array(z.number().int().nonnegative()).optional(),
  }).default({ method: "run", args: [] }).describe("最后执行的方法，默认 run；也可 save、screenshots、concat 或查询编码器、格式、滤镜等"),
});

const plugin: ToolPlugin = {
  validateConfig: config => configSchema.parse(config),
  createTools(context) {
    async function execute(request: z.infer<typeof processSchema>, signal?: AbortSignal) {
      let details: unknown;
      let error: Error | undefined;
      let filenames: unknown;
      // ACT: 宿主在 Worker 中执行 JSON 调用，不在工具层重写参数、输出位置或原生执行规则。
      await context.executeFfmpeg({
        directory: context.cwd,
        requestId: crypto.randomUUID(),
        options: request.options ?? {},
        calls: request.steps,
        operation: request.operation,
      }, event => {
        if (event.event === "error") {
          const failure = event.args[0] as { message?: string };
          const stdout = typeof event.args[1] === "string" ? event.args[1] : undefined;
          const stderr = typeof event.args[2] === "string" ? event.args[2] : undefined;
          const message = [failure.message ?? "FFmpeg 执行失败", stdout && `stdout:\n${stdout}`, stderr && `stderr:\n${stderr}`].filter(Boolean).join("\n\n");
          error = Object.assign(new Error(message), failure, { message, stdout, stderr });
        } else if (event.event === "result") details = event.args[0];
        else if (event.event === "filenames") filenames = event.args[0];
        else if (event.event === "end") details = { stdout: event.args[0], stderr: event.args[1], ...(filenames ? { filenames } : {}) };
      }, signal ?? new AbortController().signal);
      signal?.throwIfAborted();
      if (error) throw error;
      return { content: [{ type: "text" as const, text: JSON.stringify(details) }], details };
    }

    return [{
      name: "ffprobe",
      label: "查询媒体信息",
      description: "使用本机 FFprobe 读取工作区媒体的格式、时长、尺寸、帧率和音轨等信息，支持原生探测选项。",
      parameters: z.toJSONSchema(probeSchema, { io: "input", target: "draft-07" }),
      execute(_id, params, signal) {
        const { path, options } = probeSchema.parse(params);
        return execute({ steps: [{ method: "input", args: [path] }], operation: { method: "ffprobe", args: options ? [options] : [] } }, signal);
      },
    }, {
      name: "ffmpeg",
      label: "处理媒体",
      description: "通过宿主 fluent-ffmpeg 处理工作区媒体。steps 原样传入链式方法及 args，支持全部宿主配置方法和别名、原始 inputOptions/outputOptions、复杂滤镜、多输入、多输出、文件序列及分片。operation 默认 run，也支持 save、screenshots、concat 和能力查询。不自动重命名输出、不限制执行时长；输出目录需已存在，文件覆盖遵循原生规则。",
      promptSnippet: "使用 ffmpeg 处理本地媒体，ffprobe 查询媒体信息；按用户要求选择输出位置。",
      promptGuidelines: [
        '截帧示例：{"steps":[{"method":"input","args":["assets/input.mp4"]},{"method":"seekInput","args":[1]},{"method":"frames","args":[1]},{"method":"output","args":["assets/frame.png"]}]}。',
        'steps 按 fluent 调用顺序执行：先 input(path)，再 inputOptions；inputOptions 不传 -i。省略 operation 即 run()；显式提供 operation 时必须包含 args，例如 {"method":"run","args":[]}。',
        'inputOptions/outputOptions 按 fluent 原生语法传参，不额外拆分空格。含空格的元数据使用 args:["-metadata","title=a b"]，不要再嵌套数组。先用 operation={"method":"availableEncoders","args":[]} 等查询实际能力，不猜测本机编码器。',
        'audioFilter/videoFilter 只接收滤镜表达式，不包含 -af/-vf；output 的第一个参数是文件路径，-f、编码器等选项放入 outputOptions。输出父目录须预先存在。',
        'concat 清单中的相对文件路径以清单所在目录为基准，例如 work/list.txt 引用工作区 assets 时使用 ../assets/...；不能假定以工作区根目录解析。',
        "Whisper 等语音识别滤镜依赖实际模型文件；先确认模型文件存在及路径，不使用不存在的占位模型反复尝试。缺少模型时说明限制，不声称已完成转写。",
        "除非用户要求覆盖，否则使用新文件名；所有显式路径及参数、滤镜和媒体清单中引用的文件都应位于当前工作区。",
      ],
      parameters: z.toJSONSchema(processSchema, { io: "input", target: "draft-07" }),
      executionMode: "sequential",
      execute(_id, params, signal) {
        return execute(processSchema.parse(params), signal);
      },
    }];
  },
};

export default plugin;
