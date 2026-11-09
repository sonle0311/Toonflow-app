/** ACT: thương hiệu đọc từ biến môi trường để bản phát hành độc lập không cần sửa mã nguồn. */
function text(value: unknown, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

export const appName = text(import.meta.env.VITE_APP_NAME, "Toonflow");
export const repoUrl = text(import.meta.env.VITE_REPO_URL);
export const docsUrl = text(import.meta.env.VITE_DOCS_URL);
export const communityUrl = text(import.meta.env.VITE_COMMUNITY_URL);
