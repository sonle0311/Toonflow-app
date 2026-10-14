const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "Client API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "apiUrl" as const,
    title: "API Base URL",
    value: "http://127.0.0.1:8000/v1",
    props: { placeholder: "http://127.0.0.1:8000/v1" },
  },
];

export default {
  id: "grok2Api" as const,
  label: "Grok2API",
  icon: "",
  version: "1.0.0",
  apiUrl: "http://127.0.0.1:8000/v1",
  protocol: "openai-completions",
  readme: "## Grok2API\n\n通过本地网关调用 Grok 文本与视觉模型，支持流式对话。填写网关 **Client Keys** 页面生成的 API Key；可用模型从 `/v1/models` 获取，取决于密钥权限和账户额度。\n\n默认地址：`http://127.0.0.1:8000/v1`。Docker Desktop 可改为 `http://host.docker.internal:8000/v1`。不要填写管理员密码、JWT 或 Grok SSO。",
  rules,
  models: [],
} satisfies ProviderDefinition<typeof rules>;
