# Optional relay server

You do **not** need this for Gemini or OpenAI. The editor calls those directly from the browser
with the user's own key.

Some providers (fal.ai, Replicate) refuse browser calls, so their keys must go through a tiny
server. This folder is that server: it forwards requests and never stores keys.

```bash
npm run proxy                      # starts on http://localhost:8787
curl http://localhost:8787/health  # {"ok":true,"upstreams":["fal","replicate"]}
```

Environment variables (names only, never commit values):

- `PORT` — port to listen on (default 8787)
- `ALLOWED_ORIGINS` — comma-separated list of sites allowed to call the relay

Requests: `POST /relay/fal/<fal path>` or `POST /relay/replicate/<replicate path>` with the
header `x-provider-key: <user key>`. The body is forwarded unchanged.
