# TraeWork 部署

`target_cli` 含 `traework` 时，由 SKILL.md Phase 2 完整读取本文件并按顺序执行。路径安全检查、幂等重跑、清理自嵌套残留、部署标记、模板占位符、AGENTS.md 合并策略和安装报告的写法在 SKILL.md，这里只写 TraeWork 专属部分与 TraeWork / TRAE Code 共用部分。

TraeWork（TRAE SOLO）与 TraeCode 共用 `.trae/` 目录，但 TraeWork **没有项目 Hooks 入口**：平台不会自动执行 `.trae/hooks.json`。因此 TraeWork 分支部署原生 Skills / Commands / Rules，**Hooks 层降级为 Skill 流程内显式调起的内部脚本**（`.trae/hooks/story_check_cli.js`），判定逻辑与 TraeCode 完全一致。**不部署 `.trae/hooks.json` 注册，也不部署 `.trae/agents/`**（TraeWork 不读取，多角色走 `solo/direct` 常态降级）。

**与 TraeCode 的互斥识别**：TraeWork 判定以根 `AGENTS.md` 的标题行 `网文写作工具集（TraeWork）` 为准；TraeCode 为 `网文写作工具集（TRAE Code）`。二者在识别表中互斥，先由标题行判定，`.trae/` 目录信号只在两个标题行都不存在时回退判 `trae`。

## 部署清单（机械可检查）

| Source path | Target path | Owner class | Merge mode | Validation check |
|-------------|-------------|-------------|------------|------------------|
| `skills/story-setup/references/traework/AGENTS.md.tmpl` | `AGENTS.md` | user+managed | marker/section merge | contains TraeWork story routing and fallback contract；只替换 `BEGIN/END oh-story-managed: traework` 块；标题行须含 `网文写作工具集（TraeWork）` |
| canonical repository `skills/{browser-cdp,story*}/` | `.trae/skills/{skill-name}/` | story-setup managed for the fixed canonical names | backup + replace managed dirs only | 目标 `SKILL.md` 数量/名字与「canonical 中文主包 Skill 清单」一致；源目标同一则 no-op |
| `skills/story-setup/references/traework/commands/` | `.trae/commands/{skill-name}.md` | story-setup managed by `oh-story-managed` marker | backup + replace managed files only | 每个 canonical skill 恰有一个同名 command，frontmatter 含 `name` / `description` |
| `skills/story-setup/references/traework/rules/` | `.trae/rules/` | story-setup managed by `oh-story-managed` marker | backup + replace managed files only | rules frontmatter 含 `alwaysApply` / `globs` |
| `skills/story-setup/references/traework/hooks/{story_check_cli.js,story_trae_hook.js,story_hook_core.js}` | `.trae/hooks/` 同名文件 | runner/core by fixed name + packaged hash；cli by marker | backup + replace managed files only | Node syntax valid；shared core 与其他 adapter 副本一致；**不部署 hooks.json** |
| `skills/story-setup/scripts/trae-core-ownership.py` + `references/traework/legacy-managed-sha256.json` | 部署时执行，不复制到项目 | story-setup ownership helper/registry | classify before replace | marker / legacy SHA 判 managed；unknown/error 保留并报告 |

> TraeWork **不部署** `.trae/hooks.json` 与 `.trae/agents/`：前者平台无入口，后者平台不读取。这两个跳过项必须在安装报告中如实说明，不得留空。

**随包携带但不部署的资产**：`skills/story-setup/references/traework/agents/`（8 张通用角色卡）与 TraeCode 的 `references/trae/agents/` 逐字节一致，仅作 bundle 对等留存，**不作为部署源**——TraeWork 不读取 `.trae/agents/`，多角色一律走 `solo/direct`。`skills/story-setup/references/traework/hooks/story_check_cli.js` 是 TraeWork 的 Hooks 降级载体（由 Skill 流程显式调起），不是 hooks.json 注册项。

部署完成后的运行时激活与人工确认步骤，完整执行 `references/traework/runtime-activation.md`。

## 部署前置

### TraeWork 归属与备份门

在改动任何已存在的 `.trae/` 文件前，先把本次会改动的原文件按相对路径备份到 `.trae/.oh-story-backups/<UTC时间戳>/`；目录备份本身也要先跑 `copy-path-safety.py`。

只允许替换下列资产：

- 带 `oh-story-managed` 标记的 canonical 中文主包 skill / command / rule / AGENTS 管理块；
- 头注释明确为 oh-story TraeWork adapter 的 `story_trae_hook.js`；
- 满足下列任一归属证据的 `story_hook_core.js`：含通用标记 `oh-story-managed: shared-hook-core`；用 `scripts/trae-core-ownership.py` 校验后 sha256 命中唯一权威 `references/traework/legacy-managed-sha256.json`；或与已验证的同项目 Claude/OpenCode/ZCode/TraeCode oh-story shared core 字节一致。

Skill 目录的归属证据是 `SKILL.md` 的 `metadata.openclaw.source` 指向本仓库，或精确标记 `<!-- oh-story-managed: skill/{name} -->`。同名但无归属证据的用户文件必须保留并报告冲突，不得覆盖。新创建的产物必须写入对应管理标记，以保证下次可安全升级。

## TraeWork 原生部署算法

1. 按「canonical 中文主包 Skill 清单」确认固定 canonical 名字集。在任何写入前，按「TraeWork 归属与备份门」为本次将改动的已存管理资产建立带 UTC 时间戳的备份；遇到无 `oh-story-managed` 标记的同名文件则保留、记录冲突并停止该资产写入。
2. 逐项过 `copy-path-safety.py` 后，把 canonical Skill 复制到 `.trae/skills/{skill-name}/`。目标缺失则创建；已是 oh-story skill（`SKILL.md` 的 `metadata.openclaw.source` 指向本仓库，或含精确标记 `<!-- oh-story-managed: skill/{skill-name} -->`）才可备份后替换。现有 sentinel 不能代替单个 Skill 的归属证据；无证据则保留并报告。`status=same` 的 Skill 只验证，不复制进自身。
3. 对 canonical 名字逐一部署 `references/traework/commands/{name}.md`；canonical 中的某个 skill 缺预生成模板时即按部署包不完整停止。只替换带相同管理标记的文件。`references/traework/commands/` 里存在但不对应任何 canonical skill 的模板不部署，跳过并报告。
4. 将 `references/traework/rules/*.md` 写入 `.trae/rules/`，只替换带 `<!-- oh-story-managed: rule/... -->` 标记的文件；rule frontmatter 使用 `alwaysApply: false` 和 `globs`，不复制 Claude `paths` frontmatter。
5. 将 `references/traework/AGENTS.md.tmpl` 按 SKILL.md「AGENTS.md 合并策略」写入根 `AGENTS.md`，只替换 `<!-- BEGIN oh-story-managed: traework -->` 与 `<!-- END oh-story-managed: traework -->` 之间的块，保留用户其他段落。标题行必须写 `网文写作工具集（TraeWork）`；不得与 TraeCode 块的标题行相同。
6. 将 `references/traework/hooks/story_check_cli.js`、`story_trae_hook.js` 与 `story_hook_core.js` 写入 `.trae/hooks/`；runner 只替换头注释证明为 oh-story TraeWork adapter 的同名文件。既有 shared core 必须先运行 `trae-core-ownership.py --candidate <文件> --registry references/traework/legacy-managed-sha256.json`，或证明与同项目受信 sibling core 字节一致；退出 3（unmanaged）/2（registry error）都保留并报告，不覆盖。替换后执行 `node --check` 与跨 adapter byte-parity 校验。**不写 `.trae/hooks.json`**；若项目已有旧的 TraeWork hooks.json 注册，属历史残留，记录并提示用户手动清理（不自动改用户 JSON）。
7. 校验 `.trae/skills/` 与 `.trae/commands/` 的受管名字集都精确等于 canonical 名字集，rule/AGENTS 标记齐全，`.trae/hooks/` 三个脚本齐全且 `node --check` 通过，hooks 契约测试通过。用户其他 `.trae` 资产必须仍在。**不得创建 `.trae/agents/`。**
8. `.story-deployed` 的 `target_cli` 写 `traework` 或多端组合，`references_dir` 写 `.trae/skills/story-setup/references/agent-references`（与 TraeCode 共用）。安装报告列出备份目录、冲突/no-op、canonical Skill / Command 验证结果、**Hooks 降级说明与 Agents 跳过说明**，并提示新开 TraeWork 会话刷新 Skills / Commands / Rules。

## 验证

- 检查根 `AGENTS.md` 只有一个完整 `oh-story-managed: traework` 管理块，标题行含 `网文写作工具集（TraeWork）`，用户其他段落仍在
- 检查 `.trae/skills/` 与 `.trae/commands/` 的受管名字集均精确等于 canonical 名字集；每个 skill 有 `SKILL.md`，每个 command 有 `name` / `description` 与 `oh-story-managed` 标记
- 检查 `.trae/rules/` 的管理文件包含 `alwaysApply` / `globs`，不含 Claude `paths` frontmatter
- 检查 `.trae/hooks/story_check_cli.js`、`story_trae_hook.js`、`story_hook_core.js` 存在且 `node --check` 通过；`story_hook_core.js` 与其他 adapter 副本字节一致
- 用 fixture 调用 `story_check_cli.js`：`pre-write`（缺细纲）必须返回 `BLOCKED` 且 exit=1；`session-start` / `post-write` 无发现时输出 `OK`；`pre-commit` 无警告时正确 no-op；参数缺失时 exit=2
- 检查 `.trae/skills/story-setup/references/agent-references/` 完整且所有 reference 路径可解析
- 检查跨产品全局技能链可解析：`AI.skills.enablePeerProductSkills` 默认 `true`，TraeWork 与 TraeCode 共用的 peer 全局技能目录（`~/.trae-cn/skills/`）仍在发现范围内，链不断
- 确认**没有**新建 `.trae/hooks.json` 与 `.trae/agents/`（TraeWork 跳过项）

## 安装报告必须提示

- 列出 `.trae/.oh-story-backups/` 本次备份位置和任何冲突/no-op
- **Hooks 层**：TraeWork 不自动执行项目 Hook，写前/写后/会话开始时须由 Skill 流程运行 `node .trae/hooks/story_check_cli.js ...`；固定标注 `Fallback: TraeWork hooks not executed -> skill-invoked check script`
- **多智能体层**：TraeWork 不读取项目 agents，多角色走 `solo/direct`；固定标注 `Fallback: .trae/agents not read by TraeWork -> solo/direct`
- 运行 `story_check_cli.js` 需要 PATH 中可用的 `node`
- 新开 TraeWork 会话刷新原生 Skills / Commands / Rules；在「设置 > Rules」确认项目根的 `.trae/rules` 目录下 oh-story 规则已加载、根 `AGENTS.md` 已读入上下文
- 未在实际会话中确认 Skills / Commands / Rules 生效前，只能报告「静态兼容，运行时未验证」

**报告须写出的五句（TraeWork 版，逐句不得省）**：

1. 读取范围：Skills ✅ / Commands ⚠️或✅ / Rules ✅ / Hooks ❌（**无启用入口，项目 hook 不自动执行**；改由 skill 流程调起 `story_check_cli.js`） / **Agents ❌（不读取）**。
2. `Fallback: .trae/agents not read by TraeWork -> solo/direct`（固定句式）。
3. `Fallback: TraeWork hooks not executed -> skill-invoked check script`（固定句式）。
4. 能力等价、**效率与上下文经济不等价**的显式声明（多角色无并行、由主会话串行承担，属平台限制下的必然代价，非本方案引入）。
5. 未在 TraeWork 面板实际确认前，一律「静态兼容，运行时未验证」；**禁止**写「已生效」。
