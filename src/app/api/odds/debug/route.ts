import { NextResponse } from 'next/server';

/**
 * Temporary diagnostic endpoint to probe Polymarket's gamma-api from the
 * Vercel server (the upstream is unreachable from local dev DNS).
 *
 * Examples:
 *   /api/odds/debug?endpoint=events&slug=fifa-world-cup-2026
 *   /api/odds/debug?endpoint=markets&slug=fifa-world-cup-2026
 *   /api/odds/debug?endpoint=events&q=world+cup
 *   /api/odds/debug?raw=https://gamma-api.polymarket.com/events?slug=fifa-world-cup-2026
 *
 * Returns the upstream JSON (truncated for readability) so we can see the
 * actual response shape and pick the right slug/endpoint before patching
 * the real /api/odds route. Remove this file once Polymarket integration is
 * confirmed working.
 */
export const revalidate = 0;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const raw = u.searchParams.get('raw');
  const endpoint = u.searchParams.get('endpoint') || 'events';
  const slug = u.searchParams.get('slug');
  const q = u.searchParams.get('q');

  const target = raw
    ? raw
    : (() => {
        const base = `https://gamma-api.polymarket.com/${endpoint}`;
        const params = new URLSearchParams();
        if (slug) params.set('slug', slug);
        if (q) params.set('q', q);
        params.set('limit', '20');
        return `${base}?${params.toString()}`;
      })();

  let status = 0;
  let body: unknown = null;
  let error: string | null = null;
  try {
    const res = await fetch(target, { cache: 'no-store' });
    status = res.status;
    body = await res.json();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Summarize structure so the JSON is readable even when huge.
  let summary: unknown = null;
  if (Array.isArray(body)) {
    summary = {
      type: 'array',
      length: body.length,
      first: body[0] && Object.fromEntries(
        Object.entries(body[0] as Record<string, unknown>).map(([k, v]) => [
          k,
          Array.isArray(v) ? `[Array(${v.length})]` :
          typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' :
          v,
        ]),
      ),
      slugs: body.slice(0, 30).map((x) => (x as { slug?: string }).slug).filter(Boolean),
      titles: body.slice(0, 30).map((x) => (x as { title?: string }).title).filter(Boolean),
    };
  }

  return NextResponse.json({ target, status, error, summary, body }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
