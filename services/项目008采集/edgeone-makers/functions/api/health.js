// EdgeOne Pages Function: /api/health
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type' };
export async function onRequest(ctx) {
  if (ctx.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  return new Response(JSON.stringify({
    status: 'ok', service: 'priceprobe-edge',
    time: new Date().toISOString(),
    cloud_platforms: ['yanxuan', 'miyoupin', 'suning', 'dangdang'],
    registered_platforms: 34,
  }), { headers: { 'Content-Type': 'application/json', ...CORS } });
}
