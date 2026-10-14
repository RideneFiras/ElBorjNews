-- 2026-10-14, run once after Firas approves (Supabase MCP execute_sql or the SQL editor),
-- then «النظام → إعادة توليد الذاكرة المؤقتة» (or POST /api/revalidate {"all": true}).
-- Content only, no schema change: the colours stay editable in the admin («الأقسام»).

-- 1. One colour per section (clearer design, DECISIONS.md → Design 2026-10-14).
--    Sub-sections take their parent's colour. All pass 5:1 contrast under white text.
update categories set color = v.color
from (values
  ('national', '#B3121B'), ('cap-bon', '#0B5F8C'), ('regions', '#56690F'),
  ('volleyball', '#B8420A'), ('volley-ball', '#B8420A'),
  ('sport', '#1B7339'), ('football', '#1B7339'), ('handball', '#1B7339'), ('basketball', '#1B7339'),
  ('culture', '#8A5600'), ('theatre', '#8A5600'), ('music', '#8A5600'), ('cinema', '#8A5600'),
  ('books', '#8A5600'), ('visual-arts', '#8A5600'), ('heritage', '#8A5600'),
  ('society', '#00707A'), ('education', '#2350A8'), ('economy', '#1E3A5F'),
  ('opinion', '#3D3A36'), ('world', '#4B5563')
) as v(slug, color)
where categories.slug = v.slug;

-- 2. Arabic articles that were saved as French by mistake (new articles defaulted to the
--    admin's language; fixed in code). Only rows whose title is written in Arabic.
update articles set language = 'ar'
where language = 'fr' and title ~ '[ء-ي]';
