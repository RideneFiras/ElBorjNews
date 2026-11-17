-- Run through the authenticated management SQL connection. Export ONLY public data.
-- Store the returned snapshot privately in the existing R2 bucket at
-- public-recovery/v1/snapshot.json; do not commit the content export to Git.
-- SET LOCAL must share a transaction with the SELECT (the management tool does this).
set local role anon;
select json_build_object(
  'captured_at', now(),
  'settings', '[]'::json,
  'categories', (select coalesce(json_agg(c),'[]') from (
    select slug,name_ar,show_in_nav from public.categories
    where is_active=true order by position
  ) c),
  'articles', (select coalesce(json_agg(a order by a.published_at desc),'[]') from (
    select c.public_id,c.title,c.subtitle,c.slug,c.excerpt,c.language,
      c.category_slug,c.category_name_ar,c.published_at,c.authors,
      b.body_html,b.body_text
    from public.article_cards c join public.articles b on b.id=c.id
    where c.language='ar'
  ) a)
) as snapshot;
