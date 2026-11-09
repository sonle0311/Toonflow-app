import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import type { AuthEvent, AuthPrompt } from "@earendil-works/pi-ai";
import conf from "@/utils/conf";
import { t } from "@/lib/i18n";

export type OAuthProvider = {
  id: string;
  name: string;
  isSubscription: boolean;
  loginLabel: string | null;
  loggedIn: boolean;
  models: { id: string; label: string; contextWindow: number; maxOutputTokens: number; reasoning: boolean }[];
};

export type OAuthSession = {
  id: string;
  providerId: string;
  state: "waiting" | "done" | "error";
  url?: string;
  instructions?: string;
  userCode?: string;
  verificationUri?: string;
  message?: string;
  error?: string;
};

type PendingCode = { resolve: (code: string) => void; reject: (error: Error) => void };
type LoginState = OAuthSession & { method: string; controller: AbortController; pending?: PendingCode };

const loginStates = new Map<string, LoginState>();
const latestByProvider = new Map<string, string>();

/** ACT: 登录凭据与 settings.json 同目录，权限由 pi 的 CredentialStore 自行管理。 */
export function oauthAuthPath() {
  return resolve(dirname(conf.path), "auth.json");
}

/** ACT: OpenAI 的 "Sign in with ChatGPT" 需要稳定的安装标识，首次登录时生成并持久化。 */
export function oauthDeviceId() {
  const settings = (conf.get("settings", {}) ?? {}) as Record<string, unknown>;
  const existing = typeof settings.oauthDeviceId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settings.oauthDeviceId)
    ? settings.oauthDeviceId : "";
  if (existing) return existing;
  const created = randomUUID();
  conf.set("settings", { ...settings, oauthDeviceId: created });
  return created;
}

/** 每次操作使用独立 runtime，避免共享实例持有过期的凭据快照。 */
async function createAuthRuntime() {
  return ModelRuntime.create({ authPath: oauthAuthPath(), modelsPath: null, refreshOnCreate: false });
}

export async function listOAuthProviders(): Promise<OAuthProvider[]> {
  const runtime = await createAuthRuntime();
  const providers = runtime.getProviders().filter(provider => provider.auth.oauth);
  // ACT: hasConfiguredAuth 只反映创建时的快照；checkAuth 会读取凭据文件，登录后立即可见。
  const configured = await Promise.all(providers.map(async provider => {
    try {
      return Boolean(await runtime.checkAuth(provider.id));
    } catch {
      return false;
    }
  }));
  return providers.map((provider, index) => {
    const oauth = provider.auth.oauth!;
    return {
      id: provider.id,
      name: oauth.name,
      isSubscription: Boolean(oauth.isSubscription),
      loginLabel: oauth.loginLabel ?? null,
      loggedIn: configured[index],
      models: provider.getModels().map(model => ({
        id: model.id, label: model.name, contextWindow: model.contextWindow, maxOutputTokens: model.maxTokens,
        reasoning: Boolean(model.reasoning),
      })),
    };
  });
}

export async function logoutOAuthProvider(providerId: string) {
  const runtime = await createAuthRuntime();
  if (!runtime.getProvider(providerId)?.auth.oauth) throw Object.assign(new Error("该供应商不支持登录授权"), { status: 400 });
  await runtime.logout(providerId);
}

function toSession(state: LoginState): OAuthSession {
  const { id, providerId, state: status, url, instructions, userCode, verificationUri, message, error } = state;
  return { id, providerId, state: status, url, instructions, userCode, verificationUri, message, error };
}

export function getOAuthSession(id: string) {
  const state = loginStates.get(id);
  return state ? toSession(state) : undefined;
}

export function submitOAuthCode(id: string, code: string) {
  const state = loginStates.get(id);
  if (!state || !state.pending) throw Object.assign(new Error("当前登录流程不接受手动授权码"), { status: 400 });
  const pending = state.pending;
  state.pending = undefined;
  pending.resolve(code);
}

function applyEvent(state: LoginState, event: AuthEvent) {
  if (event.type === "auth_url") {
    state.url = event.url;
    state.instructions = event.instructions;
  } else if (event.type === "device_code") {
    state.userCode = event.userCode;
    state.verificationUri = event.verificationUri;
    state.url = event.verificationUri;
  } else if (event.type === "info") {
    state.message = event.message;
  } else if (event.type === "progress") {
    state.message = event.message;
  }
}

/** ACT: 登录在后台进行，HTTP 只观察状态；手动授权码通过 submitOAuthCode 回传。 */
export async function startOAuthLogin(providerId: string, method = "browser"): Promise<OAuthSession> {
  const runtime = await createAuthRuntime();
  const provider = runtime.getProvider(providerId);
  const oauth = provider?.auth.oauth;
  if (!provider || !oauth) throw Object.assign(new Error("该供应商不支持登录授权"), { status: 400 });

  const previous = latestByProvider.get(providerId);
  if (previous) {
    const old = loginStates.get(previous);
    if (old?.state === "waiting") old.controller.abort();
  }

  const id = randomUUID();
  const controller = new AbortController();
  const state: LoginState = { id, providerId, state: "waiting", method, controller };
  loginStates.set(id, state);
  latestByProvider.set(providerId, id);

  const interaction = {
    signal: controller.signal,
    notify(event: AuthEvent) { applyEvent(state, event); },
    prompt(prompt: AuthPrompt): Promise<string> {
      if (prompt.type === "select") {
        const option = prompt.options.find(item => item.id === method) ?? prompt.options[0];
        if (!option) return Promise.reject(new Error("该供应商没有可用的登录方式"));
        state.method = option.id;
        return Promise.resolve(option.id);
      }
      if (prompt.type === "manual_code") {
        return new Promise<string>((resolveCode, rejectCode) => {
          state.pending = { resolve: resolveCode, reject: rejectCode };
          controller.signal.addEventListener("abort", () => rejectCode(Object.assign(new Error("登录已取消"), { name: "AbortError" })), { once: true });
        });
      }
      return Promise.reject(new Error(t`该供应商需要暂不支持的登录步骤：${prompt.type}`));
    },
  };

  const deviceId = oauthDeviceId();
  void runtime.login(providerId, "oauth", interaction as Parameters<typeof runtime.login>[2], { getDeviceId: () => deviceId })
    .then(() => { state.state = "done"; state.message = t`登录成功`; })
    .catch((error: unknown) => {
      state.state = controller.signal.aborted ? "error" : "error";
      state.error = error instanceof Error ? error.message : String(error);
    })
    .finally(() => {
      if (state.pending) state.pending.reject(Object.assign(new Error("登录流程已结束"), { name: "AbortError" }));
      state.pending = undefined;
    });

  return toSession(state);
}
