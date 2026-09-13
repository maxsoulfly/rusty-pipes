# Figma Prompt — Cocktail Library

Design a complete responsive UI system and MVP screen set for an invite-only web app called **Cocktail Library**.

## Product purpose

The app remembers which cocktail ingredients a user owns and shows:

- cocktails they can make perfectly;
- cocktails they can make without optional ingredients or garnishes;
- cocktails missing exactly one required ingredient;
- useful common ingredients to buy next.

It also contains shared classic recipes, published community recipes, private user recipes, Favorites, Want to Make, cocktail families, substitutions, glasses, and a private My Bar inventory.

## Design personality

Create a sophisticated **neon cocktail-bar / Cocktails & Dreams feeling** without copying an existing logo or movie artwork.

The interface should feel:

- atmospheric but practical;
- playful but not childish;
- contemporary rather than retro-kitsch;
- quick to scan in a dim room;
- welcoming to someone who is not a cocktail expert.

Use restrained cyan, electric blue, magenta, violet, and occasional warm coral/amber accents. Glow should be localized around selected controls, status accents, or decorative lines—not placed behind every card.

## Themes

Create linked dark and light themes using semantic color tokens.

### Dark

- Deep near-black or midnight-navy background
- Slightly lighter layered surfaces
- High-contrast off-white text
- Controlled neon accents
- Avoid excessive transparent glassmorphism and low-contrast grey text

### Light

- Warm off-white or very pale neutral background
- White or softly tinted cards
- Dark navy/charcoal text
- The same neon identity adapted into deeper, accessible accent colors
- Do not make light mode look like an unrelated application

All states must remain distinguishable without relying only on color.

## Visual assets

Do not use recipe photography.

Create a small reusable flat-vector system using:

- glass silhouettes;
- simplified bottle silhouettes;
- liquid color fills;
- citrus wedges, herbs, ice, and garnish symbols;
- abstract neon lines or signs.

These are category and mood representations, not exact trademarked bottle labels. Keep SVG shapes simple enough to implement in a React application.

## Core status system

Design four clear availability states with icon, label, and color/shape treatment:

1. **Perfect** — all required, optional, and garnish ingredients available
2. **Good enough** — all required ingredients available; extras missing
3. **Almost** — one required ingredient missing
4. **Unavailable** — two or more required ingredients missing

The missing ingredient must be immediately visible on Almost cards. Do not communicate status through color alone.

## Mobile-first navigation

Design primarily for a 390 × 844 px mobile frame.

Bottom navigation:

1. Home
2. Cocktails
3. My Bar
4. Lists
5. More

Include a clear Add action for creating a private recipe or adding a catalog-mapped product. Keep frequent actions reachable with one hand and use touch targets of at least 44 × 44 px.

Then adapt key screens to:

- tablet around 834 px wide;
- laptop/desktop around 1440 px wide.

Desktop may use a side navigation, denser cards, and split detail layouts. Do not create desktop-only core functionality.

## Required mobile screens

### 1. Welcome / invitation

- Branded welcome state reached from a private invitation
- Invitation validity feedback
- Continue with Google
- Create account with email and password
- Expired or already-used invitation state

### 2. Sign in

- Google login
- Email and password
- Password recovery entry point
- Clear invite-only explanation

### 3. Home dashboard

- Compact greeting/header
- Search shortcut
- Horizontal or compact sections for Perfect and Good Enough
- Almost section emphasizing the missing item
- Buy Next recommendation with a plain-language reason such as “Unlocks 4 classics”
- Shortcuts to Favorites and Want to Make

Avoid a dashboard dominated by decorative statistics.

### 4. Cocktail library

- Search
- Filter and sort controls
- Filter chips for availability, taste, base spirit, family, glass, and source
- Recipe cards showing glass/vector, name, taste tags, source badge, availability, and missing count
- Useful empty and no-results states

### 5. Cocktail details

- Name, source, author where relevant
- Flat glass/liquid representation
- Availability summary
- Ingredient checklist with amounts
- ml/oz display toggle or current unit preference
- Required, optional, garnish, and substitution treatment
- Short preparation steps
- Taste tags
- Glass
- Related family and variations
- Favorite and Want to Make controls
- Edit/share controls only when the user owns the recipe

### 6. My Bar

- Search universal catalog
- Category sections or filter chips
- Fast owned/not-owned toggles
- Brand/product displayed beneath generic ingredient type where useful
- Owned-only filter
- Add Product action
- No quantity or bottle-level controls

### 7. Controlled Add Product form

- Product name
- Existing ingredient type selector—required
- Optional brand/maker
- Homemade indicator
- Optional flat display color/category symbol
- Explanation that new ingredient types require administrator approval/creation
- Preview of which generic recipe requirement it will satisfy

### 8. Recipe editor

- Name and description
- Ingredient rows with searchable type selector
- Quantity and semantic unit
- Required/optional/garnish role
- Substitution grouping
- Reorder components
- Glass selector
- Preparation
- Taste tags
- Family and variation links
- Private/shared visibility with clear explanation
- Availability preview

Handle this as a mobile form without making it feel like a spreadsheet.

### 9. Lists

- Favorites tab
- Want to Make tab
- Availability filters inside each list
- Missing-item visibility for Want to Make

### 10. Settings / More

- Unit preference: ml or oz
- Theme: system, dark, light
- Profile
- Sign out
- Admin entry visible only to administrator

### 11. Admin screens

- Shared classics management
- Ingredient types and products
- Glasses, taste tags, and families
- Invitations with generate, copy, revoke, expiry and redeemed state
- Community recipe moderation with Unpublish action and confirmation
- Batch import with:
  - import-type selector;
  - copy formatting prompt;
  - JSON paste area;
  - validation results;
  - additions/updates/duplicate preview;
  - final confirmation.

## Component set

Create reusable component variants for:

- recipe card;
- ingredient/product row;
- owned toggle;
- availability badge;
- source badge: Classic, Community, Private;
- taste tag;
- filter chip;
- bottom navigation and desktop side navigation;
- search field;
- segmented control;
- button hierarchy;
- dialog and bottom sheet;
- toast/notification;
- empty, loading/skeleton, validation, error, and permission-denied states;
- invitation status;
- recipe ingredient row;
- admin import result row.

## Accessibility and usability

- Meet WCAG AA contrast for normal text and controls.
- Do not use neon glow as the only focus indicator.
- Provide visible keyboard focus states.
- Support dynamic text without clipping core actions.
- Use icons together with text for unfamiliar actions.
- Keep preparation and ingredient text highly readable.
- Confirm destructive/moderation actions.
- Make theme and measurement preferences immediately understandable.

## Deliverables

Produce:

1. color, typography, spacing, radius, elevation, and glow tokens;
2. dark and light theme foundations;
3. reusable component library with states and variants;
4. all required mobile screens;
5. tablet adaptations for Home, Library, Details, My Bar, and Recipe Editor;
6. desktop adaptations for the same core screens plus Admin;
7. clickable prototype flows for:
   - invitation → account creation → first My Bar setup;
   - My Bar update → newly available cocktail;
   - Almost cocktail → missing ingredient → Buy Next;
   - private recipe creation → publish;
   - admin batch import preview → confirm;
   - admin unpublishes a community recipe.

Prioritize clarity and implementation feasibility. Avoid decorative screens that do not correspond to the specified product behavior.

