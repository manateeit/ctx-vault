# /ctx:recap — Resume from Vault Session

Load context from a previous session preserved in the vault.

**Vault location:** `{{VAULT_SESSIONS_PATH}}`

## What to do

### Step 1: List Available Sessions

Read `{{VAULT_SESSIONS_PATH}}/INDEX.md` and display recent sessions:

```
════════════════════════════════════════
AVAILABLE SESSIONS
════════════════════════════════════════

 # | Date       | Focus              | Open Items
---|------------|--------------------|------------
 1 | [most recent]                   | [count]
 2 | [next]                          | [count]
 3 | [next]                          | [count]

Enter number to load, or press Enter for most recent:
════════════════════════════════════════
```

If the user provided an argument (e.g., `/ctx:recap 2`), load that session directly.
If no argument, suggest the most recent and ask.

### Step 2: Load Session

Read the selected session file from `{{VAULT_SESSIONS_PATH}}/`.

### Step 3: Present Context

Display a structured recap:

```
════════════════════════════════════════
SESSION RECAP: [date] — [title]
════════════════════════════════════════

Summary: [2-3 sentences]

Open Items from Last Session:
  - [ ] [Item 1]
  - [ ] [Item 2]

Issues in Progress:
  - #N — [status] — [one-liner]

Key Context:
  - [Important thing 1]
  - [Important thing 2]

════════════════════════════════════════
```

### Step 4: Also Load Current State

After presenting the session recap, also check for:
1. Any INDEX.md or SUMMARY.md files in the vault parent — current status of tracked items
2. Any PAUL STATE.md or HANDOFF files if they exist
3. Any state files from the same date

This gives the full picture: what the session was doing + what the project state is now.

### Step 5: Ready to Work

Ask:
```
Ready to continue. What would you like to pick up first?
```

## Important
- The goal is to get the user back to productive work in under 60 seconds
- Don't dump the entire session file — present the actionable summary
- Highlight OPEN ITEMS prominently — that's what needs attention
- If issues have changed status since the session was saved, note the difference
- Read the full session file yourself for context, but present only what the user needs to act on
