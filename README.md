# ctx-vault

Session context vault for Claude Code — preserve and resume conversations across context resets.

## The Problem

When your Claude Code context window fills up, you lose everything. Starting a new session means rebuilding context from scratch — re-reading files, re-explaining decisions, re-discovering what was in progress.

## The Solution

`ctx-vault` adds three commands to Claude Code:

| Command | When | What it does |
|---------|------|-------------|
| `/ctx:save` | Context at 75%+ | Captures everything important to a session file in your vault |
| `/ctx:recap` | New session | Loads previous session context and gets you back to work fast |
| `/ctx:setup` | One time | Configure where session files are stored |

## Install

```bash
# In your project directory
npx ctx-vault

# Or install globally
npx ctx-vault install --global
```

The installer will ask where to store session files (defaults to `./vault/sessions/`).

## Workflow

1. You're deep in a session, context is getting full
2. Run `/ctx:save` — captures incidents, findings, actions, open items, queries, everything
3. Cancel the session, start a fresh one
4. Run `/ctx:recap` — lists recent sessions, loads the one you pick
5. Pick up right where you left off

## What Gets Saved

Each session file captures:
- Summary of what was accomplished
- Incidents/issues worked (with status changes)
- Key findings with evidence
- Actions taken (specific: job names, parameters, results)
- Decisions made with rationale
- SQL queries worth keeping
- Emails sent
- Open items for the next session

## Session Files

Sessions are saved as markdown files:
```
vault/sessions/
├── INDEX.md                          # Quick lookup of all sessions
├── 2026-04-15-session-01.md          # Session files
├── 2026-04-15-session-02.md
└── 2026-04-16-session-01.md
```

## Requirements

- Claude Code CLI
- Any project directory

## License

MIT
