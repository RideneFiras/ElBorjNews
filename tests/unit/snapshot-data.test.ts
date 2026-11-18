import { describe, it, expect } from 'vitest';
import { snapshotCards, snapshotValue, type PublicDataSnapshot } from '@/lib/data/snapshot-data';
import type { ArticleCard } from '@/lib/data/types';
const card=(id:number,patch:Partial<ArticleCard>={}):ArticleCard=>({
  id:String(id),public_id:id,language:'ar',translation_group_id:null,status:'published',kicker_override:null,title:`خبر ${id}`,subtitle:null,slug:`news-${id}`,excerpt:null,category_id:'main',format_id:null,location:null,byline_override:null,is_breaking:false,breaking_until:null,is_featured:false,is_sponsored:false,sponsor_name:null,allow_ads:false,reading_minutes:1,published_at:'2026-11-17T00:00:00Z',first_published_at:null,content_updated_at:null,is_demo:false,cover_caption:null,cover_credit:null,cover_alt:null,category_slug:'news',category_name_ar:'أخبار',category_name_fr:null,category_color:'#000',category_parent_id:null,format_slug:null,format_name_ar:null,format_name_fr:null,format_show_as_kicker:false,format_is_opinion:false,cover:null,authors:[],tag_ids:[],extra_category_ids:[],...patch,
});
const snapshot:PublicDataSnapshot={captured_at:'2026-11-18T00:00:00Z',settings:[],cards:[card(1,{tag_ids:['tag1'],extra_category_ids:['extra']}),card(2,{category_id:'other',is_featured:true})],homepage:[],categories:[],formats:[],menus:[],bodies:[{id:'1',public_id:1,body_html:'<p>النص</p>',body_text:'النص',correction_note_ar:'تصحيح',correction_note_fr:null,seo_title:null,seo_description:null,canonical_url:null,updated_at:'2026-11-17T00:00:00Z',og_media_id:null}],pages:null,tags:[]};
describe('original-template snapshot data',()=>{
  it('preserves count while paging and does not mutate the export',()=>{
    const before=JSON.stringify(snapshot);const result=snapshotCards(snapshot,{langs:['ar'],limit:1,offset:1});
    expect(result.total).toBe(2);expect(result.items[0]?.public_id).toBe(2);expect(JSON.stringify(snapshot)).toBe(before);
  });
  it('honours language, extra categories, tags, featured and exclusions',()=>{
    expect(snapshotCards(snapshot,{langs:['fr']}).items).toEqual([]);
    expect(snapshotCards(snapshot,{langs:['ar'],categoryIds:['extra'],includeExtra:true}).items.map(a=>a.public_id)).toEqual([1]);
    expect(snapshotCards(snapshot,{langs:['ar'],tagId:'tag1'}).items.map(a=>a.public_id)).toEqual([1]);
    expect(snapshotCards(snapshot,{langs:['ar'],featured:true,excludeIds:['2']}).items).toEqual([]);
  });
  it('reconstructs existing article models including correction notes',()=>{
    const result=snapshotValue(snapshot,'article',[1]);expect(result.found).toBe(true);
    if(result.found) expect(result.value).toMatchObject({public_id:1,title:'خبر 1',body_html:'<p>النص</p>',correction_note_ar:'تصحيح',tags:[]});
    expect(snapshotValue(snapshot,'article',[999])).toEqual({found:true,value:null});
  });
  it('keeps the requested order for related cards',()=>{
    expect(snapshotValue(snapshot,'cards-by-ids',[['2','1']])).toMatchObject({found:true,value:[{public_id:2},{public_id:1}]});
  });
  it('uses the normal settings model and defaults',()=>{
    const result=snapshotValue(snapshot,'settings',[]);expect(result.found).toBe(true);
    if(result.found) expect(result.value).toHaveProperty('site_name');
  });
  it('never handles unknown or authenticated read models',()=>{
    expect(snapshotValue(snapshot,'admin_list_users',[])).toEqual({found:false});
    expect(snapshotValue(snapshot,'session',[])).toEqual({found:false});
  });
  it('searches only the exported published cards and bodies',()=>{
    expect(snapshotValue(snapshot,'search',['النص',null,null,null,20,0])).toMatchObject({found:true,value:{total:1,items:[{public_id:1}]}});
  });
});
