<!-- last triaged: never -->

# Friction Log

Append-only. Log an entry only when something about the **framework itself**
(not the codebase you're working in) caused a wrong turn, confusion, or extra
steps — an ambiguous instruction, a skill step that didn't match reality, a
missing file path, a convention applied inconsistently. Most sessions should
add nothing here.

See `context/skills/triage-friction.md` for how entries get reviewed and
turned into fixes.

## Format

```
YYYY-MM-DD | project | source-file | what happened
```

Use `(cross-project)` for the project field when the issue isn't specific to
one project's files.

## Entries

- 2026-11-18: Shared context-template/scripts/verify-context.sh rejects the existing tracked context/ideas directory, while current workspace conventions retain ideas. This is baseline framework friction, not an application failure. Do not remove proposals to make the checker green; align the maintained validator separately. Scoped records were independently validated for the recovery work.
