---
name: comvia-requirements
description: Analyze a Comvia product request or reported behavior into a concise, evidence-backed scope before code changes. Use for bug reports, change requests, missing specifications, and acceptance criteria; not for implementing the fix.
---

## Goal

Turn the request into a decision the next role can act on without loading the entire repository history.

## Investigation

1. Extract the user-visible behavior, affected actor/route, and stated expectation.
2. Use `rg` to locate the route, component/hook, and only the matching headings in `docs/`. Read those small slices plus the relevant source.
3. Classify exactly one outcome per independently actionable behavior:
   - **Bug**: implementation contradicts an established rule or API contract.
   - **Change request**: current behavior is intentional/specified but should change.
   - **Missing specification**: expected behavior has no established decision.
4. State uncertainty as an open question; never silently invent a product or API rule.

## Output

Return a compact handoff, normally in chat. Do not create an issue file unless requested.

```text
Classification: Bug | Change request | Missing specification
Evidence: route/file:line and relevant rule/API section
Current → expected: …
Scope: affected routes/components/API payloads
Acceptance criteria: 2–5 observable checks
Open questions / risks: only when blocking or material
```

Do not modify application code or synced `.mdc` documentation in this role.
