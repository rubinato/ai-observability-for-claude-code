#!/usr/bin/env node
// install | uninstall | start — same on Windows, macOS and Linux.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

if (+process.versions.node.split('.')[0] < 22) { console.error('Node.js 22 or newer is required: https://nodejs.org'); process.exit(1) }

const src = import.meta.dirname
const cfg = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
const dir = path.join(cfg, 'monitor'), settings = path.join(cfg, 'settings.json')
const EVENTS = ['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'SubagentStart', 'SubagentStop', 'Stop']
const hook = path.join(dir, 'hook.mjs').replaceAll('\\', '/')
const ours = g => g.hooks?.some(h => h.command?.includes('monitor/hook.mjs'))

// Rewrites only our own entries in settings.json; a file that does not parse is left untouched.
const edit = (change, on) => {
  let s = {}
  if (fs.existsSync(settings)) {
    try { s = JSON.parse(fs.readFileSync(settings, 'utf8')) } catch { console.error(`${settings} is not valid JSON; fix it and run again.`); process.exit(1) }
    fs.copyFileSync(settings, settings + '.bak')
  }
  s.hooks ??= {}
  for (const ev of EVENTS) {
    s.hooks[ev] = change((s.hooks[ev] || []).filter(g => !ours(g)))
    if (!s.hooks[ev].length) delete s.hooks[ev]
  }
  // the status line feeds the usage limits: set only when the user has none, removed only when it is ours
  if (on) s.statusLine ??= { type: 'command', command: `node "${hook.replace('hook.mjs', 'statusline.mjs')}"` }
  else if (s.statusLine?.command?.includes('monitor/statusline.mjs')) delete s.statusLine
  fs.mkdirSync(cfg, { recursive: true })
  fs.writeFileSync(settings, JSON.stringify(s, null, 2) + '\n')
}

const cmd = process.argv[2] || 'start'
if (cmd === 'install') {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  for (const f of ['server.mjs', 'index.html', 'hook.mjs', 'statusline.mjs', 'cli.mjs']) fs.copyFileSync(path.join(src, f), path.join(dir, f))
  edit(list => [...list, { hooks: [{ type: 'command', command: `node "${hook}"` }] }], true)
  console.log(`Installed in ${dir}\nStart:  node "${path.join(dir, 'server.mjs')}"\nOpen:   http://localhost:4777\nNew Claude Code sessions are recorded from now on.`)
} else if (cmd === 'uninstall') {
  edit(list => list)
  console.log(`Hooks removed from ${settings}. Delete ${dir} to remove the files and the event log.`)
} else if (cmd === 'start') await import('./server.mjs')
else { console.error('usage: cli.mjs install | uninstall | start'); process.exit(1) }
