#!/usr/bin/env node
// Claude Code hook: appends one compact line per event for the monitor. Never blocks or fails a tool call.
// Strings are cut to 240 chars so command text (possible secrets) is not kept whole.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

try {
  const e = JSON.parse(fs.readFileSync(0, 'utf8')), cut = v => typeof v === 'string' ? v.slice(0, 240) : v
  const o = { t: Date.now() / 1000 | 0 }
  for (const [k, v] of Object.entries(e)) if (k !== 'transcript_path' && (v === null || typeof v !== 'object')) o[k] = cut(v)
  const i = e.tool_input
  Object.assign(o, { sub: i?.subagent_type, desc: i?.description, in: i == null ? '' : cut(typeof i === 'string' ? i : JSON.stringify(i)),
    // background work: its start flag, its task id, and the status in its completion notice (which lies past the 240-char cut)
    bg: i?.run_in_background || null, bgid: e.tool_response?.backgroundTaskId, bgstatus: typeof e.prompt === 'string' ? e.prompt.match(/<status>([a-z_]+)<\/status>/)?.[1] : null })
  for (const k in o) if (o[k] == null || o[k] === '') delete o[k]
  const dir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'monitor')
  // the log holds prompt and command text: readable by this user only
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(o) + '\n', { mode: 0o600 })
} catch {}
