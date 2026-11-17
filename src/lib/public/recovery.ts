import { sanitizeArticleHtml } from '../content/sanitize';

interface RecoveryArticle {
  public_id: number; title: string; subtitle: string | null; slug: string | null;
  excerpt: string | null; category_slug: string; category_name_ar: string;
  published_at: string; body_html: string | null; body_text: string | null;
  authors: { name_ar: string }[];
}
export interface RecoverySnapshot {
  captured_at: string;
  settings: { key: string; value: unknown }[];
  categories: { slug: string; name_ar: string; show_in_nav: boolean }[];
  articles: RecoveryArticle[];
}
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const href = (a: RecoveryArticle) => `/ar/article/${a.public_id}${a.slug ? `/${encodeURIComponent(a.slug)}` : ''}`;
const date = (s: string) => new Intl.DateTimeFormat('ar-TN', { dateStyle: 'medium' }).format(new Date(s));

export function isRecoveryRoute(path: string): boolean {
  return /^(?:\/|\/ar\/?|\/fr\/?|\/ar\/(?:article\/\d+(?:\/[^/]+)?|section\/[^/]+(?:\/page\/\d+)?|latest(?:\/page\/\d+)?|search|rss\.xml)|\/(?:sitemap|news-sitemap)\.xml)$/.test(path);
}

export function renderRecovery(request: Request, data: RecoverySnapshot): Response {
  const url = new URL(request.url);
  const base = url.origin;
  if (url.pathname === '/' || /^\/fr\/?$/.test(url.pathname)) return Response.redirect(new URL('/ar',base),307);
  const headers = { 'Cache-Control': 'public, max-age=30', 'X-Public-Recovery': 'snapshot', 'X-Snapshot-Date': data.captured_at, 'X-Content-Type-Options': 'nosniff' };
  if (url.pathname.endsWith('sitemap.xml')) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${data.articles.map(a => `<url><loc>${esc(base + href(a))}</loc></url>`).join('')}</urlset>`;
    return new Response(request.method === 'HEAD' ? null : xml, { headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' } });
  }
  if (url.pathname.endsWith('/rss.xml')) {
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>البرج</title><link>${esc(base)}/ar</link><description>جريدة إلكترونية مستقلّة</description>${data.articles.slice(0,40).map(a => `<item><title>${esc(a.title)}</title><link>${esc(base + href(a))}</link><guid>${esc(base + href(a))}</guid><description>${esc(a.excerpt)}</description></item>`).join('')}</channel></rss>`;
    return new Response(request.method === 'HEAD' ? null : rss, { headers: { ...headers, 'Content-Type': 'application/rss+xml; charset=utf-8' } });
  }
  const articleId = url.pathname.match(/^\/ar\/article\/(\d+)/)?.[1];
  const article = articleId ? data.articles.find(a => a.public_id === Number(articleId)) : undefined;
  const section = url.pathname.match(/^\/ar\/section\/([^/]+)/)?.[1];
  let sectionSlug: string | undefined;
  try { sectionSlug = section ? decodeURIComponent(section) : undefined; } catch { return new Response(null,{status:404}); }
  const category = sectionSlug ? data.categories.find(c => c.slug === sectionSlug) : undefined;
  const q = (url.searchParams.get('q') ?? '').trim().slice(0,200);
  const page = Math.min(1000,Math.max(1,Number(url.pathname.match(/\/page\/(\d+)/)?.[1] ?? url.searchParams.get('page')) || 1));
  const filtered = data.articles.filter(a => (!sectionSlug || a.category_slug === sectionSlug) && (!q || `${a.title} ${a.body_text ?? ''}`.toLocaleLowerCase('ar').includes(q.toLocaleLowerCase('ar'))));
  const title = article?.title ?? category?.name_ar ?? (q ? `نتائج البحث: ${q}` : 'آخر الأخبار');
  const notFound = (articleId && !article) || (section && !category);
  const card = (a: RecoveryArticle, i: number) => `<article class="card ${i === 0 ? 'lead' : ''}"><a class="category" href="/ar/section/${encodeURIComponent(a.category_slug)}">${esc(a.category_name_ar)}</a><h2><a href="${href(a)}">${esc(a.title)}</a></h2>${a.excerpt ? `<p>${esc(a.excerpt)}</p>` : ''}<time datetime="${esc(a.published_at)}">${esc(date(a.published_at))}</time></article>`;
  const content = notFound ? '<h1>الصفحة غير موجودة</h1><a href="/ar">العودة إلى الرئيسية</a>' : article
    ? `<article class="reading"><a class="category" href="/ar/section/${encodeURIComponent(article.category_slug)}">${esc(article.category_name_ar)}</a><h1>${esc(article.title)}</h1>${article.subtitle ? `<p class="subtitle">${esc(article.subtitle)}</p>` : ''}<p class="byline">${esc(article.authors.map(a => a.name_ar).join('، '))} · ${esc(date(article.published_at))}</p><div class="body">${sanitizeArticleHtml(article.body_html).replace(/<img\b[^>]*>/gi,'')}</div><a href="/ar">← آخر الأخبار</a></article>`
    : `<div class="section-heading"><h1>${esc(title)}</h1><span>${filtered.length} خبرًا</span></div><div class="grid">${filtered.slice((page-1)*24,page*24).map(card).join('') || '<p>لا توجد أخبار مطابقة.</p>'}</div>${page*24 < filtered.length ? `<a class="more" href="${esc(url.pathname.replace(/\/page\/\d+$/,''))}?page=${page+1}${q ? `&amp;q=${encodeURIComponent(q)}` : ''}">المزيد من الأخبار ←</a>` : ''}`;
  const canonical = article ? href(article) : url.pathname;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | البرج</title><link rel="canonical" href="${esc(base + canonical)}"><meta name="description" content="${esc(article?.excerpt ?? 'البرج — جريدة إلكترونية مستقلّة')}"><meta property="og:title" content="${esc(title)}"><meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:url" content="${esc(base + canonical)}"><style>
*{box-sizing:border-box}body{margin:0;background:#faf9f6;color:#171c26;font:18px/1.8 Tahoma,Arial,sans-serif}a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}header{border-top:6px solid #9b242d;border-bottom:1px solid #c9c8c4;background:#fff}.masthead{max-width:1240px;margin:auto;padding:28px 24px 20px;display:flex;justify-content:space-between;align-items:center;gap:24px}.brand{font:bold 68px/1 Tahoma,Arial,sans-serif;letter-spacing:-4px}.tagline{font-size:14px;color:#575c65;margin-top:10px}nav{border-top:1px solid #deded8;padding:12px 24px;display:flex;gap:24px;overflow:auto;white-space:nowrap;max-width:1240px;margin:auto;font-size:15px}.notice{text-align:center;background:#eeeae1;border-bottom:1px solid #ded8cc;padding:8px 16px;font-size:13px;color:#555}main{max-width:1240px;padding:36px 24px 60px;margin:auto;min-height:70vh}.section-heading{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #171c26;margin-bottom:28px}.section-heading h1{font-size:28px;margin:0 0 10px}.section-heading span{font-size:13px;color:#666}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px}.card{border-bottom:1px solid #ccc;padding-bottom:24px}.card.lead{grid-column:span 2}.card h2{line-height:1.6;font-size:25px;margin:8px 0 12px}.card.lead h2{font-size:35px}.card p{font-size:16px;color:#52565e;line-height:1.9}.category{color:#982b35;font-size:14px;font-weight:bold}time,.byline{font-size:13px;color:#676b72}.reading{max-width:800px;margin:auto}.reading h1{font-size:40px;line-height:1.65;margin:14px 0}.subtitle{font-size:23px;color:#555}.body{font-size:20px;line-height:2.15;margin:36px 0}.body p{margin:0 0 24px}.body a{color:#982b35;text-decoration:underline}.body iframe{max-width:100%}.body figure{margin:24px 0}.body figcaption{font-size:14px;color:#666}form{display:flex;gap:8px}input,button{font:inherit;font-size:14px;border:1px solid #bbb;padding:8px 12px;background:#fff}button{background:#171c26;color:#fff;cursor:pointer}.more{display:inline-block;margin-top:32px;border:1px solid #222;padding:8px 24px}footer{border-top:2px solid #171c26;padding:28px 24px;text-align:center;font-size:14px}@media(max-width:720px){.masthead{padding:22px 18px}.brand{font-size:53px}.masthead form{display:none}.grid{grid-template-columns:1fr}.card.lead{grid-column:auto}.card.lead h2{font-size:29px}.reading h1{font-size:29px}.body{font-size:18px}main{padding:26px 18px}nav{gap:20px}}
</style></head><body><header><div class="masthead"><a href="/ar"><div class="brand">البرج</div><div class="tagline">جريدة إلكترونية مستقلّة</div></a><form action="/ar/search"><input name="q" aria-label="ابحث في الأخبار" placeholder="ابحث في الأخبار" value="${esc(q)}"><button>بحث</button></form></div><nav><a href="/ar">الرئيسية</a>${data.categories.filter(c=>c.show_in_nav).map(c=>`<a href="/ar/section/${encodeURIComponent(c.slug)}">${esc(c.name_ar)}</a>`).join('')}<a href="/ar/latest">آخر الأخبار</a></nav></header><div class="notice">نسخة للقراءة · الصور وتحديث الأخبار متوقفان مؤقتًا · آخر تحديث: ${esc(date(data.captured_at))}</div><main>${content}</main><footer><a href="/ar">البرج — جريدة إلكترونية مستقلّة</a> · <a href="/ar/rss.xml">RSS</a></footer></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, { status: notFound ? 404 : 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' https: data:; frame-src https://www.youtube-nocookie.com https://www.facebook.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" } });
}

// This contains only a health result, never a request, body, credentials or user data.
let health = { checked: 0, restricted: true };
export async function recoveryResponse(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['GET','HEAD'].includes(request.method) || !isRecoveryRoute(url.pathname) || !env.NEXT_INC_CACHE_R2_BUCKET) return null;
  if (Date.now() - health.checked > 60000) {
    try {
      const check = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_settings?select=key&limit=1`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(4000) });
      health = { checked: Date.now(), restricted: !check.ok };
      await check.body?.cancel();
    } catch { health = { checked: Date.now(), restricted: true }; }
  }
  if (!health.restricted) return null;
  const snapshot = await env.NEXT_INC_CACHE_R2_BUCKET.get('public-recovery/v1/snapshot.json');
  if (!snapshot) return null;
  return renderRecovery(request, await snapshot.json<RecoverySnapshot>());
}
