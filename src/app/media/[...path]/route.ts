// Local Next.js development fallback. Production is intercepted before Next boots.
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { serveMedia } from '@/lib/public/media-cache';
import { SUPABASE_URL } from '@/lib/env';

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.NEXT_INC_CACHE_R2_BUCKET) return new Response(null, { status: 503 });
  return serveMedia(request, env.NEXT_INC_CACHE_R2_BUCKET, SUPABASE_URL);
}
export const HEAD = GET;
