-- Data-correction migration, not a schema change.
--
-- 2026-09-14 audit of the layered-drink color feature found the Recipe
-- Import prompt and GlassSvg.jsx's gradient direction disagreed about
-- which of liquid_color/liquid_color_2 renders at the top vs. bottom of
-- the glass. Settled convention (see src/domain/glassGradient.js and
-- src/schemas/recipeImport.js): liquid_color is always the BOTTOM/base
-- color, liquid_color_2 is always the TOP/upper color.
--
-- Cross-checking every stored recipe with both colors set against its own
-- ingredients/steps found Tequila Sunrise was the one recipe authored
-- backwards relative to that convention (grenadine sinks to and colors the
-- BOTTOM of the glass red; orange juice stays the distinct TOP layer) -
-- every other layered recipe (Bramble, Dark 'N' Stormy, Green Fallout
-- Shooter - the last one's own steps literally say "bottom layer"/"top
-- layer") already matched it. Swaps this one recipe's two color values by
-- primary key, guarded by the exact values found at audit time so this is
-- a no-op if they've since changed. Nothing else about this row is
-- touched. The unrelated Zombie/Zombie (Home Bar Spiced & Dark Spec)
-- second-color data-quality question found in the same audit is
-- deliberately NOT addressed here.
update public.recipes
set liquid_color = '#d92323', -- grenadine, sinks to the bottom
    liquid_color_2 = '#f5a623' -- orange juice, stays the top layer
where id = '7463b603-b711-467d-b02b-dc1832810552' -- Tequila Sunrise
  and liquid_color = '#f5a623'
  and liquid_color_2 = '#d92323';
