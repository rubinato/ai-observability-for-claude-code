#!/usr/bin/env node
// Claude Code status line: saves the subscription limits it is handed, for the monitor, and prints them as one short line.
// Claude Code supplies them to subscribers only, after the first reply of a session.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

try {
  const r = JSON.parse(fs.readFileSync(0, 'utf8')).rate_limits, pc = w => r[w]?.used_percentage == null ? '–' : Math.round(r[w].used_percentage) + '%'
  if (r) {
    const dir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'monitor')
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    fs.writeFileSync(path.join(dir, 'limits.json'), JSON.stringify({ t: Date.now() / 1000 | 0, ...r }), { mode: 0o600 })
    console.log(`5h ${pc('five_hour')} · week ${pc('seven_day')}`)
  }
} catch {}
