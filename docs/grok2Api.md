# Grok2API

Grok2API is built in to both **Settings → Language models → Add provider** and **Settings → Media models**. The default API Base URL is `http://127.0.0.1:8000/v1`. If Toonflow runs in Docker Desktop, use an address reachable from that container, such as `http://host.docker.internal:8000/v1`.

Create a **Client API key** in the gateway's `/client-keys` page, enable the required models, and enter that key separately in the language and media provider settings. Do not use an admin password, admin JWT or Grok SSO token. Keys are saved in Toonflow's backend settings; inference runs from the backend. Do not commit `data/settings.json`.

Language models use OpenAI chat completions and streaming. The picker fetches the key's actual `/v1/models` catalog, excluding the documented image/video/audio routes. Exact model IDs, including namespaces, are retained. For renamed Model Routes, select the corresponding IDs in the model editor.

The media adapter supports:

- Image generation: `grok-imagine-image-lite`, `grok-imagine-image`, `grok-imagine-image-2.0`; one image per request.
- Single-image editing: `grok-imagine-image-edit`, via JSON `/images/edits`.
- Text-to-video: `grok-imagine-video`, via `/videos/generations`, with integer `duration` of 1–15 seconds (subject to account limits).

The matching gateway source at commit `05b0c53e` rejects image references for Web video despite the integration document's image-to-video example. The built-in video model therefore advertises text mode only. A Build/Console route with image-to-video permissions can be configured separately in the model editor; the adapter forwards one image reference for that use.

Use **Fetch models** in media settings to check the actual catalog with your key. The supplied metadata defines the documented routes; namespace routes inherit that metadata. Renamed media routes need their model type and capabilities configured in the existing model editor.

Video status is polled until `done` or `failed`, for up to ten minutes. Submissions are never automatically retried. Once a task ID is received, subsequent errors include `request_id`; check that existing job in the gateway before submitting again. This adapter does not persist pending jobs or resume them after Toonflow restarts. Public media URLs resolve against the gateway origin. Protected video content is downloaded by the backend with the Client key.

Audio, video editing and video extension require a Console route and quota. They are not enabled by this adapter for the documented Web Heavy account.

Contract: the user's Grok2API integration document exported on 2026-10-12, commit `05b0c53e`. Live inference requires a valid Client key; type checking and builds do not verify model availability, quota or generation results.
