// Install twice, log one event, uninstall — all inside a throwaway config dir.
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-')), env = { ...process.env, CLAUDE_CONFIG_DIR: cfg }
const run = (f, a = [], input = '') => execFileSync(process.execPath, [f, ...a], { env, input })
const read = () => JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'))
fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify({ model: 'x', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine' }] }] } }))

run('cli.mjs', ['install']); run('cli.mjs', ['install'])
let s = read()
assert.equal(s.model, 'x')
assert.equal(s.hooks.Stop.length, 2, 'own hook kept, ours added once')
assert.equal(s.hooks.PreToolUse.length, 1)

run(path.join(cfg, 'monitor/hook.mjs'), [], JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 's', cwd: '/x/app', transcript_path: '/t',
  tool_name: 'Agent', tool_input: { subagent_type: 'reviewer', description: 'check', prompt: 'p'.repeat(999) } }))
const [e] = fs.readFileSync(path.join(cfg, 'monitor/events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
assert.deepEqual([e.tool_name, e.sub, e.desc, e.in.length, e.transcript_path, e.tool_input], ['Agent', 'reviewer', 'check', 240, undefined, undefined])

run('cli.mjs', ['uninstall'])
s = read()
assert.deepEqual(Object.keys(s.hooks), ['Stop'])
assert.equal(s.hooks.Stop[0].hooks[0].command, 'mine')
fs.rmSync(cfg, { recursive: true })
console.log('ok')
