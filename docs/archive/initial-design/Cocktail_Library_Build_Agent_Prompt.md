# Build-Agent Prompt — Cocktail Library

Copy the prompt below into Codex or Claude Code after placing `Cocktail_Library_Development_Spec.md` and `Cocktail_Library_Mindmaps.md` in the project root.

---

You are building a production-minded MVP named **Cocktail Library**.

Read these files completely before changing anything:

1. `Cocktail_Library_Development_Spec.md`
2. `Cocktail_Library_Mindmaps.md`

Treat the development specification as authoritative. Do not silently expand, remove, or reinterpret product scope. If the repository already contains code, inspect it first and preserve unrelated work.

## Product outcome

Build a responsive, mobile-first, invite-only cocktail and home-bar web app. Each user has a private ingredient inventory. The app matches that inventory against shared and private recipes, identifies perfect/good-enough/almost matches, and recommends useful common purchases. Users can create private recipes and publish them to registered members. The administrator controls canonical data and can unpublish community recipes without deleting the owner's copy.

## Required stack

- React
- Vite
- JavaScript only—do not convert the project to TypeScript
- Supabase PostgreSQL
- Supabase Auth with email/password and Google
- Supabase Data API
- Supabase migrations and seed files
- Supabase Edge Functions or protected database functions only where elevated backend logic is required
- Responsive CSS suitable for mobile, tablet, and laptop

Do not add a custom Node/Express API unless a concrete requirement cannot be safely implemented through Supabase. Explain the blocker and wait before adding one.

## Mandatory project continuity files

Before implementing the first feature, create these three files in the repository root if they do not already exist:

### `CLAUDE.md`

This is the durable instruction entry point for Claude Code. It should contain:

- instruction to read `AGENTS.md`, `current-context.md`, the development specification, and the mind maps before working;
- the authoritative product-document order;
- required stack and non-negotiable architecture rules;
- essential commands for development, tests, linting, builds, and Supabase migrations;
- security rules, including Row Level Security and secret handling;
- a concise definition of a completed development chunk;
- instruction to update the continuity files after completing a chunk.

Keep this file concise and durable. Do not turn it into a progress diary or copy the entire development specification into it.

### `AGENTS.md`

This is the shared instruction file for Codex and other coding agents. It should contain:

- repository structure and ownership boundaries;
- coding and naming conventions;
- JavaScript-only requirement;
- separation between React UI, data-access services, and pure domain logic;
- database migration and Row Level Security expectations;
- testing and verification requirements;
- rules for preserving unrelated work;
- rules for asking before materially changing scope or architecture;
- commit guidance and Conventional Commit expectations;
- instruction to read and update `current-context.md` around every development chunk.

If more specific `AGENTS.md` files are later added inside subdirectories, document their scope and keep instructions consistent.

### `current-context.md`

This is the concise living handoff document. Initialize it with:

- current phase and current development chunk;
- last completed chunk;
- what is implemented and verified;
- what remains incomplete;
- current blockers or open questions;
- important decisions made during implementation and their reasons;
- database migrations or environment changes introduced;
- tests/build checks most recently run and their results;
- exact next recommended action;
- files or areas most relevant to that next action.

Do not store secrets, credentials, access tokens, or long raw logs in this file.

### Maintenance protocol

A **development chunk** is a coherent, verifiable unit of work such as authentication setup, an inventory workflow, the availability engine, or an admin import step—not every small file edit.

At the start of every work session or chunk:

1. read `CLAUDE.md` when using Claude Code;
2. read every applicable `AGENTS.md`;
3. read `current-context.md`;
4. inspect the actual repository state before trusting the context file.

At the end of every completed chunk:

1. run the relevant verification;
2. update `current-context.md` with the verified result and next action;
3. update `CLAUDE.md` or `AGENTS.md` only when a durable command, convention, architectural rule, or repository fact has genuinely changed;
4. remove or correct stale instructions rather than appending contradictions;
5. include the documentation updates in the same proposed commit as the chunk they describe.

The repository and tests are the source of truth. If a continuity file disagrees with the code, investigate and correct the file before proceeding.

## Architectural rules

- Keep React components separate from data access and domain logic.
- Provide a central service/repository layer for Supabase calls so a future client can reuse the API contract.
- Put availability matching, measurement conversion, recommendation rules, and import validation in pure/testable modules.
- Use runtime schemas to validate JavaScript data, especially batch imports and complex recipe forms.
- Store liquid quantities canonically in millilitres and convert only for display.
- Never use ingredient-name similarity for recipe matching.
- Separate generic ingredient types from specific products.
- A product must map to an existing ingredient type.
- Do not allow a member to create a new ingredient type.
- Do not put secrets or the Supabase service-role key in browser code.
- Apply Row Level Security to every exposed table and test it with multiple identities.
- Commit database behavior as migrations rather than undocumented dashboard changes.
- Do not add an AI API. The application only provides a copyable prompt and accepts validated JSON.
- Do not fabricate a large cocktail catalog. Create only the minimal clearly labeled development fixtures needed to test behavior; the real catalog enters through batch import.

## Mandatory domain behavior

Availability states:

- `perfect`: all required, optional, and garnish components are satisfied;
- `good_enough`: every required component is satisfied, but optional/garnish items are missing;
- `almost`: exactly one required component is missing;
- `unavailable`: two or more required components are missing.

Valid substitutions and mapped products count as satisfying a requirement. Each result must expose its missing required and optional items so the UI can explain the classification.

Purchase recommendations must begin with recipes missing one required item. Prefer Favorites, Want to Make, classics, and administrator-marked essential/common ingredients. Suppress specialized/niche ingredients from general suggestions unless they complete a Favorite/Want to Make recipe or the user is inspecting that specific cocktail.

## Access model

- Invite-only application membership
- Expiring, revocable, single-use invitation links
- Email/password and Google authentication
- Authentication without valid membership grants no app-data access
- Shared classic recipes are managed by the administrator
- User recipes are private by default
- A user can publish an owned recipe to all registered members
- The administrator can unpublish a community recipe
- Administrative unpublishing must preserve the owner's private access and data
- Inventories, Favorites, and Want to Make lists are private per user

## UI expectations

- Implement both dark and light themes.
- Use a restrained neon cocktail-bar visual language.
- Do not require photographs.
- Flat SVG glass/bottle/liquid-color representations are allowed.
- Keep glow decorative and preserve accessible contrast.
- Build phone workflows first, then adapt them for tablet and desktop.
- Provide deliberate loading, empty, error, validation, and permission-denied states.
- Do not rely on color alone for availability.

## Implementation order

Work in these phases and verify each phase before proceeding:

1. Inspect the repository, create or reconcile `CLAUDE.md`, `AGENTS.md`, and `current-context.md`, then produce a concise implementation plan.
2. Establish application shell, routing, environment handling, and design tokens.
3. Create database migrations, seed taxonomies, profiles, memberships, invitations, roles, and RLS.
4. Implement authentication and invitation redemption.
5. Implement ingredient/product catalog and private My Bar inventory.
6. Implement recipes, components, substitution groups, families, and relationships.
7. Implement unit preferences and conversion.
8. Implement and test the availability engine.
9. Implement library browsing, filters, Favorites, and Want to Make.
10. Implement and test purchase recommendations.
11. Implement private recipe editing, publishing, and admin unpublishing.
12. Implement admin catalog tools and schema-driven JSON import preview/validation.
13. Complete responsive, accessibility, security, and deployment QA.

## Testing requirements

At minimum, test:

- all four availability states;
- product-to-generic-type matching;
- valid substitution groups;
- required versus optional/garnish behavior;
- ml/oz display conversion without stored-data mutation;
- recommendation suppression for niche ingredients;
- Favorite/Want to Make recommendation priority;
- import rejection for malformed JSON, unknown units, and unknown ingredient types;
- duplicate import preview;
- owner versus non-owner private recipe access;
- private inventory separation between two users;
- administrator-only catalog mutation;
- member publish and administrator unpublish behavior;
- anonymous and authenticated-non-member access denial;
- invitation expiry, redemption, revocation, and reuse prevention.

## Working style

- Prefer the smallest readable solution that preserves the domain model.
- Avoid premature abstractions and unrelated features.
- Do not replace a requested feature with a mock unless explicitly marking it as incomplete.
- When a choice materially affects security, data ownership, or product behavior, stop and ask.
- For ordinary implementation details, make a reasonable choice and record it.
- Use `current-context.md` as the short progress checklist and update it after every completed development chunk, not only after large phases.
- Keep `CLAUDE.md` and `AGENTS.md` synchronized with durable repository instructions without adding temporary progress noise.
- Run relevant tests, linting, and a production build before reporting completion.
- At each coherent milestone, suggest an appropriate Conventional Commit message, but do not commit unless asked.

## First response

Do not begin by generating the entire application. First:

1. confirm that both specification files and any existing instruction/context files were read;
2. summarize the existing repository state;
3. create or reconcile `CLAUDE.md`, `AGENTS.md`, and `current-context.md`;
4. propose the phase breakdown and first implementation checkpoint;
5. identify only genuine blockers or contradictions.

Then proceed after any required clarification.

---
