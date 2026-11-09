import { Toonflow } from "./toonflow";
import { Self } from "./self";
import type { Channel } from "./types";

const channels = new Map<string, Channel>([
  ["self", new Self()],
  ["toonflow", new Toonflow()],
]);

export function getChannel(): Channel {
  // ACT: Bản độc lập mặc định dùng kênh "self"; đặt TOONFLOW_CHANNEL=toonflow để quay lại kênh gốc.
  const source = channels.get(process.env.TOONFLOW_CHANNEL?.trim() || "self");
  if (!source) throw Object.assign(new Error("渠道未配置，请检查 TOONFLOW_CHANNEL"), { status: 503 });
  return source;
}
