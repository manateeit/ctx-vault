#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const COMMANDS_SRC = path.join(__dirname, '..', 'commands', 'ctx')
const BLUE = '\x1b[34m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

function banner() {
  console.log(`
${BLUE}${BOLD}════════════════════════════════════════${RESET}
${BLUE}${BOLD}  ctx-vault${RESET} — Session Context Vault
${BLUE}${BOLD}════════════════════════════════════════${RESET}
  ${DIM}LLM Wiki pattern for persistent knowledge${RESET}
`)
}

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const prompt = defaultVal
      ? `${question} ${DIM}(${defaultVal})${RESET}: `
      : `${question}: `
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal || '')
    })
  })
}

function askYN(rl, question, defaultYes) {
  return new Promise((resolve) => {
    const hint = defaultYes ? 'Y/n' : 'y/N'
    rl.question(`${question} ${DIM}[${hint}]${RESET}: `, (answer) => {
      const a = answer.trim().toLowerCase()
      if (a === '') resolve(defaultYes)
      else resolve(a === 'y' || a === 'yes')
    })
  })
}

// ── Obsidian Vault Scaffold (Karpathy LLM Wiki pattern) ──

const VAULT_CLAUDE_MD = `# LLM Wiki — Vault Schema

This vault follows the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Architecture

Three layers:

1. **raw/** — Immutable source documents. Articles, papers, exports, spreadsheets. The LLM reads but never modifies these.
2. **wiki/** — LLM-generated markdown files. Summaries, entity pages, concept pages, synthesis. The LLM owns this layer entirely.
3. **sessions/** — Preserved conversation sessions (ctx-vault). Captures context across session resets.

## Conventions

- **index.md** — Content catalog. Each wiki page listed with link, one-line summary. Updated on every ingest.
- **log.md** — Chronological append-only record. Format: \`## [YYYY-MM-DD] action | description\`
- **Wiki pages** use \`[[wikilinks]]\` for cross-references (Obsidian native linking).
- **YAML frontmatter** on wiki pages for metadata (tags, dates, source counts).

## Operations

### Ingest
Drop a source into raw/, tell the LLM to process it. The LLM:
1. Reads the source
2. Writes/updates a summary page in wiki/
3. Updates index.md
4. Updates related entity and concept pages
5. Appends to log.md

### Query
Ask questions against the wiki. The LLM reads index.md to find relevant pages, drills into them, synthesizes an answer. Good answers get filed back into wiki/ as new pages.

### Lint
Periodic health-check: contradictions, stale claims, orphan pages, missing cross-references, data gaps.

## Session Preservation (ctx-vault)

When context gets full:
1. Run \`/ctx:save\` — captures session to sessions/
2. Start fresh session
3. Run \`/ctx:recap\` — loads previous session context

## Files

| Path | Purpose |
|------|---------|
| \`CLAUDE.md\` | This schema — how the vault is structured |
| \`index.md\` | Content catalog of all wiki pages |
| \`log.md\` | Chronological activity log |
| \`raw/\` | Immutable source documents |
| \`wiki/\` | LLM-maintained knowledge pages |
| \`sessions/\` | Preserved conversation sessions |
`

const VAULT_INDEX_MD = `---
title: Wiki Index
type: index
updated: {{DATE}}
---

# Wiki Index

Content catalog for this vault. Updated on every ingest.

## Sources
<!-- LLM: add entries as sources are ingested -->

## Entities
<!-- LLM: add entries for people, companies, systems, etc. -->

## Concepts
<!-- LLM: add entries for topics, patterns, ideas -->

## Sessions
| Date | Focus | File |
|------|-------|------|
`

const VAULT_LOG_MD = `---
title: Activity Log
type: log
---

# Activity Log

Chronological record of vault activity.

## [{{DATE}}] init | Vault created
ctx-vault initialized this vault following the LLM Wiki pattern.
`

const SESSIONS_INDEX_MD = `---
title: Session Archive Index
type: index
updated: {{DATE}}
---

# Session Archive

Preserved conversation sessions for continuity across context resets.

| Date | Session ID | Focus | Incidents | Key Outcomes | File |
|------|-----------|-------|-----------|-------------|------|
`

const OBSIDIAN_APP_JSON = JSON.stringify({
  "attachmentFolderPath": "raw/assets",
  "newFileLocation": "folder",
  "newFileFolderPath": "wiki",
  "alwaysUpdateLinks": true
}, null, 2)

function scaffoldVault(vaultPath, today) {
  const dirs = ['raw', 'raw/assets', 'wiki', 'sessions', '.obsidian']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(vaultPath, dir), { recursive: true })
  }

  const files = [
    ['CLAUDE.md', VAULT_CLAUDE_MD],
    ['index.md', VAULT_INDEX_MD.replace(/\{\{DATE\}\}/g, today)],
    ['log.md', VAULT_LOG_MD.replace(/\{\{DATE\}\}/g, today)],
    ['sessions/INDEX.md', SESSIONS_INDEX_MD.replace(/\{\{DATE\}\}/g, today)],
    ['.obsidian/app.json', OBSIDIAN_APP_JSON],
  ]

  for (const [name, content] of files) {
    const filePath = path.join(vaultPath, name)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content)
      console.log(`  ${GREEN}+${RESET} ${name}`)
    } else {
      console.log(`  ${DIM}skip${RESET} ${name} (already exists)`)
    }
  }
}

// ── Main Install ──

async function install(scope) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  banner()

  const cwd = process.cwd()
  const isGlobal = scope === 'global'
  const home = process.env.HOME || process.env.USERPROFILE
  const today = new Date().toISOString().split('T')[0]

  // Step 1: Vault setup
  console.log(`${BOLD}Step 1: Vault Setup${RESET}\n`)

  const hasExistingVault = await askYN(rl, 'Do you have an existing Obsidian vault to use?', false)

  let vaultPath
  if (hasExistingVault) {
    vaultPath = await ask(rl, `${BOLD}Path to your vault${RESET}`, '')
    if (!vaultPath) {
      console.log(`${YELLOW}No path provided. Exiting.${RESET}`)
      rl.close()
      return
    }
    vaultPath = path.resolve(vaultPath)
    if (!fs.existsSync(vaultPath)) {
      console.log(`${YELLOW}Path does not exist: ${vaultPath}${RESET}`)
      const create = await askYN(rl, 'Create it?', true)
      if (!create) { rl.close(); return }
    }
    console.log(`\n${BOLD}Adding ctx-vault structure to existing vault...${RESET}`)
    // Only create sessions dir and INDEX if missing
    const sessionsDir = path.join(vaultPath, 'sessions')
    fs.mkdirSync(sessionsDir, { recursive: true })
    const sessionsIndex = path.join(sessionsDir, 'INDEX.md')
    if (!fs.existsSync(sessionsIndex)) {
      fs.writeFileSync(sessionsIndex, SESSIONS_INDEX_MD.replace(/\{\{DATE\}\}/g, today))
      console.log(`  ${GREEN}+${RESET} sessions/INDEX.md`)
    } else {
      console.log(`  ${DIM}skip${RESET} sessions/INDEX.md (already exists)`)
    }
    console.log(`${GREEN}Done.${RESET}\n`)
  } else {
    const defaultVault = path.join(cwd, 'vault')
    vaultPath = await ask(rl, `${BOLD}Where should the new vault be created?${RESET}`, defaultVault)
    vaultPath = path.resolve(vaultPath)

    console.log(`\n${BOLD}Scaffolding Obsidian vault (LLM Wiki pattern)...${RESET}`)
    fs.mkdirSync(vaultPath, { recursive: true })
    scaffoldVault(vaultPath, today)
    console.log(`${GREEN}Vault created at: ${vaultPath}${RESET}`)
    console.log(`${DIM}Open this folder in Obsidian to browse your wiki.${RESET}\n`)
  }

  const sessionsPath = path.join(vaultPath, 'sessions')

  // Step 2: Install commands
  console.log(`${BOLD}Step 2: Install Commands${RESET}\n`)

  let commandsTarget
  if (isGlobal) {
    commandsTarget = path.join(home, '.claude', 'commands', 'ctx')
    console.log(`  Scope: ${BOLD}global${RESET} (all projects)`)
  } else {
    commandsTarget = path.join(cwd, '.claude', 'commands', 'ctx')
    console.log(`  Scope: ${BOLD}project-local${RESET} (${cwd})`)
  }

  fs.mkdirSync(commandsTarget, { recursive: true })

  // Write config
  const configPath = path.join(vaultPath, '.ctx-vault.json')
  const config = {
    vault_path: vaultPath,
    vault_sessions_path: sessionsPath,
    commands_path: commandsTarget,
    created: new Date().toISOString(),
    version: '1.0.0'
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(`  ${GREEN}+${RESET} config: ${configPath}`)

  // Copy and inject command files
  const commandFiles = fs.readdirSync(COMMANDS_SRC).filter(f => f.endsWith('.md'))
  for (const file of commandFiles) {
    let content = fs.readFileSync(path.join(COMMANDS_SRC, file), 'utf8')
    content = content.replace(/\{\{VAULT_SESSIONS_PATH\}\}/g, sessionsPath)
    content = content.replace(/\{\{VAULT_PATH\}\}/g, vaultPath)
    content = content.replace(/\{\{VAULT_CONFIG_PATH\}\}/g, configPath)
    fs.writeFileSync(path.join(commandsTarget, file), content)
    console.log(`  ${GREEN}+${RESET} /ctx:${file.replace('.md', '')}`)
  }

  // Step 3: Inject vault reference into project CLAUDE.md
  console.log(`\n${BOLD}Step 3: Project CLAUDE.md${RESET}\n`)

  const claudeMdPath = path.join(cwd, 'CLAUDE.md')
  const vaultSection = `
## LLM Wiki Vault (ctx-vault)

This project has a knowledge vault at \`${path.relative(cwd, vaultPath) || vaultPath}\`.

**Pattern:** [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the LLM incrementally builds and maintains a persistent wiki of interlinked markdown files.

**Three layers:**
- \`${path.relative(cwd, vaultPath)}/raw/\` — Immutable source documents. Read but never modify.
- \`${path.relative(cwd, vaultPath)}/wiki/\` — LLM-maintained knowledge pages. You own this layer — create, update, cross-reference.
- \`${path.relative(cwd, vaultPath)}/sessions/\` — Preserved conversation sessions via ctx-vault.

**Operations:**
- **Ingest:** When a source is added to raw/, read it, write/update wiki pages, update index.md, append to log.md.
- **Query:** Answer questions by reading index.md to find relevant wiki pages, then synthesize. File good answers back into wiki/.
- **Lint:** Periodically health-check for contradictions, stale claims, orphan pages, missing cross-references.
- **Session save:** Run \`/ctx:save\` before context resets. Run \`/ctx:recap\` in new sessions to restore.

**Key files:**
- \`${path.relative(cwd, vaultPath)}/CLAUDE.md\` — Full vault schema and conventions
- \`${path.relative(cwd, vaultPath)}/index.md\` — Content catalog (read this first for queries)
- \`${path.relative(cwd, vaultPath)}/log.md\` — Chronological activity log
- \`${path.relative(cwd, vaultPath)}/sessions/INDEX.md\` — Session archive
`

  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf8')
    if (existing.includes('ctx-vault')) {
      console.log(`  ${DIM}skip${RESET} CLAUDE.md (already has ctx-vault section)`)
    } else {
      fs.appendFileSync(claudeMdPath, '\n' + vaultSection)
      console.log(`  ${GREEN}+${RESET} Appended vault section to CLAUDE.md`)
    }
  } else {
    fs.writeFileSync(claudeMdPath, `# Project Configuration\n${vaultSection}`)
    console.log(`  ${GREEN}+${RESET} Created CLAUDE.md with vault section`)
  }

  // Step 4: Install PreCompact hook
  console.log(`${BOLD}Step 4: PreCompact Hook${RESET}\n`)

  const hookSrc = path.join(__dirname, '..', 'hooks', 'pre-compact-save.sh')
  const hookDir = path.join(cwd, '.claude', 'hooks')
  const hookDst = path.join(hookDir, 'ctx-vault-pre-compact.sh')

  fs.mkdirSync(hookDir, { recursive: true })
  fs.copyFileSync(hookSrc, hookDst)
  fs.chmodSync(hookDst, 0o755)
  console.log(`  ${GREEN}+${RESET} .claude/hooks/ctx-vault-pre-compact.sh`)

  // Add hook to settings.json (project-local)
  const settingsDir = path.join(cwd, '.claude')
  const settingsPath = path.join(settingsDir, 'settings.local.json')
  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } catch {}
  }

  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks.PreCompact) settings.hooks.PreCompact = []

  // Check if already registered
  const alreadyRegistered = settings.hooks.PreCompact.some(h =>
    h.hooks && h.hooks.some(hh => hh.command && hh.command.includes('ctx-vault-pre-compact'))
  )

  if (!alreadyRegistered) {
    settings.hooks.PreCompact.push({
      hooks: [{
        type: 'command',
        command: hookDst,
        timeout: 30,
        statusMessage: 'Backing up session before compaction...'
      }]
    })
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    console.log(`  ${GREEN}+${RESET} PreCompact hook registered in .claude/settings.local.json`)
  } else {
    console.log(`  ${DIM}skip${RESET} PreCompact hook (already registered)`)
  }

  // Step 5: Install graphify
  console.log(`\n${BOLD}Step 5: Graphify (Knowledge Graph)${RESET}\n`)

  const { execSync } = require('child_process')

  // Check if graphify is installed
  let graphifyInstalled = false
  try {
    execSync('python3 -c "import graphify"', { stdio: 'pipe' })
    graphifyInstalled = true
    console.log(`  ${GREEN}found${RESET} graphify already installed`)
  } catch {
    try {
      execSync('python3 -m pip install graphifyy -q', { stdio: 'pipe', timeout: 60000 })
      graphifyInstalled = true
      console.log(`  ${GREEN}+${RESET} installed graphifyy via pip`)
    } catch {
      try {
        execSync('python3 -m pip install graphifyy -q --break-system-packages', { stdio: 'pipe', timeout: 60000 })
        graphifyInstalled = true
        console.log(`  ${GREEN}+${RESET} installed graphifyy via pip (break-system-packages)`)
      } catch {
        console.log(`  ${YELLOW}skip${RESET} graphify install failed — install manually: pip install graphifyy`)
      }
    }
  }

  // Create graphify-out directory in vault
  const graphifyOut = path.join(vaultPath, 'graphify-out')
  fs.mkdirSync(graphifyOut, { recursive: true })

  // Copy graphify skill if available
  const graphifySkillSrc = path.join(__dirname, '..', 'skills', 'graphify.md')
  if (fs.existsSync(graphifySkillSrc)) {
    const skillsDir = path.join(cwd, '.claude', 'commands')
    fs.mkdirSync(skillsDir, { recursive: true })
    fs.copyFileSync(graphifySkillSrc, path.join(skillsDir, 'graphify.md'))
    console.log(`  ${GREEN}+${RESET} /graphify command installed`)
  }

  // Add graphify section to vault CLAUDE.md
  const vaultClaudeMdPath = path.join(vaultPath, 'CLAUDE.md')
  if (fs.existsSync(vaultClaudeMdPath)) {
    const vaultClaudeMd = fs.readFileSync(vaultClaudeMdPath, 'utf8')
    if (!vaultClaudeMd.includes('graphify')) {
      const graphifySection = `
## Graphify (Knowledge Graph)

This vault uses [graphify](https://github.com/ChristopherKahler/graphify) to build knowledge graphs from sources.

**Build graph from vault sources:**
\`\`\`
/graphify ${path.relative(cwd, vaultPath)}/raw --obsidian --obsidian-dir ${path.relative(cwd, vaultPath)}
\`\`\`

**Incremental update (new/changed files only):**
\`\`\`
/graphify ${path.relative(cwd, vaultPath)}/raw --update --obsidian --obsidian-dir ${path.relative(cwd, vaultPath)}
\`\`\`

**Query the graph:**
\`\`\`
/graphify query "your question here"
\`\`\`

**Output:** \`graphify-out/\` contains graph.json, graph.html (interactive), and GRAPH_REPORT.md.

Every edge is tagged EXTRACTED, INFERRED, or AMBIGUOUS — you always know what was found vs invented.
`
      fs.appendFileSync(vaultClaudeMdPath, graphifySection)
      console.log(`  ${GREEN}+${RESET} Graphify section added to vault CLAUDE.md`)
    } else {
      console.log(`  ${DIM}skip${RESET} vault CLAUDE.md (already has graphify section)`)
    }
  }

  if (graphifyInstalled) {
    console.log(`  ${DIM}Run '/graphify ${path.relative(cwd, vaultPath)}/raw' to build your first graph${RESET}`)
  }

  // Step 6: Summary
  console.log(`
${BLUE}${BOLD}════════════════════════════════════════${RESET}
${GREEN}${BOLD}  Installation complete!${RESET}
${BLUE}${BOLD}════════════════════════════════════════${RESET}

  ${BOLD}Vault:${RESET}
    ${vaultPath}
    ${DIM}Open in Obsidian to browse wiki + sessions${RESET}

  ${BOLD}Structure:${RESET}
    raw/            Immutable source documents
    wiki/           LLM-maintained knowledge pages
    sessions/       Preserved conversation sessions
    graphify-out/   Knowledge graph (JSON, HTML, report)
    CLAUDE.md       Vault schema (LLM Wiki pattern)
    index.md        Content catalog
    log.md          Activity log

  ${BOLD}Commands:${RESET}
    /ctx:save       Save session context to vault
    /ctx:recap      Resume from a previous session
    /ctx:setup      Reconfigure vault location
    /graphify       Build knowledge graph from sources

  ${BOLD}Hooks:${RESET}
    PreCompact      Auto-backs up transcript before compaction

  ${BOLD}Workflow:${RESET}
    1. Context getting full  ${DIM}→${RESET}  ${BOLD}/ctx:save${RESET}
    2. Start new session     ${DIM}→${RESET}  ${BOLD}/ctx:recap${RESET}
    3. Pick up where you left off

  ${BOLD}LLM Wiki operations:${RESET}
    ${DIM}Drop sources into raw/, tell the LLM to ingest.${RESET}
    ${DIM}Ask questions — answers get filed into wiki/.${RESET}
    ${DIM}Run /graphify to build knowledge graph from sources.${RESET}
    ${DIM}Periodic /lint to health-check the wiki.${RESET}

${BLUE}${BOLD}════════════════════════════════════════${RESET}
`)

  rl.close()
}

async function update() {
  const cwd = process.cwd()
  const home = process.env.HOME || process.env.USERPROFILE

  banner()
  console.log(`${BOLD}Updating ctx-vault...${RESET}\n`)

  // Find existing config
  let configPath = null
  let config = null

  // Search for .ctx-vault.json — recursively up to 2 levels deep
  function findConfig(dir, depth) {
    if (depth > 2) return null
    const direct = path.join(dir, '.ctx-vault.json')
    if (fs.existsSync(direct)) return direct
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const found = findConfig(path.join(dir, entry.name), depth + 1)
          if (found) return found
        }
      }
    } catch {}
    return null
  }
  configPath = findConfig(cwd, 0)
  if (configPath) config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  // Fallback: detect existing install by looking for vault dirs without config
  if (!config) {
    const candidates = ['vault', 'bods-vault', 'docs/vault', 'knowledge', 'wiki']
    for (const c of candidates) {
      const candidatePath = path.join(cwd, c)
      if (fs.existsSync(path.join(candidatePath, 'sessions')) ||
          fs.existsSync(path.join(candidatePath, 'wiki'))) {
        console.log(`${YELLOW}Found vault at ${candidatePath} but no .ctx-vault.json config.${RESET}`)
        console.log(`${BOLD}Migrating to current version...${RESET}\n`)
        configPath = path.join(candidatePath, '.ctx-vault.json')
        config = {
          vault_path: candidatePath,
          vault_sessions_path: path.join(candidatePath, 'sessions'),
          commands_path: path.join(cwd, '.claude', 'commands', 'ctx'),
          created: new Date().toISOString(),
          version: '1.0.0',
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        console.log(`  ${GREEN}+${RESET} Created config: ${configPath}`)
        break
      }
    }
  }

  if (!config) {
    console.log(`${YELLOW}No .ctx-vault.json or vault directory found.${RESET}`)
    console.log(`${YELLOW}Run 'ctx-vault install' first to set up the vault.${RESET}`)
    return
  }

  const vaultPath = config.vault_path
  const sessionsPath = config.vault_sessions_path
  const today = new Date().toISOString().split('T')[0]

  console.log(`  Vault: ${vaultPath}`)
  console.log(`  Config: ${configPath}\n`)

  // 1. Update command files
  const commandsTarget = config.commands_path || path.join(cwd, '.claude', 'commands', 'ctx')
  fs.mkdirSync(commandsTarget, { recursive: true })

  const commandFiles = fs.readdirSync(COMMANDS_SRC).filter(f => f.endsWith('.md'))
  for (const file of commandFiles) {
    let content = fs.readFileSync(path.join(COMMANDS_SRC, file), 'utf8')
    content = content.replace(/\{\{VAULT_SESSIONS_PATH\}\}/g, sessionsPath)
    content = content.replace(/\{\{VAULT_PATH\}\}/g, vaultPath)
    content = content.replace(/\{\{VAULT_CONFIG_PATH\}\}/g, configPath)
    fs.writeFileSync(path.join(commandsTarget, file), content)
    console.log(`  ${GREEN}updated${RESET} /ctx:${file.replace('.md', '')}`)
  }

  // 2. Ensure vault CLAUDE.md exists
  const vaultClaudeMd = path.join(vaultPath, 'CLAUDE.md')
  if (!fs.existsSync(vaultClaudeMd)) {
    fs.writeFileSync(vaultClaudeMd, VAULT_CLAUDE_MD)
    console.log(`  ${GREEN}+${RESET} ${path.relative(cwd, vaultClaudeMd)}`)
  } else {
    console.log(`  ${DIM}skip${RESET} vault CLAUDE.md (exists)`)
  }

  // 3. Ensure vault index.md and log.md exist
  const vaultIndex = path.join(vaultPath, 'index.md')
  if (!fs.existsSync(vaultIndex)) {
    fs.writeFileSync(vaultIndex, VAULT_INDEX_MD.replace(/\{\{DATE\}\}/g, today))
    console.log(`  ${GREEN}+${RESET} vault index.md`)
  }
  const vaultLog = path.join(vaultPath, 'log.md')
  if (!fs.existsSync(vaultLog)) {
    fs.writeFileSync(vaultLog, VAULT_LOG_MD.replace(/\{\{DATE\}\}/g, today))
    console.log(`  ${GREEN}+${RESET} vault log.md`)
  }

  // 4. Ensure vault directories exist
  for (const dir of ['raw', 'raw/assets', 'wiki', 'sessions']) {
    fs.mkdirSync(path.join(vaultPath, dir), { recursive: true })
  }

  // 5. Inject CLAUDE.md wiki section into project root if missing
  const claudeMdPath = path.join(cwd, 'CLAUDE.md')
  const vaultSection = `
## LLM Wiki Vault (ctx-vault)

This project has a knowledge vault at \`${path.relative(cwd, vaultPath) || vaultPath}\`.

**Pattern:** [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — the LLM incrementally builds and maintains a persistent wiki of interlinked markdown files.

**Three layers:**
- \`${path.relative(cwd, vaultPath)}/raw/\` — Immutable source documents. Read but never modify.
- \`${path.relative(cwd, vaultPath)}/wiki/\` — LLM-maintained knowledge pages. You own this layer — create, update, cross-reference.
- \`${path.relative(cwd, vaultPath)}/sessions/\` — Preserved conversation sessions via ctx-vault.

**Operations:**
- **Ingest:** When a source is added to raw/, read it, write/update wiki pages, update index.md, append to log.md.
- **Query:** Answer questions by reading index.md to find relevant wiki pages, then synthesize. File good answers back into wiki/.
- **Lint:** Periodically health-check for contradictions, stale claims, orphan pages, missing cross-references.
- **Session save:** Run \`/ctx:save\` before context resets. Run \`/ctx:recap\` in new sessions to restore.

**Key files:**
- \`${path.relative(cwd, vaultPath)}/CLAUDE.md\` — Full vault schema and conventions
- \`${path.relative(cwd, vaultPath)}/index.md\` — Content catalog (read this first for queries)
- \`${path.relative(cwd, vaultPath)}/log.md\` — Chronological activity log
- \`${path.relative(cwd, vaultPath)}/sessions/INDEX.md\` — Session archive
`

  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf8')
    if (existing.includes('ctx-vault')) {
      console.log(`  ${DIM}skip${RESET} project CLAUDE.md (already has ctx-vault section)`)
    } else {
      fs.appendFileSync(claudeMdPath, '\n' + vaultSection)
      console.log(`  ${GREEN}+${RESET} Appended wiki section to project CLAUDE.md`)
    }
  } else {
    fs.writeFileSync(claudeMdPath, `# Project Configuration\n${vaultSection}`)
    console.log(`  ${GREEN}+${RESET} Created project CLAUDE.md with wiki section`)
  }

  // 6. Update PreCompact hook
  const hookSrc = path.join(__dirname, '..', 'hooks', 'pre-compact-save.sh')
  const hookDir = path.join(cwd, '.claude', 'hooks')
  const hookDst = path.join(hookDir, 'ctx-vault-pre-compact.sh')

  fs.mkdirSync(hookDir, { recursive: true })
  fs.copyFileSync(hookSrc, hookDst)
  fs.chmodSync(hookDst, 0o755)
  console.log(`  ${GREEN}updated${RESET} .claude/hooks/ctx-vault-pre-compact.sh`)

  // Ensure hook is registered
  const settingsPath = path.join(cwd, '.claude', 'settings.local.json')
  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } catch {}
  }
  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks.PreCompact) settings.hooks.PreCompact = []

  const alreadyRegistered = settings.hooks.PreCompact.some(h =>
    h.hooks && h.hooks.some(hh => hh.command && hh.command.includes('ctx-vault-pre-compact'))
  )
  if (!alreadyRegistered) {
    settings.hooks.PreCompact.push({
      hooks: [{
        type: 'command',
        command: hookDst,
        timeout: 30,
        statusMessage: 'Backing up session before compaction...'
      }]
    })
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    console.log(`  ${GREEN}+${RESET} PreCompact hook registered`)
  }

  // 7. Update config version
  config.version = '1.0.1'
  config.updated = new Date().toISOString()
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  console.log(`
${GREEN}${BOLD}Update complete.${RESET} Commands refreshed, vault structure verified, CLAUDE.md checked.
`)
}

async function uninstall() {
  const cwd = process.cwd()
  const home = process.env.HOME || process.env.USERPROFILE
  const localPath = path.join(cwd, '.claude', 'commands', 'ctx')
  const globalPath = path.join(home, '.claude', 'commands', 'ctx')

  let removed = false
  for (const p of [localPath, globalPath]) {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true })
      console.log(`${GREEN}Removed${RESET} ${p}`)
      removed = true
    }
  }
  if (!removed) {
    console.log(`${YELLOW}No ctx-vault commands found to remove.${RESET}`)
  }
  console.log(`${DIM}Note: vault and session files were not removed.${RESET}`)
}

// ── CLI ──

const args = process.argv.slice(2)
const command = args[0] || 'install'

switch (command) {
  case 'install':
  case 'init':
  case 'setup':
    install(args.includes('--global') ? 'global' : 'local').catch(console.error)
    break
  case 'update':
  case 'upgrade':
    update().catch(console.error)
    break
  case 'uninstall':
  case 'remove':
    uninstall().catch(console.error)
    break
  case '--help':
  case '-h':
    banner()
    console.log(`  Usage: ctx-vault [command] [options]

  Commands:
    install     Set up vault + install commands (default)
    update      Update commands, vault structure, and CLAUDE.md
    uninstall   Remove ctx-vault commands

  Options:
    --global    Install commands to ~/.claude/ (all projects)
    --help      Show this help

  The installer will:
    1. Ask if you have an existing Obsidian vault or create a new one
    2. Scaffold the LLM Wiki pattern (raw/, wiki/, sessions/)
    3. Install /ctx:save, /ctx:recap, /ctx:setup commands
    4. Inject wiki instructions into project CLAUDE.md
`)
    break
  default:
    console.log(`Unknown command: ${command}. Run ctx-vault --help`)
}
