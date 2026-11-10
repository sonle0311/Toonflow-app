export type LanguagePresetModel = { id: string; label: string };

export type LanguagePreset = {
  id: string;
  label: string;
  apiUrl: string;
  protocol: "openai-completions" | "anthropic-messages";
  /** Kiểu xác thực khi gọi /models để kiểm tra key. */
  auth: "bearer" | "anthropic";
  models: LanguagePresetModel[];
};

/** ACT: preset cho wizard thiết lập; URL cố định phía server để tránh SSRF. */
export const languagePresets: readonly LanguagePreset[] = [
  {
    id: "openai", label: "OpenAI", apiUrl: "https://api.openai.com/v1", protocol: "openai-completions", auth: "bearer",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "o4-mini", label: "o4-mini" },
    ],
  },
  {
    id: "anthropic", label: "Anthropic", apiUrl: "https://api.anthropic.com", protocol: "anthropic-messages", auth: "anthropic",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1" },
    ],
  },
  {
    id: "gemini", label: "Google Gemini", apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai", protocol: "openai-completions", auth: "bearer",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "openrouter", label: "OpenRouter", apiUrl: "https://openrouter.ai/api/v1", protocol: "openai-completions", auth: "bearer",
    models: [
      { id: "openai/gpt-4.1", label: "OpenAI GPT-4.1" },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "deepseek", label: "DeepSeek", apiUrl: "https://api.deepseek.com/v1", protocol: "openai-completions", auth: "bearer",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
];

export function findLanguagePreset(id: string) {
  return languagePresets.find(preset => preset.id === id);
}
