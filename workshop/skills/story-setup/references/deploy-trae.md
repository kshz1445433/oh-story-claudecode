# TRAE Code 部署

`target_cli` 含 `trae` 时，由 SKILL.md Phase 2 完整读取本文件并按顺序执行。路径安全检查、幂等重跑、清理自嵌套残留、部署标记、模板占位符、AGENTS.md 合并策略和安装报告的写法在 SKILL.md，这里只写 TRAE 专属部分与 TRAE / WorkBuddy 共用部分。

TRAE 分支部署**原生** Skills / Subagents / Commands / Rules / Hooks，不走 generic skills-only 降级模式。`.trae/skills/` 与 `.trae/commands/`（`.traecli/` 不在此列）是 TraeCode IDE 的原生发现路径。

> **单独部署 `workbuddy` 时也须读本文件的四个共用小节**：「部署源解析」「canonical 中文主包 Skill 清单」「TRAE / WorkBuddy 固定 Agent 名册」「管理资产收敛与减端」。它们对两端一体生效。

## 部署清单（机械可检查）

| Source path | Target path | Owner class | Merge mode | Validation check |
|-------------|-------------|-------------|------------|------------------|
| `skills/story-setup/references/trae/AGENTS.md.tmpl` | `AGENTS.md` | user+managed | marker/section merge | contains TRAE Code story routing and fallback contract；只替换 `BEGIN/END oh-story-managed: trae` 块 |
| canonical repository `skills/{browser-cdp,story*}/` | `.trae/skills/{skill-name}/` | story-setup managed for the fixed canonical names | backup + replace managed dirs only | 目标 `SKILL.md` 数量/名字与「canonical 中文主包 Skill 清单」一致；源目标同一则 no-op |
| `skills/story-setup/references/trae/commands/` | `.trae/commands/{skill-name}.md` | story-setup managed by `oh-story-managed` marker | backup + replace managed files only | 每个 canonical skill 恰有一个同名 command，frontmatter 含 `name` / `description` |
| `skills/story-setup/references/trae/agents/` | `.trae/agents/` | story-setup managed by `oh-story-managed` marker | backup + replace 精确通用名册（8 张） | 名字集精确为通用 8 名；TRAE frontmatter 可解析 |
| repository `skills/story-data-analyze/agents/trae/` | `.trae/agents/` | story-setup managed by `oh-story-managed` marker | backup + replace 精确数据名册（5 张） | 名字集精确为 TRAE 数据 5 名；与通用角色无重名 |
| `skills/story-setup/references/trae/rules/` | `.trae/rules/` | story-setup managed by `oh-story-managed` marker | backup + replace managed files only | rules frontmatter 含 `alwaysApply` / `globs` |
| `skills/story-setup/references/trae/hooks/{story_trae_hook.js,story_hook_core.js}` | `.trae/hooks/` 同名文件 | runner by adapter header; core by fixed name + packaged hash | backup + replace managed files only | Node syntax valid；shared core 与其他 adapter 副本一致 |
| `skills/story-setup/references/trae/hooks/hooks.json` | `.trae/hooks.json` | user+managed | replace managed registrations by stable hook command identity | `version: 1`；仅含 TRAE 支持事件；用户 hook/顶层字段保留 |
| `skills/story-setup/scripts/merge-trae-hooks.py` | 部署时执行，不复制到项目 | story-setup helper | execute | 迁移旧 matcher/command、保留用户配置，重复执行字节幂等 |
| `skills/story-setup/scripts/trae-core-ownership.py` + `references/trae/legacy-managed-sha256.json` | 部署时执行，不复制到项目 | story-setup ownership helper/registry | classify before replace | marker / legacy SHA 判 managed；unknown/error 保留并报告 |

## 部署前置

### TRAE 归属与备份门

在改动任何已存在的 `.trae/` 文件前，先把本次会改动的原文件按相对路径备份到 `.trae/.oh-story-backups/<UTC时间戳>/`；目录备份本身也要先跑 `copy-path-safety.py`。

只允许替换下列资产：

- 带 `oh-story-managed` 标记的 canonical 中文主包 skill / command / agent / rule / AGENTS 管理块；
- 头注释明确为 oh-story TRAE adapter 的 `story_trae_hook.js`；
- 满足下列任一归属证据的 `story_hook_core.js`：含通用标记 `oh-story-managed: shared-hook-core`；用 `scripts/trae-core-ownership.py` 校验后 sha256 命中唯一权威 `references/trae/legacy-managed-sha256.json`；或与已验证的同项目 Claude/OpenCode/ZCode oh-story shared core 字节一致。

Skill 目录的归属证据是 `SKILL.md` 的 `metadata.openclaw.source` 指向本仓库，或精确标记 `<!-- oh-story-managed: skill/{name} -->`。同名但无归属证据的用户文件必须保留并报告冲突，不得覆盖。`.trae/hooks.json` 始终用 helper 按稳定 command 身份合并，绝不整文件替换。新创建的产物必须写入对应管理标记，以保证下次可安全升级。

### TRAE 与 Claude Hook 去重门

TraeCode 会兼容读取项目 `.claude/settings*.json`。Claude settings 命令保持跨平台可执行的直接 `bash ...` 形式，不内嵌 POSIX `if`；所有 Claude shell 入口在 `source lib/common.sh` 后由共用库检测 `TRAE_PROJECT_DIR` 并成功、静默退出。在 Claude 中照常执行，在 TRAE 进程中由 `.trae/hooks.json` 独占执行。

Windows 的 TRAE Hook 默认由 PowerShell 执行；若系统没有可用的 `bash`，导入的 Claude 命令会在进入去重守卫前失败，因此安装报告必须提示用户在 Hooks 面板禁用旧 Claude 配置，只启用 `.trae/hooks.json`。部署后用两端合成输入验证同一事件只有一套 oh-story 输出，不能把「双份提示看起来一样」当作可接受。

## TRAE Code 原生部署算法

1. 按「canonical 中文主包 Skill 清单」确认固定 canonical 名字集。在任何写入前，按「TRAE 归属与备份门」为本次将改动的已存管理资产建立带 UTC 时间戳的备份；遇到无 `oh-story-managed` 标记的同名文件则保留、记录冲突并停止该资产写入。
2. 逐项过 `copy-path-safety.py` 后，把 canonical Skill 复制到 `.trae/skills/{skill-name}/`。目标缺失则创建；已是 oh-story skill（`SKILL.md` 的 `metadata.openclaw.source` 指向本仓库，或含精确标记 `<!-- oh-story-managed: skill/{skill-name} -->`）才可备份后替换。现有 sentinel 不能代替单个 Skill 的归属证据；无证据则保留并报告。`status=same` 的 Skill 只验证，不复制进自身。
3. 对 canonical 名字逐一部署 `references/trae/commands/{name}.md`；canonical 中的某个 skill 缺预生成模板时即按部署包不完整停止，不为项目额外 Skill 生成 fallback command。只替换带相同管理标记的文件。`references/trae/commands/` 里存在但不对应任何 canonical skill 的模板（见「canonical 中文主包 Skill 清单」第 3 条）不部署，跳过并报告。
4. 按「部署 TRAE Agents」与「TRAE / WorkBuddy 固定 Agent 名册」把通用 8 名与 TRAE 数据 5 名的精确并集（13 张）部署到 `.trae/agents/`。仅内置 Agent 才能调用子 Agent；skill 流程遇到子 Agent 不可用必须走已定义的 `solo/direct` fallback。
5. 将 `references/trae/rules/*.md` 写入 `.trae/rules/`，只替换带 `<!-- oh-story-managed: rule/... -->` 标记的文件；TRAE rule frontmatter 使用 `alwaysApply: false` 和 `globs`，不复制 Claude `paths` frontmatter。将 `references/trae/AGENTS.md.tmpl` 按 SKILL.md「AGENTS.md 合并策略」写入根 `AGENTS.md`，只替换 `<!-- BEGIN oh-story-managed: trae -->` 与 `<!-- END oh-story-managed: trae -->` 之间的块，保留用户其他段落。
6. 将 `references/trae/hooks/story_trae_hook.js` 与 `story_hook_core.js` 写入 `.trae/hooks/`；runner 只替换头注释证明为 oh-story TRAE adapter 的同名文件。既有 shared core 必须先运行 `trae-core-ownership.py --candidate <文件> --registry references/trae/legacy-managed-sha256.json`，或证明与同项目受信 sibling core 字节一致；退出 3（unmanaged）/2（registry error）都保留并报告，不覆盖。替换后执行 `node --check` 与跨 adapter byte-parity 校验，再按下方「TRAE hooks.json 合并算法」合并 `.trae/hooks.json`；禁止用模板整体覆盖用户配置。
7. 校验 `.trae/skills/` 与 `.trae/commands/` 的受管名字集都精确等于 canonical 名字集，受管 Agent 名字集精确等于「TRAE / WorkBuddy 固定 Agent 名册」列出的 TRAE 13 名并集，rule/hooks/AGENTS 标记齐全，hooks 契约测试通过。用户其他 `.trae` 资产必须仍在。
8. `.story-deployed` 的 `target_cli` 写 `trae` 或多端组合，`references_dir` 写 `.trae/skills/story-setup/references/agent-references`。安装报告列出备份目录、冲突/no-op、canonical Skill / Command / 13 Agent 验证结果与 Agent 可用性，并提示新开 TRAE 会话刷新 Skills / Commands / Rules / Subagents / Hooks。

### 部署 TRAE Agents

- 先校验 `references/trae/agents/` 的名字集精确为通用 8 名，再校验 canonical `skills/story-data-analyze/agents/trae/` 的名字集精确为 TRAE 数据 5 名。两组必须无重名，合并后名册精确为 13 张；任一必需目录缺失、为空、名字集不等、重名或 frontmatter 不可解析时停止 TRAE 分支，不进行半套部署。
- 依次写入 `.trae/agents/`，只新建或替换带 `<!-- oh-story-managed: agent/<agent-name> -->` 标记的同名文件；无标记同名文件保留并报告。不删除用户其他 agents。
- TRAE frontmatter 只用其原生字段：`name`、`description`、逗号字符串形式的 `tools` / `disallowedTools` 以及可选的 TRAE 内置 `model`；禁止自动把 Claude 模型别名写入。
- 部署后提示新开 TRAE 会话并确认 Subagents Beta 功能可用。若当前 TRAE 版本/会话不支持原生 Agent，必须按各 skill 契约降级 `solo/direct`，报告 `Fallback: TRAE subagent unavailable -> solo/direct`；不得声称 full/lean 多 Agent 已生效。
- 部署完成后完整执行 `references/trae/runtime-activation.md`；未进「设置 > Hooks / 技能与命令 / Rules / Subagents」实际确认前，安装报告只能写「静态兼容，运行时未验证」。

### TRAE hooks.json 合并算法

1. 读取 `references/trae/hooks/hooks.json` 作为唯一当前模板，读取项目 `.trae/hooks.json`（不存在时视为空对象）。TRAE 合法 schema 是顶层 `{ "version": 1, "hooks": {...} }`，事件值为 matcher group 数组，group 内是 `matcher` + `hooks`，每个 hook 仅使用 `{ "type": "command", "command": "<单一 shell command 字符串>", "timeout": <秒> }`。
2. 按跨平台规则探测 `python3/python/py`；无可用解释器时停止 TRAE 分支，不手写或整体覆盖 JSON。
3. 调用 `"$PYBIN" "{story-setup skill目录}/scripts/merge-trae-hooks.py" --existing "{项目}/.trae/hooks.json" --template "{story-setup skill目录}/references/trae/hooks/hooks.json" --output "{项目}/.trae/hooks.json"`。helper 只把 command 中包含 `.trae/hooks/story_trae_hook.js` 的注册识别为 oh-story 管理项：先从历史 event/matcher 块移除它们，再追加当前模板。同一 matcher 块中的用户 hook、其他事件、未知顶层字段全部保留。
4. 写后校验 `version == 1`；事件名只能来自 TRAE 支持集 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Stop`、`Notification`，当前模板不得出现 `SessionEnd`、`PreCompact`、`PostCompact`、`SubagentStop`；hook 内不得出现 ZCode 的 `process/args/timeoutMs` 或 Claude 的 `if`。正文工具 matcher 覆盖 TRAE 原生 `RunCommand|Write|Edit`，commit advisory 覆盖 `RunCommand`。
5. 统计模板中每个 oh-story command 身份在结果中恰好一份，用户 hook/顶层字段仍在；再次运行 helper，必须与上次输出字节一致。

## 共用规则

### 部署源解析（防项目旧副本自复制）

1. 记下当前正在执行的 `story-setup` 目录与其上一级 skills 根，称为 `bootstrap_root`。如果它位于目标项目的 `.trae/skills/`、`.codebuddy/skills/`、`.zcode/skills/`、`.codex/skills/`、`.claude/skills/` 或根 `skills/` 下，它只是「已部署快照」，不得一概当成升级权威源。
2. 已部署项目另外枚举这些可验证候选：当前已启用 plugin 的 `${CODEBUDDY_PLUGIN_ROOT}/skills/story-setup`、`~/.agents/skills/story-setup`、`~/.claude/skills/story-setup`、`~/.codex/skills/story-setup`，以及用户本次显式给出的本地安装目录。不搜索整个磁盘，不从网页或浮动仓库直接执行未验证内容。
3. 候选只有在以下条件全部成立时才有效：`SKILL.md` frontmatter 的 `name=story-setup`、`version` 为可比较的三段数字 SemVer、`metadata.openclaw.source` 指向本 oh-story 仓库，且 Phase 1 列出的 references 与 helper 自检全部通过。无效候选只报告，不读其他内容。
4. 在有效候选与 `bootstrap_root` 中按 SemVer 选最新完整包为 `canonical_root`；版本相同时优先项目外的安装包，版本较低的外部包不得反向降级项目。安装报告必须写出 `bootstrap_root`、`canonical_root`、各自版本/用途与选择原因。
5. 后续模板、helper 与 canonical 中文主包 Skill 全部从 `canonical_root` 读取；项目自定义 Skill 不进入 TRAE/WorkBuddy 本轮适配部署源，已有用户 Skill 保留不动。
6. `copy-path-safety.py` 的 `status=same` 只让当前那一个 source/target 项 no-op；不得因项目内 `story-setup` 副本指向自身，就跳过从 `canonical_root` 刷新其他 Skills、Commands、Agents、Rules 和 Hooks。

### canonical 中文主包 Skill 清单（所有 skills 复制分支共用）

1. `canonical_root/skills/` 中**含 `SKILL.md` 的目录**构成可部署名单。本仓库当前精确为 16 个：`browser-cdp`、`story`、`story-cover`、`story-data-analyze`、`story-deslop`、`story-import`、`story-long-analyze`、`story-long-scan`、`story-long-write`、`story-publish`、`story-release-package`、`story-review`、`story-setup`、`story-short-analyze`、`story-short-scan`、`story-short-write`。
2. 按上述名字集读取每个 `SKILL.md` frontmatter 的 `name` / `description`；任一缺失、目录名与 `name` 不一致或重名时停止部署。不因项目根出现额外 `story*` 目录而扩张主包。
3. **命令模板与 skill 名单对齐**：`references/trae/commands/` 与 `references/workbuddy/commands/` 里每个模板都必须一一对应一个 canonical skill（本仓库当前精确为 16 个）。作品查询与资料研究的能力已由 agent 角色 `story-explorer` / `story-researcher` 承载（见「固定 Agent 名册」），**不设对应的项目命令**；出现不对应任何 canonical skill 的模板时停止并报告，不得据此判定包不完整、也不得为之临时生成 skill。
4. 对每个源 Skill 目录与对应目标目录逐项执行 `copy-path-safety.py`；`same` 记录为 no-op，`unsafe/error` 停止，仅 `safe` 可复制。不对整个用户 skills 根目录做删除或整体替换。

### TRAE / WorkBuddy 固定 Agent 名册

1. 两端共用通用名册精确为 8 张：`chapter-extractor`, `character-designer`, `consistency-checker`, `narrative-writer`, `revision-governor`, `story-architect`, `story-explorer`, `story-researcher`。
2. TRAE 数据名册精确为 5 张：`story-data-fetcher`, `story-data-method-validator`, `story-data-metrics-analyst`, `story-data-supervisor`, `story-data-text-improvement-planner`。TRAE 物理名册必须精确等于前述 8 张通用卡与这 5 张数据卡的并集，共 13 张。
3. WorkBuddy 数据物理名册精确为 2 张：`story-data-fetcher`, `story-data-readonly-runner`。WorkBuddy 物理名册必须精确等于前述 8 张通用卡与这 2 张数据卡的并集，共 10 张。四个只读逻辑角色卡随数据分析 Skill 自身部署，由其运行时映射定位，不作物理 Agent 注册。
4. 两端都只备份/替换上述精确 marker 卡，保留用户 Agent；上次受管但本次不在对应精确名字集的卡走「管理资产收敛」备份后删除。

### 管理资产收敛与减端

1. Phase 1 在修改 `target_cli` 前同时保存 `previous_targets` 与 `desired_targets`。先完成新端部署和被移除端的退役，全部验证通过后才原子写回 sentinel；不得先改 `.story-deployed` 再留下仍会被平台发现的旧资产。
2. 目标端仍保留时也要做名字集收敛：Skill / Command 以 canonical 名字集为唯一名册，TRAE Agent 以通用 8 名 + TRAE 数据 5 名（共 13 张）为唯一名册，WorkBuddy Agent 以通用 8 名 + WorkBuddy 数据物理 2 名（共 10 张）为唯一名册。将已有精确管理标记/仓库 metadata、但已不在对应精确名字集中的 Skill / Command / Agent / Rule 列为 stale managed assets。先备份，再只删这些可证归属的 stale 项；无标记同名项永不删。删后只在目录真的为空时移除空目录。
3. 从 `previous_targets` 移除 `trae` 时：
   - 对即将改动的 `.trae/` 管理资产建立 `.trae/.oh-story-backups/<UTC时间戳>/` 完整相对路径备份；
   - 用 `merge-trae-hooks.py --template references/trae/hooks/disabled-hooks.json` 从 `.trae/hooks.json` 移除且仅移除 `story_trae_hook.js` 注册，保留用户 hooks/顶层字段，并复跑确认字节幂等；
   - 仅删除能由「TRAE 归属与备份门」证明的 `.trae/skills`、`commands`、`agents`、`rules` 管理项及两个管理 hook 脚本；从 `AGENTS.md` 只移除 TRAE BEGIN/END 管理块。
4. 从 `previous_targets` 移除 `workbuddy` 时：
   - 先将即将改动的项目管理资产备份到 `.codebuddy/.oh-story-backups/<UTC时间戳>/`；
   - 用 `merge-workbuddy-settings.py --template references/workbuddy/hooks/disabled-hooks.json` 从 `.codebuddy/settings.json` 移除项目 oh-story Hook 注册，用户设置和 hooks 不动，复跑确认字节幂等；
   - 仅删除有精确归属证据的 `.codebuddy/skills`、`commands`、`agents`、`rules` 管理项及项目 hook 脚本；从当前唯一 memory 文件只移除 WorkBuddy BEGIN/END 块。如果该 memory 文件是 story-setup 创建且移除后只剩空白，可在备份后删除；否则保留；
   - 项目减端不等于卸载用户级/plugin 级 oh-story；已启用 plugin 只由 CodeBuddy plugin 管理命令单独卸载。
5. 两个项目 runner 还必须在每个事件入口检查 sentinel：如果存在有效 `target_cli` 且不含当前端，立即以空 stdout 成功返回。这是中途失败的防御线，不能代替上述物理注册/发现资产清理。
6. 退役验收必须同时证明：管理 Hook 注册为 0；管理 Skill/Command/Agent/Rule/memory 块不再被目标平台发现；用户资产字节未变；备份可回滚；再跑一次为 no-op。任一项失败时不更新 sentinel，报告部分退役路径。

## 验证

- 检查根 `AGENTS.md` 只有一个完整 `oh-story-managed: trae` 管理块，用户其他段落仍在
- 检查 `.trae/skills/` 与 `.trae/commands/` 的受管名字集均精确等于 canonical 名字集；每个 skill 有 `SKILL.md`，每个 command 有 `name` / `description` 与 `oh-story-managed` 标记
- 检查 `.trae/agents/` 的受管名字集精确等于「TRAE / WorkBuddy 固定 Agent 名册」列出的通用 8 名 + TRAE 数据 5 名（共 13 张），frontmatter 可解析、`name` 唯一、无 Claude-only 字段，管理标记齐全
- 检查 `.trae/rules/` 的管理文件包含 `alwaysApply` / `globs`，不含 Claude `paths` frontmatter
- 检查 `.trae/hooks/story_trae_hook.js`、`story_hook_core.js` 存在且 `node --check` 通过；`.trae/hooks.json` 是 `version: 1`，只使用 TRAE 支持事件和 `{type,command,timeout}` hook schema，matcher 覆盖 `RunCommand|Write|Edit`，不得出现 `SubagentStop`
- 用 fixture 调用 SessionStart、PreToolUse deny/allow、PostToolUse，确认无发现时 stdout 为空、有输出时符合 TRAE `hookSpecificOutput`；复跑 `merge-trae-hooks.py` 确认用户 hook/未知字段保留且字节幂等
- 检查 `.claude/settings*.json` 的 oh-story 命令保持直接 `bash ...`（不得内嵌仅 POSIX 可解析的 `if`）；所有 Claude 入口都 source 含 `TRAE_PROJECT_DIR` 静默退出逻辑的 `lib/common.sh`。用同一 PreToolUse fixture 证明 Claude 导入 Hook 在 TRAE 下无输出、TRAE 原生 Hook 只执行一次
- 检查 `.trae/skills/story-setup/references/agent-references/` 完整且所有 reference 路径可解析

## 安装报告必须提示

- 列出 `.trae/.oh-story-backups/` 本次备份位置和任何冲突/no-op
- 在 TRAE「设置 > Hooks」页面 review/enable 本项目 Hooks；确认项目 `AGENTS.md` / Rules 导入已启用；Windows 上若同时启用了 Claude 配置且有旧去重守卫缺失，须禁用 Claude 配置只留 `.trae/hooks.json`
- Hook 运行需要 PATH 中可用的 `node`
- 新开 TRAE 会话刷新原生 Skills / Commands / Rules / Subagents / Hooks；Subagents Beta 不可用时，full/lean 多 Agent 请求必须报告 `Fallback: TRAE subagent unavailable -> solo/direct`
- 未在设置面板实际确认 Skills / Commands / Rules / Subagents / Hooks 生效前，只能报告「静态兼容，运行时未验证」
