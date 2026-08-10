create index if not exists annual_results_level_id_idx on public.annual_results(level_id);
create index if not exists competition_prices_competition_id_idx on public.competition_prices(competition_id);
create index if not exists competition_prices_tier_id_idx on public.competition_prices(tier_id);
create index if not exists country_pricing_tier_id_idx on public.country_pricing(tier_id);
