#!/usr/bin/env node
// Local agent monitor: serves index.html, the agent roster, and one live SSE stream that merges
// hook events (events.jsonl) with per-call model/token usage read from the session transcripts.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const cfg = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
const port = process.env.PORT || 4777
const log = path.join(cfg, 'monitor', 'events.jsonl')
const projects = path.join(cfg, 'projects')
// shortcut: on start only the last 1 MB of each file is replayed, so early-day history is partial; raise TAIL or persist if that matters
const TAIL = 1 << 20
fs.mkdirSync(path.dirname(log), { recursive: true, mode: 0o700 })
fs.closeSync(fs.openSync(log, 'a', 0o600))

const clients = new Set(), files = new Map(), seen = new Set(), roots = new Set([cfg])
let hist = []
// sub-agent name and task come from its transcript meta file; internal helper agents have none
const meta = new Map()
const named = o => {
  if (!o.agent_id || !/^[\w-]+$/.test(o.agent_id) ||!/^[\w-]+$/.test(o.session_id)) return o   // ids go into a file pattern: plain ids only
  let m = meta.get(o.agent_id)
  if (!m) try {
    const [f] = fs.globSync(`*/${o.session_id}/subagents/agent-${o.agent_id}.meta.json`, { cwd: projects })
    meta.set(o.agent_id, m = JSON.parse(fs.readFileSync(path.join(projects, f))))
  } catch { return o }
  return { ...o, agent_type: o.agent_type ?? m.agentType, task: m.description }
}
const emit = o => {
  o = named(o); hist.push(o); if (hist.length > 8000) hist.shift()
  if (o.cwd) roots.add(path.join(o.cwd.split(/[\\/]\.(?:claude|worktrees)[\\/]/)[0], '.claude'))
  for (const r of clients) r.write(`data: ${JSON.stringify(o)}\n\n`)
}
// agents (agents/*.md) and skills (skills/<name>/) defined for the user and for every project seen so far
const defs = sub => [...new Set([...roots].flatMap(r => { try { return fs.readdirSync(path.join(r, sub)) } catch { return [] } }))]
const roster = () => defs('agents').filter(f => f.endsWith('.md')).map(f => f.slice(0, -3))

const usage = l => {
  if (!l.includes('"usage"')) return
  const r = JSON.parse(l), m = r.message, u = m?.usage
  if (!u || !m.model || seen.has(m.id)) return   // one API message spans several transcript lines
  seen.add(m.id)
  emit({ t: Date.parse(r.timestamp) / 1000 | 0, hook_event_name: 'Usage', session_id: r.sessionId, cwd: r.cwd,
    agent_id: r.agentId ?? undefined, agent_type: r.attributionAgent, model: m.model, effort: r.effort,
    ctx: u.input_tokens + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), out: u.output_tokens })
}

const pump = () => {
  const day = Date.now() - 864e5
  let all = []; try { all = fs.globSync('**/*.jsonl', { cwd: projects }) } catch {}
  for (const f of [log, ...all.map(f => path.join(projects, f))]) {
    let st; try { st = fs.statSync(f) } catch { continue }
    if (f !== log && st.mtimeMs < day) continue
    let s = files.get(f)
    if (!s) files.set(f, s = { pos: Math.max(0, st.size - TAIL), buf: '', cut: st.size > TAIL })
    if (st.size <= s.pos) continue
    const b = Buffer.alloc(st.size - s.pos), fd = fs.openSync(f, 'r')
    fs.readSync(fd, b, 0, b.length, s.pos); fs.closeSync(fd); s.pos = st.size
    const lines = (s.buf + b).split('\n'); s.buf = lines.pop()
    if (s.cut) { lines.shift(); s.cut = false }   // first line of a tailed file is partial
    for (const l of lines) try { f === log ? emit(JSON.parse(l)) : usage(l) } catch {}
  }
}
pump(); hist.sort((a, b) => a.t - b.t)
setInterval(pump, 1000)

http.createServer((req, res) => {
  // only a page opened as localhost may read the stream: stops a website that re-points its own name at 127.0.0.1 (DNS rebinding)
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(req.headers.host || '')) return res.writeHead(403).end()
  if (req.url === '/roster') return res.end(JSON.stringify(roster()))
  if (req.url === '/skills') return res.end(JSON.stringify(defs('skills').filter(f => [...roots].some(r => fs.existsSync(path.join(r, 'skills', f, 'SKILL.md'))))))
  // subscription limits, as last saved by the status line command (statusline.mjs)
  if (req.url === '/limits') return fs.readFile(path.join(cfg, 'monitor', 'limits.json'), (e, d) => res.end(e ? '{}' : d))
  // opt-in (SHOW_ACCOUNT=1): the signed-in account, from Claude Code's own config file; off by default so no e-mail shows on a shared screen
  if (req.url === '/account') return fs.readFile(path.join(process.env.CLAUDE_CONFIG_DIR || os.homedir(), '.claude.json'), (e, d) => {
    let a = {}; try { if (process.env.SHOW_ACCOUNT) a = JSON.parse(d).oauthAccount || {} } catch {}
    res.end(JSON.stringify({ email: a.emailAddress, org: a.organizationName, plan: a.organizationType }))
  })
  if (req.url !== '/events') return fs.createReadStream(path.join(import.meta.dirname, 'index.html')).pipe(res.setHeader('content-type', 'text/html; charset=utf-8'))
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  for (const o of hist) res.write(`data: ${JSON.stringify(o)}\n\n`)
  clients.add(res)
  req.on('close', () => clients.delete(res))
}).on('error', e => console.log(e.code === 'EADDRINUSE' ? `monitor already running on http://localhost:${port}` : e.message))
  .listen(port, '127.0.0.1', () => console.log(`monitor on http://localhost:${port}`))
