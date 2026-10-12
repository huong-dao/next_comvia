---
name: comvia-nextjs-change
description: Implement a focused Comvia frontend change in its Next.js, React, TypeScript, and Tailwind codebase. Use after requirements are clear, for a requested UI/API behavior change or bug fix; not for broad product analysis or review-only work.
---

## Working set

Use `rg` to find the target route, its nearest component/hook, types, and an existing analogous pattern. Read those files before editing. Read a documentation section only when it defines a behavior or payload touched by the change; never load the full `.claude` archive for routine work.

## Implementation

- Make the smallest coherent change; preserve unrelated working-tree edits.
- Reuse existing primitives, API helpers, path helpers, types, and design tokens before adding new ones.
- Keep server/client component boundaries and existing error/loading behavior intact.
- Do not alter synced `.mdc` contracts. After successful verification, commit only task-scoped files and push the commit to `dev`; stop and report when the branch or working tree makes that unsafe.

## Verification

Run the narrowest relevant check first (normally `npx eslint` on changed source files). Run `npm run build` only when requested or when a change crosses routing, configuration, or shared type boundaries. Report checks run and any checks intentionally not run.

## Handoff

State changed files, behavior delivered, verification result, and commit/push result in at most five bullets. Mention a material assumption or remaining manual check only when it matters.
