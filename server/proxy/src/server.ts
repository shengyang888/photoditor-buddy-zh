/**
 * Optional relay for AI providers that forbid calling them from a browser (fal.ai, Replicate).
 * Not needed for Gemini or OpenAI, which the editor calls directly with the user's key.
 *
 * The user's key is passed per request in the `x-provider-key` header and forwarded; nothing is
 * stored. Run with `npm run proxy` (Node 22.6+ strips TypeScript types natively).
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const PORT = Number(process.env.PORT ?? 8787);
/** Comma-separated list of origins allowed to use this relay, e.g. "https://my-site.com". */
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'
)
  .split(',')
  .map((o) => o.trim());

/** Upstream APIs this relay is willing to talk to. Anything else is rejected. */
const UPSTREAMS: Record<string, { base: string; auth: (key: string) => Record<string, string> }> = {
  fal: { base: 'https://fal.run', auth: (key) => ({ Authorization: `Key ${key}` }) },
  replicate: {
    base: 'https://api.replicate.com',
    auth: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

const app = new Hono();
app.use(
  '*',
  cors({
    origin: ALLOWED_ORIGINS,
    allowHeaders: ['Content-Type', 'x-provider-key'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, upstreams: Object.keys(UPSTREAMS) }));

/**
 * Forwards `/relay/:provider/<path>` to the provider with the caller's key.
 * Example: POST /relay/fal/fal-ai/birefnet with the JSON body fal expects.
 */
app.all('/relay/:provider/*', async (c) => {
  const provider = c.req.param('provider');
  const upstream = UPSTREAMS[provider];
  if (!upstream) return c.json({ error: `Unknown provider "${provider}".` }, 404);
  const key = c.req.header('x-provider-key');
  if (!key) return c.json({ error: 'Missing x-provider-key header.' }, 401);
  const path = c.req.path.replace(`/relay/${provider}`, '');
  const url = `${upstream.base}${path}${new URL(c.req.url).search}`;
  const headers: Record<string, string> = { ...upstream.auth(key) };
  const contentType = c.req.header('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  const body =
    c.req.method === 'GET' || c.req.method === 'HEAD' ? undefined : await c.req.arrayBuffer();
  const response = await fetch(url, {
    method: c.req.method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
  const out = new Headers();
  const responseType = response.headers.get('content-type');
  if (responseType) out.set('Content-Type', responseType);
  return new Response(response.body, { status: response.status, headers: out });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(
    `photoditor-buddy relay listening on http://localhost:${info.port} (allowed origins: ${ALLOWED_ORIGINS.join(', ')})`,
  );
});
