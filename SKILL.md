---
name: ai-observability
description: Install, run, read and troubleshoot AI Observability for Claude Code, the local dashboard that shows every Claude Code session, agent, skill, model, tool call, token count and context window on this machine. Use when the user asks to set up or start the dashboard or monitor, asks what a tile, pop-up or figure on it means, wants their usage limits shown, or reports that it shows no data.
---

# AI Observability for Claude Code

One local page, `http://localhost:4777`, fed by Claude Code hooks. No dependencies, no network calls. Needs Node.js 22 or newer.

## Install

Pick one route. Never combine the plugin with a script install: every event would be logged twice.

| Route | How |
|---|---|
| Plugin | `/plugin marketplace add rubinato/ai-observability-for-claude-code`, then `/plugin install ai-observability@ai-observability-for-claude-code`, restart Claude Code |
| Script, from a clone | macOS, Ubuntu, Debian: `sh install.sh` · Windows: `install.cmd` or `.\install.ps1` |
| No clone | `npx -y github:rubinato/ai-observability-for-claude-code install` |
| Offline | unzip `ai-observability-for-claude-code.zip` (built with `npm run zip`), then run the script for the system |

The script copies five files to `~/.claude/monitor/` and adds its hooks to `~/.claude/settings.json`, keeping a copy as `settings.json.bak`. It leaves the user's own hooks alone, and sets a status line only if the user has none. Check for an existing install before running it.

## Run

- Start: `node ~/.claude/monitor/server.mjs` (plugin: `/ai-observability:observe`). Run it in the background or in the user's terminal; it must stay up.
- Stop: Ctrl+C in its terminal, or end the `server.mjs` process.
- Settings: `PORT` (default 4777), `CLAUDE_CONFIG_DIR` (default `~/.claude`).

## Read the dashboard

It covers every session in every project on the machine. The menu at the top right filters the whole page to one project.

| Section | Shows |
|---|---|
| OWNER | the user's prompts: count today, the last one, activity by hour |
| CONTEXT | folders read and written (docs, src, tests, memory…) |
| MAIN SPINE | one tile per session, 20 most recent: project, context size, turns, last action; "your turn" means it waits for the user |
| AGENTS | every sub-agent defined or seen; a working one opens wide with its task and latest command |
| SKILLS | every skill defined or used; "in use" while the turn that loaded it runs |
| MODELS | calls, tokens out, context and effort per model, plus a tools tile |
| RUN LOG | every event as a line; the box at the bottom left filters it |
| DISPATCH | each agent run with a progress bar |
| OUTPUT | tokens today, call counts, and each session's context window (amber at 50%, red at 60%) |

Signals:
- Lines connect who called what: session to agent, agent to model, session to skill.
- A moving teal edge with a count marks work still running in the background.
- A header-only strip marked "never" is an agent or skill that was defined but not used.
- The pixel creature in the title bar acts out the state: asleep, watching, busy, or waving when a session waits.

## Pop-ups

Hovering any tile, run log line, dispatch row, the token figure or a context row opens a live card with its full detail, after about a quarter of a second. Linked tiles stay lit. Tiles are also reachable with Tab; Esc closes the card.

## Usage limits

The token card shows the 5-hour and weekly subscription limits with reset times. They arrive through the status line command `statusline.mjs`, and only for subscribers, after the first reply of a session. If the gauges are missing, check that `statusLine` in `settings.json` points at `monitor/statusline.mjs` and that `~/.claude/monitor/limits.json` exists.

The same card lists the signed-in account (e-mail, organization, plan) only when the server is started with `SHOW_ACCOUNT=1`. It is off by default, so the e-mail does not show on a shared screen; ask before turning it on.

## Troubleshoot

| Symptom | Cause and fix |
|---|---|
| "monitor already running" | the port is taken: open the page, or start with another `PORT` |
| Page opens, no tiles move | only sessions started after the install send events; start a new session |
| Every event appears twice | plugin and script are both installed: remove one |
| Agents or skills missing | they are read from `agents/` and `skills/` in `~/.claude/` and in each project's `.claude/`; a plugin's skill appears once used |
| A background task never clears | nothing reports a task that died with its session; it drops off 2 hours after the session goes quiet |
| 403 from the server | the page must be opened as `localhost` or `127.0.0.1` |

## Data and privacy

- `~/.claude/monitor/events.jsonl` holds the first 240 characters of each prompt and command in plain text, readable by the user only, and is never trimmed. Treat it like shell history; deleting it is safe.
- Session transcripts are read for model, effort and token counts only.
- The server listens on `127.0.0.1` only and has no login.

## Uninstall

Plugin: `/plugin uninstall ai-observability@ai-observability-for-claude-code`. Script: `node ~/.claude/monitor/cli.mjs uninstall`, then delete `~/.claude/monitor/`. Ask before deleting that folder: it holds the event log.
