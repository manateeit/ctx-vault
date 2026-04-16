# /ctx:save — Preserve Session to Vault

Save the current conversation session to the vault for future reference before context resets.

**Vault location:** `{{VAULT_SESSIONS_PATH}}`

## What to do

You are about to lose this conversation context. Preserve everything important.

### Step 1: Gather Session Data

Collect from the current conversation:
1. **Session ID** — check `~/.claude/projects/` for the current session JSONL file (most recent by timestamp)
2. **Date range** — when this session started and now
3. **Incidents worked** — any incident numbers created, updated, or resolved
4. **Key findings** — data investigation results, root causes identified, SQL queries that proved something
5. **Actions taken** — jobs run, fixes applied, emails sent, data loaded
6. **Decisions made** — architectural choices, workarounds chosen, things deferred
7. **Open items** — anything unfinished that the next session needs to pick up
8. **Emails sent** — subject lines and recipients of any emails sent
9. **Important queries** — any diagnostic queries worth preserving for reuse
10. **External conversations** — any notable back-and-forth or requests pending

### Step 2: Create Session File

Write a comprehensive session file to:
```
{{VAULT_SESSIONS_PATH}}/YYYY-MM-DD-session-NN.md
```

Use NN as a sequence number if multiple sessions on the same day (01, 02, etc). Check existing files first.

**Format:**
```markdown
---
date: YYYY-MM-DD
session_id: <from ~/.claude session>
started: <approximate start time>
ended: <now>
context_usage: <approximate % when saved>
---

# Session: YYYY-MM-DD — [Brief Title]

## Summary
[2-3 sentence overview of what this session accomplished]

## Incidents / Issues Worked
| # | Status Before | Status After | What Changed |
|---|--------------|-------------|-------------|

## Key Findings
- [Finding 1 — with evidence]
- [Finding 2]

## Actions Taken
- [Action 1 — specific: what, parameters, result]
- [Action 2]

## Decisions Made
| Decision | Rationale |
|----------|-----------|

## Queries Worth Keeping
\```sql
-- [Description]
[query]
\```

## Emails Sent
| Subject | To | Purpose |
|---------|-----|---------|

## Open Items / Next Session Pickup
- [ ] [Item 1 — specific enough to act on]
- [ ] [Item 2]

## Raw Context
[Any additional details, error messages, specific values that might be needed later]
```

### Step 3: Update INDEX.md

Add a row to `{{VAULT_SESSIONS_PATH}}/INDEX.md` with the session summary.

### Step 4: Confirm

Display:
```
════════════════════════════════════════
SESSION PRESERVED TO VAULT
════════════════════════════════════════

File: [filename]
Issues: [list]
Open items: [count]

To resume in a new session:
  /ctx:recap

════════════════════════════════════════
```

## Important
- Be THOROUGH — this is the last chance to capture context before it's lost
- Include specific numbers, row counts, dates, names — not vague summaries
- Include the actual queries that were useful, not just descriptions
- Do NOT skip open items — the next session depends on them
