# Comvia Codex

Keep work local, evidence-led, and small in context.

- Use `$comvia-requirements` for a reported behavior, bug/CR classification, acceptance criteria, or implementation-ready scope.
- Use `$comvia-nextjs-change` for a Next.js/React/TypeScript implementation or bug fix.
- Treat these as roles: Analyst is read-only; Implementer changes code. Default to one focused agent. Delegate only for genuinely independent work that benefits from it.
- Start with `rg` and read only the files, symbols, and documentation sections relevant to the request. Do not load `.claude/memory*.md` or full specification archives unless the request directly depends on them.
- Preserve existing work outside the requested scope. Do not change synced `.mdc` contracts unless explicitly asked.
- After a code change is complete and its relevant verification passes, commit the task-scoped files and push the commit to branch `dev`. Do not include unrelated working-tree changes; report if `dev` cannot be safely used.
