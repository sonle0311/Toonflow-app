import { tool, jsonSchema, Tool } from "ai";
import u from "@/utils";
import { z } from "zod";
import _ from "lodash";
import ResTool from "@/socket/resTool";

export const ScriptSchema = z.object({
  name: z.string().describe("Tên kịch bản"),
  content: z.string().describe("Nội dung kịch bản"),
});
export const planData = z.object({
  storySkeleton: z.string().describe("Khung truyện"),
  adaptationStrategy: z.string().describe("Chiến lược cải biên"),
  script: z.string().describe("Nội dung kịch bản"),
});

export type planData = z.infer<typeof planData>;

const keySchema = z.enum(Object.keys(planData.shape) as [keyof planData, ...Array<keyof planData>]);
const planDataKeyLabels = Object.fromEntries(
  Object.entries(planData.shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).description ?? key]),
) as Record<keyof planData, string>;

interface ToolConfig {
  resTool: ResTool;
  toolsNames?: string[];
  msg: ReturnType<ResTool["newMessage"]>;
}

export default (toolCpnfig: ToolConfig) => {
  const { resTool, toolsNames, msg } = toolCpnfig;
  const { socket } = resTool;
  const tools: Record<string, Tool> = {
    get_novel_events: tool({
      description: "Lấy sự kiện chương",
      inputSchema: jsonSchema<{ chapterIndexs: number[] }>(
        z
          .object({
            chapterIndexs: z.array(z.number()).describe("Số chương"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ chapterIndexs }) => {
        console.log("[tools] get_novel_events", chapterIndexs);
        const thinking = msg.thinking("Đang truy vấn sự kiện chương...");
        const data = await u
          .db("o_novel")
          .where("projectId", resTool.data.projectId)
          .select("id", "chapterIndex as index", "reel", "chapter", "chapterData", "event", "eventState")
          .whereIn("chapterIndex", chapterIndexs);
        thinking.appendText("Đang truy vấn chương số: " + chapterIndexs.join(","));
        const eventString = data.map((i: any) => [`Chương ${i.index}, tiêu đề:${i.chapter}, sự kiện:${i.event}`].join("\n")).join("\n");
        thinking.appendText("Kết quả truy vấn:\n" + eventString);
        thinking.updateTitle("Truy vấn sự kiện hoàn tất");
        thinking.complete();
        return eventString ?? "Không có dữ liệu";
      },
    }),
    get_planData: tool({
      description: "Lấy dữ liệu workspace",
      inputSchema: jsonSchema<{ key: keyof planData }>(
        z
          .object({
            key: keySchema.describe("Khóa dữ liệu"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ key }) => {
        console.log("[tools] get_planData", key);
        const thinking = msg.thinking(`Đang lấy ${planDataKeyLabels[key]}...`);
        const planData: planData = await new Promise((resolve) => socket.emit("getPlanData", { key }, (res: any) => resolve(res)));
        thinking.appendText(`Đã lấy ${planDataKeyLabels[key]}:\n` + planData[key]);
        thinking.updateTitle(`Lấy ${planDataKeyLabels[key]} hoàn tất`);
        thinking.complete();
        return planData[key] ?? "Không có dữ liệu";
      },
    }),
    get_novel_text: tool({
      description: "Lấy nội dung gốc chương tiểu thuyết",
      inputSchema: jsonSchema<{ chapterIndex: string }>(
        z
          .object({
            chapterIndex: z.string().describe("Số chương"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ chapterIndex }) => {
        console.log("[tools] get_novel_text", chapterIndex);
        const thinking = msg.thinking(`Đang lấy nguyên tác chương...`);
        const data = await u.db("o_novel").where("projectId", resTool.data.projectId).where({ chapterIndex }).select("chapterData").first();
        const text = data && data?.chapterData ? data.chapterData : "";
        thinking.appendText(`Đã lấy nguyên tác:\n` + text);
        thinking.updateTitle(`Lấy nguyên tác chương hoàn tất`);
        thinking.complete();
        return text ?? "Không có dữ liệu";
      },
    }),
    get_script_content: tool({
      description: "Lấy nội dung kịch bản",
      inputSchema: jsonSchema<{ ids: string[] }>(
        z
          .object({
            ids: z.array(z.string()).describe("ID kịch bản"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ ids }) => {
        console.log("[tools] get_script_content", ids);
        const thinking = msg.thinking(`Đang lấy nội dung kịch bản...`);
        const data = await u.db("o_script").whereIn("id", ids).select("content", "name");
        const text = data && data.length ? data.map((d) => `<scriptItem name="${d.name}">${d.content}</scriptItem>`).join("\n") : "";
        thinking.appendText(`Đã lấy nội dung kịch bản:\n` + JSON.stringify(data, null, 2));
        thinking.updateTitle(`Lấy nội dung kịch bản hoàn tất`);
        thinking.complete();
        return text ?? "Không có dữ liệu";
      },
    }),
  };
  return toolsNames ? Object.fromEntries(Object.entries(tools).filter(([n]) => toolsNames.includes(n))) : tools;
};
