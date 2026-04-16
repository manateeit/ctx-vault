#!/bin/bash
# ctx-vault PreCompact hook
# Automatically saves the session transcript before compaction wipes it.
# Installed by: npx github:manateeit/ctx-vault

# Read hook input from stdin
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Find .ctx-vault.json config
CONFIG_PATH=""
if [ -f "$CWD/.ctx-vault.json" ]; then
  CONFIG_PATH="$CWD/.ctx-vault.json"
else
  # Search common locations
  for dir in "$CWD"/*/; do
    if [ -f "${dir}.ctx-vault.json" ]; then
      CONFIG_PATH="${dir}.ctx-vault.json"
      break
    fi
  done
fi

# Fallback: save to ~/.claude/session-saves/ if no vault config found
if [ -z "$CONFIG_PATH" ] || [ ! -f "$CONFIG_PATH" ]; then
  SAVE_DIR="$HOME/.claude/session-saves"
  mkdir -p "$SAVE_DIR"
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  SHORT_ID=$(echo "$SESSION_ID" | cut -c1-8)

  if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    cp "$TRANSCRIPT_PATH" "$SAVE_DIR/session-${SHORT_ID}-${TIMESTAMP}.jsonl"
  fi

  jq -n '{
    "continue": true,
    "systemMessage": "ctx-vault: Session transcript backed up to ~/.claude/session-saves/ (no vault config found). Run /ctx:save now to create a structured summary before context is lost."
  }'
  exit 0
fi

# Read vault config
SESSIONS_PATH=$(jq -r '.vault_sessions_path // empty' "$CONFIG_PATH")
VAULT_PATH=$(jq -r '.vault_path // empty' "$CONFIG_PATH")

if [ -z "$SESSIONS_PATH" ]; then
  SESSIONS_PATH="$VAULT_PATH/sessions"
fi

mkdir -p "$SESSIONS_PATH/.transcripts"

# Save raw transcript
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SHORT_ID=$(echo "$SESSION_ID" | cut -c1-8)
TRANSCRIPT_SAVE="$SESSIONS_PATH/.transcripts/session-${SHORT_ID}-${TIMESTAMP}.jsonl"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  cp "$TRANSCRIPT_PATH" "$TRANSCRIPT_SAVE"
fi

# Return success — allow compaction but tell the AI to save
jq -n --arg save_path "$TRANSCRIPT_SAVE" --arg sessions "$SESSIONS_PATH" '{
  "continue": true,
  "systemMessage": ("ctx-vault: Session transcript backed up to " + $save_path + ". IMPORTANT: Context is about to be compacted. Run /ctx:save NOW to create a structured summary in " + $sessions + " before conversation details are lost.")
}'
