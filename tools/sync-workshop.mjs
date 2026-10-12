#!/usr/bin/env node
// sync-workshop.mjs — workshop 现役层快照同步与回溯工具（零依赖，Node 18+）
//
// 角色：workshop/ = 在役部署层的权威快照（详见 workshop/README.md）。
//       本脚本做三件事：
//         1) diff    —— 比对在役层 vs workshop，只读报告（先看后做）
//         2) sync    —— 按比对结果回填（只拷差异文件），追加版本台账行
//         3) restore —— 单技能回退到指定 git commit（workshop 内取历史版本）
//
// 用法：
//   node sync-workshop.mjs              # = --sync（默认回填）
//   node sync-workshop.mjs --diff       # 只比对不落盘
//   node sync-workshop.mjs --restore <技能目录名> <commit>
//       # 例：node sync-workshop.mjs --restore story-long-scan 273c8c6
//       # 将 workshop/skills/story-long-scan 整目录回退到 273c8c6 时的版本
//       # （回退只改 workshop，不动在役层；要部署回在役层由人手工执行）
//
// 退出码：0=成功；1=有差异（--diff 模式）；2=参数/路径错误；3=git 失败
//
// 真源映射（与 workshop/README.md 一致）：
//   在役层 skills   = ~/.trae-cn/skills/            → workshop/skills/
//   在役层 commands = ~/.trae-cn/commands/          → workshop/commands/
//   在役层 drama    = F:/AI/Trae工作区/漫剧/.trae/skills/ → workshop/drama/
//
// 台账：workshop/版本台账.md —— 每次成功 sync 自动追加一行（日期|commit|变更数|摘要）。

"use strict";

import { execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
  readdirSync, statSync, rmSync, copyFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WORKSHOP = join(REPO_ROOT, "workshop");
const LEDGER = join(WORKSHOP, "版本台账.md");

// 在役层真源（按需改成实际盘符；用 URL 编码安全路径）
const HOME = "c:/Users/74439";
const SOURCES = [
  { key: "skills",   src: join(HOME, ".trae-cn/skills"),   dst: join(WORKSHOP, "skills"),
    filter: (name) => name.startsWith("story") || name === "browser-cdp" },
  { key: "commands", src: join(HOME, ".trae-cn/commands"), dst: join(WORKSHOP, "commands"),
    filter: () => true },
  { key: "drama",    src: "F:/AI/Trae工作区/漫剧/.trae/skills", dst: join(WORKSHOP, "drama"),
    filter: () => true },
];

const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// 递归收集 { relPath(abs 相对 root), absPath }
function walk(root, out = [], prefix = "") {
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const abs = join(root, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "__pycache__" || entry.name === "node_modules" || entry.name === ".git") continue;
      walk(abs, out, rel);
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".pyc")) continue;
      out.push({ rel, abs });
    }
  }
  return out;
}

function listTopDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

// 返回 { changed: [{key,rel,reason}], identical: number, missingSrc: [key] }
function compare() {
  const result = { changed: [], identical: 0, missingSrc: [] };
  for (const { key, src, dst, filter } of SOURCES) {
    if (!existsSync(src)) { result.missingSrc.push(key); continue; }
    const srcFiles = walk(src).filter((f) => {
      const top = f.rel.split("/")[0];
      return top === "" || filter(top);
    });
    for (const f of srcFiles) {
      const dstAbs = join(dst, f.rel);
      if (!existsSync(dstAbs)) {
        result.changed.push({ key, rel: f.rel, reason: "NEW" });
      } else if (sha256(f.abs) !== sha256(dstAbs)) {
        result.changed.push({ key, rel: f.rel, reason: "MOD" });
      } else {
        result.identical++;
      }
    }
    // workshop 有、在役层没有 = 在役层删了 → 快照应删除
    const dstFiles = walk(dst).filter((f) => {
      const top = f.rel.split("/")[0];
      return filter(top);
    });
    for (const f of dstFiles) {
      const srcAbs = join(src, f.rel);
      if (!existsSync(srcAbs)) result.changed.push({ key, rel: f.rel, reason: "DEL" });
    }
  }
  return result;
}

function git(args) {
  try {
    return execFileSync("git", ["-C", REPO_ROOT, ...args], { encoding: "utf-8" }).trim();
  } catch (e) {
    console.error(`git 失败: ${args.join(" ")}\n${e.stderr || e.message}`);
    process.exit(3);
  }
}

function appendLedger(nChanged, commitPlaceholder) {
  if (!existsSync(LEDGER)) {
    mkdirSync(WORKSHOP, { recursive: true });
    writeFileSync(LEDGER,
      `# workshop 版本台账\n\n> 由 tools/sync-workshop.mjs 自动追加；回溯用 commit 号 + --restore。\n\n| 日期 | commit | 变更文件数 | 摘要 |\n|---|---|---|---|\n`,
      "utf-8");
  }
  const today = new Date().toISOString().slice(0, 10);
  const line = `| ${today} | ${commitPlaceholder} | ${nChanged} | 快照自动回填（详见该 commit message） |\n`;
  writeFileSync(LEDGER, readFileSync(LEDGER, "utf-8") + line, "utf-8");
}

function totalFiles() {
  let n = 0;
  for (const { dst } of SOURCES) { if (existsSync(dst)) n += walk(dst).length; }
  return n;
}

// ---------------------------------------------------------------------------

const mode = process.argv[2] || "--sync";

if (mode === "--diff" || mode === "--sync") {
  const r = compare();
  if (r.missingSrc.length) {
    console.error(`⚠ 在役层目录缺失: ${r.missingSrc.join(", ")} —— 请检查 SOURCES 配置`);
    process.exit(2);
  }
  console.log(`比对完成：一致 ${r.identical} 文件；差异 ${r.changed.length} 文件（快照总数现 ${totalFiles()}）`);
  if (!r.changed.length) {
    console.log("✓ 无差异，workshop 已与在役层一致。台账不追加。");
    process.exit(0);
  }
  for (const { key, rel, reason } of r.changed) console.log(`  [${reason}] ${key}/${rel}`);
  if (mode === "--diff") process.exit(r.changed.length ? 1 : 0);

  // --sync 执行回填
  let done = 0;
  for (const { key, rel, reason } of r.changed) {
    const src = SOURCES.find((s) => s.key === key);
    const dstAbs = join(src.dst, rel);
    const srcAbs = join(src.src, rel);
    if (reason === "DEL") { rmSync(dstAbs); }
    else {
      mkdirSync(dirname(dstAbs), { recursive: true });
      copyFileSync(srcAbs, dstAbs);
    }
    done++;
  }
  console.log(`✓ 回填完成：${done} 文件已同步（NEW/MOD 拷贝，DEL 删除）`);
  console.log("下一步：git add workshop && git commit（台账行已追加，commit 号需手工补填）");
  appendLedger(done, "（待填）");
  process.exit(0);
}

if (mode === "--restore") {
  const skill = process.argv[3];
  const commit = process.argv[4];
  if (!skill || !commit) {
    console.error("用法: node sync-workshop.mjs --restore <技能目录名> <commit>");
    process.exit(2);
  }
  const loc = SOURCES.map((s) => ({ s, ws: join(s.dst, skill) })).find((x) => existsSync(x.ws));
  if (!loc) { console.error(`✗ workshop 内找不到技能目录: ${skill}`); process.exit(2); }
  const wsAbsWSlash = loc.ws + "/";
  // 该 commit 里该技能的文件清单
  const files = git(["ls-tree", "-r", "--name-only", commit, "--", `workshop/${skill === "drama" ? "" : pathToWorkshopRel(loc.s, skill)}`]).split("\n").filter(Boolean);
  void files; // ls-tree 结果仅用于存在性提示
  git(["checkout", commit, "--", wsAbsWSlash.slice(REPO_ROOT.length + 1).replace(/\\/g, "/")]);
  console.log(`✓ ${skill} 已回退到 ${commit} 的版本（只改 workshop；在役层未动）`);
  console.log(`  若需部署回在役层：手工从 ${wsAbsWSlash} 拷回在役层目录。`);
  console.log(`  记得提交：git add workshop/${skill} && git commit`);
  process.exit(0);
}

function pathToWorkshopRel(sourceDef, skillName) {
  // skills/commands/drama 在 workshop 顶层各自独立，技能目录直接位于对应子目录下
  return `${sourceDef.key}/${skillName}`;
}

console.error(`未知模式: ${mode}（支持 --diff / --sync / --restore）`);
process.exit(2);