#!/usr/bin/env node
"use strict"
// oh-story TraeWork 降级检查入口（story_check_cli.js）
//
// 背景：TraeWork（TRAE SOLO）无 Hooks 面板入口，平台不会自动触发
// 项目 .trae/hooks.json。原四个 hook 职责改为由 skill 流程在关键时刻
// 显式调起本脚本执行（"Hooks 降级为 Skill 内部脚本"）。
//
// 本脚本是纯调度层：把人类友好的参数翻译成 hook 期望的 JSON 输入，
// 调起同目录的 story_trae_hook.js，再把结果翻译回可读文本。
// 不改动 story_trae_hook.js / story_hook_core.js 的任何逻辑。
//
// 用法：
//   node story_check_cli.js session-start  [--cwd <dir>] [--json]
//   node story_check_cli.js pre-write      [--cwd <dir>] --file <正文路径> [--json]
//   node story_check_cli.js pre-commit     [--cwd <dir>] --command "<shell>" [--json]
//   node story_check_cli.js post-write     [--cwd <dir>] --file <正文路径> [--json]
//
// 退出码：0 = 无阻断 / 无发现；1 = pre-write 被 deny（须先补细纲）；
//         2 = 调用错误（参数缺失、脚本缺失、hook 异常）。

const fs = require("node:fs")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const STAGE_TO_EVENT = {
  "session-start": "session-start",
  "pre-write": "pre-tool-prose-guard",
  "pre-commit": "pre-tool-commit-advisory",
  "post-write": "post-tool-prose-check",
}

function parseArgs(argv) {
  const opts = { stage: "", cwd: process.cwd(), file: "", command: "", json: false }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === "--json") { opts.json = true; continue }
    if (token === "--cwd") { opts.cwd = argv[++i] || opts.cwd; continue }
    if (token === "--file") { opts.file = argv[++i] || ""; continue }
    if (token === "--command") { opts.command = argv[++i] || ""; continue }
    rest.push(token)
  }
  opts.stage = rest[0] || ""
  return opts
}

function fail(message) {
  process.stderr.write(`[story_check_cli] ${message}\n`)
  process.exitCode = 2
}

function buildInput(stage, opts) {
  if (stage === "pre-write" || stage === "post-write") {
    if (!opts.file) { fail(`${stage} 需要 --file <正文路径>`); return null }
    return { cwd: opts.cwd, tool_name: "Write", tool_input: { file_path: opts.file } }
  }
  if (stage === "pre-commit") {
    if (!opts.command) { fail("pre-commit 需要 --command \"<shell 命令>\""); return null }
    return { cwd: opts.cwd, tool_name: "RunCommand", tool_input: { command: opts.command } }
  }
  return { cwd: opts.cwd }
}

function extraFromHookOutput(raw) {
  const text = String(raw || "").trim()
  if (!text) return { extra: "", deny: false, reason: "" }
  let parsed
  try { parsed = JSON.parse(text) } catch { return { extra: text, deny: false, reason: "" } }
  const spec = parsed?.hookSpecificOutput || {}
  if (spec.permissionDecision === "deny") {
    return { extra: "", deny: true, reason: String(spec.permissionDecisionReason || "") }
  }
  return { extra: String(spec.additionalContext || ""), deny: false, reason: "" }
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  const hookEvent = STAGE_TO_EVENT[opts.stage]
  if (!hookEvent) {
    fail(`未知阶段 "${opts.stage}"；可用：${Object.keys(STAGE_TO_EVENT).join(" / ")}`)
    return
  }
  const root = path.resolve(opts.cwd)
  if (!fs.existsSync(root)) { fail(`--cwd 不存在：${root}`); return }
  const hookPath = path.join(__dirname, "story_trae_hook.js")
  if (!fs.existsSync(hookPath)) {
    fail(`未找到 hook 脚本：${hookPath}（story_check_cli.js 必须与 story_trae_hook.js 同目录）`)
    return
  }
  const input = buildInput(opts.stage, opts)
  if (input === null) return

  const result = spawnSync(process.execPath, [hookPath, hookEvent], {
    cwd: root,
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, TRAE_PROJECT_DIR: root },
  })
  if (result.error) { fail(`调起 hook 失败：${result.error.message}`); return }

  const raw = (result.stdout || "").trim()
  const { extra, deny, reason } = extraFromHookOutput(raw)

  if (opts.json) { process.stdout.write(raw); return }

  if (deny) {
    process.stdout.write(`BLOCKED: ${reason}\n`)
    process.exitCode = 1
    return
  }
  if (extra) { process.stdout.write(`${extra}\n`); return }
  process.stdout.write(`OK: ${opts.stage} 无阻断、无发现\n`)
}

if (require.main === module) main()

module.exports = { STAGE_TO_EVENT, parseArgs, buildInput, extraFromHookOutput }
