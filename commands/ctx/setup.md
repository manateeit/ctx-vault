# /ctx:setup — Reconfigure Vault Location

Change where ctx-vault stores session files.

**Current vault location:** `{{VAULT_SESSIONS_PATH}}`
**Config file:** `{{VAULT_CONFIG_PATH}}`

## What to do

### Step 1: Show Current Config

Read the config file at `{{VAULT_CONFIG_PATH}}` and display:

```
════════════════════════════════════════
CTX-VAULT CONFIGURATION
════════════════════════════════════════

Current vault: {{VAULT_SESSIONS_PATH}}
Sessions saved: [count from INDEX.md]
Config file: {{VAULT_CONFIG_PATH}}

════════════════════════════════════════
```

### Step 2: Ask What to Change

Ask the user what they want to reconfigure:
1. **Vault location** — move sessions directory to a new path
2. **Show stats** — count sessions, total size, date range

### Step 3: Apply Changes

If changing vault location:
1. Create the new directory
2. Ask if they want to move existing session files
3. Update the config file
4. Update the command files with the new path (re-run the replacement)

Display confirmation when done.

## Note
To reinstall ctx-vault entirely, run:
```bash
npx ctx-vault install
```
