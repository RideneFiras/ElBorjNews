import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Evict the persistent public copies when an editor deletes an unused upload. */
export async function evictMedia(paths: string[]) {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.NEXT_INC_CACHE_R2_BUCKET;
  if (!bucket) throw new Error('Missing public media R2 binding');
  await Promise.all(paths.map((path) => bucket.delete(`public-media/v1/${path}`)));
}
