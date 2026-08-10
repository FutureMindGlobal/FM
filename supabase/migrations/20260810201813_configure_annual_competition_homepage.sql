update public.page_sections set content=jsonb_build_object(
  'eyebrow','Five levels. One annual journey.',
  'title','Grow every year.',
  'accent_title','Progress with purpose.',
  'description','Students can return annually, receive a new Future Mind result and progress through levels designed for their developmental stage.',
  'items',(select jsonb_agg(jsonb_build_object(
    'label',name,'ages','Ages '||min_age||'-'||max_age,
    'kicker','Annual competition level','title',name||' Challenge',
    'text',description,
    'features','Age-appropriate scenarios|Personal strengths profile|Verifiable recognition'
  ) order by display_order) from public.competition_levels)
) where section_key='pathways' and page_path='/';
