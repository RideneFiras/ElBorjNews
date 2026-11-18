import { mergeSettings } from './settings';
import type { ArticleCard, ArticleFull, Category, Format, HomepageSection, MediaRef, MenuItem, StaticPage, Tag } from './types';
import type { CardFilter } from './queries';

export interface PublicDataSnapshot {
  captured_at: string;
  settings: { key: string; value: unknown }[];
  cards: ArticleCard[];
  homepage: HomepageSection[];
  categories: Category[];
  formats: Format[];
  menus: MenuItem[];
  bodies: (Pick<ArticleFull,'id' | 'public_id' | 'body_html' | 'body_text' | 'correction_note_ar' | 'correction_note_fr' | 'seo_title' | 'seo_description' | 'canonical_url' | 'updated_at'> & { og_media_id: string | null })[];
  pages: StaticPage[] | null;
  tags: Tag[] | null;
}

export function snapshotCards(snapshot: PublicDataSnapshot, f: CardFilter) {
  const items = snapshot.cards.filter(a => f.langs.includes(a.language)
    && (!f.categoryIds?.length || f.categoryIds.includes(a.category_id) || (f.includeExtra && a.extra_category_ids.some(id => f.categoryIds!.includes(id))))
    && (!f.tagId || a.tag_ids.includes(f.tagId))
    && (!f.tagIds?.length || a.tag_ids.some(id => f.tagIds!.includes(id)))
    && (!f.formatId || a.format_id === f.formatId)
    && (!f.authorId || a.authors.some(p => p.id === f.authorId))
    && (!f.featured || a.is_featured)
    && (!f.opinion || a.format_is_opinion)
    && (!f.breaking || (a.is_breaking && !!a.breaking_until && Date.parse(a.breaking_until) > Date.now()))
    && (!f.excludeIds?.includes(a.id))
    && (!f.since || Date.parse(a.published_at) >= Date.parse(f.since)));
  const offset = f.offset ?? 0;
  return { items: items.slice(offset,offset + (f.limit ?? 20)), total: items.length };
}

/** Read models for the existing public templates. Never handles authenticated queries. */
export function snapshotValue(snapshot: PublicDataSnapshot, key: string, args: unknown[]): { found: true; value: unknown } | { found: false } {
  const tags = snapshot.tags ?? [];
  const pages = snapshot.pages ?? [];
  const media = new Map<string,MediaRef>();
  for (const a of snapshot.cards) {
    if (a.cover) media.set(a.cover.id,a.cover);
    for (const author of a.authors) if (author.avatar) media.set(author.avatar.id,author.avatar);
  }
  let value: unknown;
  switch (key) {
    case 'settings': {
      const settings = mergeSettings(snapshot.settings);
      settings.logo = { ...settings.logo, path: settings.logo.media_id ? media.get(settings.logo.media_id)?.path ?? null : null };
      value = Object.assign(settings, {
        default_og_path: settings.default_og_media_id ? media.get(settings.default_og_media_id)?.path ?? null : null,
        favicon_path: settings.favicon_media_id ? media.get(settings.favicon_media_id)?.path ?? null : null,
      });
      break;
    }
    case 'categories': value = snapshot.categories; break;
    case 'formats': value = snapshot.formats; break;
    case 'tag-by-slug': value = tags.find(t=>t.slug===args[0]) ?? null; break;
    case 'tags-by-ids': value = tags.filter(t=>(args[0] as string[]).includes(t.id)); break;
    case 'featured-tags': value = tags.filter(t=>t.is_featured); break;
    case 'place-tags': value = tags.filter(t=>t.kind==='place'); break;
    case 'media-by-id': value = media.get(String(args[0])) ?? null; break;
    case 'menu': value = snapshot.menus.filter(m=>m.menu===args[0]); break;
    case 'pages-published': value = pages.filter(p=>p.language===args[0]); break;
    case 'page': value = pages.find(p=>p.language===args[0] && p.slug===args[1]) ?? null; break;
    case 'page-kind': value = pages.find(p=>p.language===args[0] && p.page_kind===args[1]) ?? null; break;
    case 'homepage-sections': value = snapshot.homepage.filter(h=>h.locale===args[0] || h.locale==='both'); break;
    case 'cards': value = snapshotCards(snapshot,args[0] as CardFilter); break;
    case 'cards-by-ids': value = (args[0] as string[]).map(id=>snapshot.cards.find(a=>a.id===id)).filter(Boolean); break;
    case 'article': {
      const card=snapshot.cards.find(a=>a.public_id===Number(args[0]));
      const body=snapshot.bodies.find(a=>a.public_id===Number(args[0]));
      value=card && body ? { ...card,...body,og_media:body.og_media_id ? media.get(body.og_media_id) ?? null : null,tags:tags.filter(t=>card.tag_ids.includes(t.id)) } : null;
      break;
    }
    case 'translations': value=snapshot.cards.filter(a=>a.translation_group_id===args[0]).map(a=>({public_id:a.public_id,language:a.language,slug:a.slug})); break;
    case 'search': {
      const [term,lang,category,since,limit,offset]=args as [string,string|null,string|null,string|null,number,number];
      const phrase=term.toLocaleLowerCase('ar');
      const matches=snapshot.cards.filter(a=>(!lang||a.language===lang) && (!category||a.category_id===category) && (!since||a.published_at>=since)
        && `${a.title} ${snapshot.bodies.find(b=>b.public_id===a.public_id)?.body_text ?? ''}`.toLocaleLowerCase('ar').includes(phrase));
      value={items:matches.slice(offset,offset+limit),total:matches.length};break;
    }
    // These live extras are optional while their backend is unavailable.
    case 'author': {
      const author=snapshot.cards.flatMap(a=>a.authors).find(p=>p.slug===args[0]);
      value=author ? {id:author.id,slug:author.slug,display_name_ar:author.name_ar,display_name_fr:author.name_fr,title_ar:author.title_ar,title_fr:author.title_fr,bio_ar:null,bio_fr:null,email_public:null,social:{},avatar:author.avatar} : null;
      break;
    }
    case 'events-between': case 'events-upcoming': case 'events-article': value=[];break;
    case 'feeds-article-stubs': value=snapshot.cards;break;
    case 'feeds-recent-cards': value=snapshotCards(snapshot,{langs:[args[0] as 'ar'|'fr'],categoryIds:(args[1] as string[]|null)??undefined,limit:Number(args[2])}).items;break;
    case 'feeds-since-cards': value=snapshot.cards.filter(a=>(a.first_published_at??a.published_at)>=String(args[0]));break;
    default: return {found:false};
  }
  return {found:true,value};
}
