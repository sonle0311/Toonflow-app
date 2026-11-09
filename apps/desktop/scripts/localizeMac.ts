import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "@toonflow/file";
import { join } from "node:path";

if (process.env.ELECTROBUN_OS === "macos") {
  const buildDir = process.env.ELECTROBUN_BUILD_DIR;
  if (!buildDir) throw new Error("缺少 ELECTROBUN_BUILD_DIR，无法设置 macOS 应用语言。");

  const bundlePath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH ?? readdirSync(buildDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => join(buildDir, entry.name))
    .find((path) => existsSync(join(path, "Contents", "Info.plist")));
  if (!bundlePath) throw new Error(`未找到待本地化的 macOS 应用：${buildDir}`);

  const plistPath = join(bundlePath, "Contents", "Info.plist");
  let plist = readFileSync(plistPath, "utf8");
  // ACT: SDK 当前生成 XML；如果改为二进制 plist，应改用 macOS 的 plutil。
  if (!/<\/dict>\s*<\/plist>\s*$/.test(plist)) throw new Error(`不支持的 Info.plist 格式：${plistPath}`);
  const bundleName = plist.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
  if (!bundleName) throw new Error(`无法读取应用名称：${plistPath}`);

  // ACT: ngôn ngữ bundle quyết định ngôn ngữ hộp thoại hệ thống (chọn file, cấp quyền).
  // Trước đây ép zh-Hans nên mọi dialog native hiện tiếng Trung.
  const locales = (process.env.APP_LOCALES ?? "en,vi").split(",").map(value => value.trim()).filter(Boolean);
  const developmentRegion = locales[0] ?? "en";
  const usageStrings: Record<string, { microphone: string; speech: string }> = {
    en: {
      microphone: "Used for voice input and microphone level display.",
      speech: "Used to turn speech into text input.",
    },
    vi: {
      microphone: "Dùng cho nhập liệu bằng giọng nói và hiển thị âm lượng micro.",
      speech: "Dùng để chuyển giọng nói thành văn bản nhập.",
    },
  };
  const usage = usageStrings[developmentRegion] ?? usageStrings.en;
  for (const [key, value] of [
    ["CFBundleDevelopmentRegion", `<string>${developmentRegion}</string>`],
    ["CFBundleLocalizations", `<array>${locales.map(locale => `<string>${locale}</string>`).join("")}</array>`],
    ["NSMicrophoneUsageDescription", `<string>${usage.microphone}</string>`],
    ["NSSpeechRecognitionUsageDescription", `<string>${usage.speech}</string>`],
  ]) {
    const existing = new RegExp(`<key>${key}</key>\\s*<(string|array)>[\\s\\S]*?</\\1>`);
    if (existing.test(plist)) {
      plist = plist.replace(existing, `<key>${key}</key>${value}`);
    } else {
      plist = plist.replace(/<\/dict>\s*<\/plist>\s*$/, `  <key>${key}</key>\n  ${value}\n</dict>\n</plist>`);
    }
  }
  writeFileSync(plistPath, plist);

  const resourcesDir = join(bundlePath, "Contents", "Resources");
  for (const stale of readdirSync(resourcesDir).filter(name => name.endsWith(".lproj") && !locales.includes(name.slice(0, -5)))) {
    rmSync(join(resourcesDir, stale), { recursive: true, force: true });
  }
  for (const locale of locales) {
    const resourceDir = join(resourcesDir, `${locale}.lproj`);
    mkdirSync(resourceDir, { recursive: true });
    const strings = usageStrings[locale];
    writeFileSync(join(resourceDir, "InfoPlist.strings"), [
      `CFBundleName = ${JSON.stringify(bundleName)};`,
      `CFBundleDisplayName = ${JSON.stringify(bundleName)};`,
      strings ? `NSMicrophoneUsageDescription = ${JSON.stringify(strings.microphone)};` : "",
      strings ? `NSSpeechRecognitionUsageDescription = ${JSON.stringify(strings.speech)};` : "",
      "",
    ].filter(Boolean).join("\n"));
  }
  console.log(`Đã đặt ngôn ngữ macOS (${locales.join(", ")}): ${bundlePath}`);
}
