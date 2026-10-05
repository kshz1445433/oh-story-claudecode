#!/usr/bin/env node
// check-updates.mjs — oh-story 双仓更新监听（零依赖，Node 18+）
//
// 监测 qin1473692580-ux/oh-story-claudecode 与 worldwonderer/oh-story-claudecode：
// 每仓查 releases/latest + main 最新 commit（共 4 请求/次；未认证限额 60/时，
// 30 分钟一跑 = 8 请求/时，余量 7.5 倍）。
//
// 用法：node check-updates.mjs
// 退出码：0=无更新（含首次建基线）  1=有更新（stdout 打印通知，全文留档 last_notice）
//         2=网络异常/锁占用，本次静默跳过
//
// 状态文件 tools/update-state.json 由本脚本自维护：
//   { repos: { qin: {lastTag,lastSha,lastCheck}, upstream: {...} }, last_notice }
// 单例锁 tools/.update.lock（内容为本次 PID）：
//   不存在 -> 写锁执行；存在且 mtime<5min -> 另一实例在跑，退出码 2；
//   存在但 mtime>=5min -> 崩溃残留陈旧锁，清除后照常执行。

"use strict";

import { writeFileSync, readFileSync, existsSync, statSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(TOOLS_DIR, "update-state.json");
const LOCK_PATH = join(TOOLS_DIR, ".update.lock");
const LOCK_STALE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const REPOS = {
  qin: { owner: "qin1473692580-ux/oh-story-claudecode", label: "qin1473692580-ux/oh-story-claudecode" },
  upstream: { owner: "worldwonderer/oh-story-claudecode", label: "worldwonderer/oh-story-claudecode" },
};

// ---------------------------------------------------------------------------
// 单例锁
// ---------------------------------------------------------------------------

function acquireLock() {
  if (existsSync(LOCK_PATH)) {
    const age = Date.now() - statSync(LOCK_PATH).mtimeMs;
    if (age < LOCK_STALE_MS) return false; // 另一实例正在跑
    try { unlinkSync(LOCK_PATH); } catch {} // 陈旧锁：清除后继续
  }
  writeFileSync(LOCK_PATH, String(process.pid), { encoding: "utf-8" });
  return true;
}

function releaseLock() {
  try { unlinkSync(LOCK_PATH); } catch {}
}

// ---------------------------------------------------------------------------
// GitHub API（逐端点容错，单个失败不影响其他）
// ---------------------------------------------------------------------------

async function ghFetch(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        "User-Agent": "oh-story-local-update-checker",
        Accept: "application/vnd.github+json",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 拉一个仓库的当前（tag, sha, 元信息）；两个端点都失败返回 null */
async function probeRepo(owner) {
  const out = { tag: null, sha: null };
  const errors = [];
  try {
    const rel = await ghFetch(`/repos/${owner}/releases/latest`);
    out.tag = rel.tag_name || null;
    out.releaseName = rel.name || null;
    out.releaseUrl = rel.html_url || null;
    out.releaseAt = rel.published_at || null;
  } catch (e) {
    errors.push(`releases/latest: ${e.message}`);
  }
  try {
    const commit = await ghFetch(`/repos/${owner}/commits/main`);
    out.sha = commit.sha ? String(commit.sha).slice(0, 7) : null;
    out.commitTitle = (commit.commit?.message || "").split("\n")[0].slice(0, 80);
    out.commitUrl = commit.html_url || null;
    out.commitAt = commit.commit?.author?.date || null;
  } catch (e) {
    errors.push(`commits/main: ${e.message}`);
  }
  if (out.tag === null && out.sha === null) {
    out.error = errors.join("; ");
    return null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 通知（§6.3 模板）
// ---------------------------------------------------------------------------

function fmtTime(iso) {
  if (!iso) return "未知";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildNotice(key, repo, current, prev) {
  const isRelease = current.tag && current.tag !== prev.lastTag;
  const lines = [
    "============================================",
    "!!! oh-story 上游有更新 !!!",
    "============================================",
    `仓库：${repo.label}`,
    `类型：${isRelease ? "新 Release" : "新提交"}`,
  ];
  if (isRelease) {
    lines.push(`版本：${prev.lastTag || "(无基线)"} -> ${current.tag}`);
    lines.push(`时间：${fmtTime(current.releaseAt)}`);
    lines.push(`链接：${current.releaseUrl || "(无)"}`);
  } else {
    lines.push(`提交：${current.commitTitle}（${current.sha}）`);
    lines.push(`时间：${fmtTime(current.commitAt)}`);
    lines.push(`链接：${current.commitUrl || "(无)"}`);
  }
  lines.push("--------------------------------------------");
  lines.push("本地处理：本部署为 TRAE 本地合并变体（local/trae 分支）,");
  lines.push("确认同步前不要自动 merge/rebase；同步流程见仓库 TRAE.md 第五节。");
  lines.push("============================================");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function loadState() {
  try {
    // 容错 BOM：PowerShell Set-Content -Encoding UTF8 会写带 BOM 的文件，JSON.parse 遇 BOM 直接抛错
    const raw = readFileSync(STATE_PATH, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  state.last_run = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

/** 主检查流程：返回退出码。注意 process.exit() 不执行 finally，锁的释放统一在外层。 */
async function runCheck() {
  const state = loadState() || { repos: {} };
  const notices = [];
  const failures = [];
  let baselineSet = false;

  for (const [key, repo] of Object.entries(REPOS)) {
    const current = await probeRepo(repo.owner);
    if (!current) {
      failures.push(`${key}: 两个端点都失败`);
      continue; // 该仓本轮不比较，避免网络故障造成假阳性
    }
    const prev = state.repos[key];
    if (!prev || !prev.lastTag || !prev.lastSha) {
      // 首次见到该仓：只建基线，不算更新
      state.repos[key] = {
        lastTag: current.tag,
        lastSha: current.sha,
        lastCheck: new Date().toISOString(),
      };
      baselineSet = true;
      console.log(`[BASELINE] ${key}: tag=${current.tag} sha=${current.sha}`);
      continue;
    }
    if (current.tag !== prev.lastTag || current.sha !== prev.lastSha) {
      notices.push(buildNotice(key, repo, current, prev));
      state.repos[key] = {
        lastTag: current.tag,
        lastSha: current.sha,
        lastCheck: new Date().toISOString(),
      };
    } else {
      state.repos[key].lastCheck = new Date().toISOString();
    }
  }

  if (notices.length > 0) {
    state.last_notice = notices.join("\n\n");
    state.last_notice_at = new Date().toISOString();
  }

  if (failures.length === Object.keys(REPOS).length) {
    // 两仓全部拉取失败才算网络异常；部分成功则照常按已有数据判定
    saveState(state);
    console.error(`网络异常（${failures.join(" | ")}），本次跳过。`);
    return 2;
  }

  saveState(state);

  if (notices.length > 0) {
    console.log(notices.join("\n\n"));
    return 1;
  }
  if (failures.length > 0) {
    console.log(`无更新（${failures.length} 个仓库本轮拉取失败已跳过）。`);
  } else {
    console.log(`无更新（${baselineSet ? "含新基线建立" : "两仓均无变化"}，${new Date().toLocaleString("zh-CN")}）。`);
  }
  return 0;
}

if (!acquireLock()) {
  console.error("另一实例正在运行（锁 <5 分钟），本次跳过。");
  process.exit(2);
}

let exitCode;
try {
  exitCode = await runCheck();
} catch (e) {
  console.error(`监听异常: ${e.message}`);
  exitCode = 2;
}
releaseLock();
process.exit(exitCode);
