# WorkBuddy / CodeBuddy Code 部署

`target_cli` 含 `workbuddy` 时，由 SKILL.md Phase 2 完整读取本文件并按顺序执行。路径安全检查、幂等重跑、清理自嵌套残留、部署标记、模板占位符、AGENTS.md 合并策略和安装报告的写法在 SKILL.md，这里只写 WorkBuddy 专属部分。

WorkBuddy Desktop 内嵌 CodeBuddy Code CLI；项目模式原生发现 `.codebuddy/skills/`、`.codebuddy/commands/`、`.codebuddy/agents/`、`.codebuddy/rules/` 与 `.codebuddy/settings.json`。**不得把它降级成 generic skills-only。**

> 部署时还须读 [deploy-trae.md](deploy-trae.md) 的四个共用小节：「部署源解析」「canonical 中文主包 Skill 清单」「TRAE / WorkBuddy 固定 Agent 名册」「管理资产收敛与减端」。

## 部署清单（机械可检查）

| Source path | Target path | Owner class | Merge mode | Validation check |
|-------------|-------------|-------------|------------|------------------|
| `skills/story-setup/references/workbuddy/CODEBUDDY.md.tmpl` | 既有 `CODEBUDDY.md` / `.codebuddy/CODEBUDDY.md`，或无两者时的 `AGENTS.md` / `.codebuddy/CODEBUDDY.md` | user+managed | 按「WorkBuddy memory 合并策略」只合并 marker block | 无遮蔽已有 AGENTS；条件导入占位已解析；管理块唯一 |
| canonical repository `skills/{browser-cdp,story*}/` | `.codebuddy/skills/{skill-name}/` | story-setup managed for the fixed canonical names | replace managed dirs only | `SKILL.md` 名字集与「canonical 中文主包 Skill 清单」一致；源目标同一则 no-op |
| `skills/story-setup/references/workbuddy/commands/` | `.codebuddy/commands/{skill-name}.md` | story-setup managed by `oh-story-managed` marker | replace managed files only | commands 与 canonical skill 一一对应，frontmatter 仅用 CodeBuddy 支持字段 |
| `skills/story-setup/references/workbuddy/agents/` | `.codebuddy/agents/` | story-setup managed by marker | replace 精确通用名册（8 张） | 名字集精确为通用 8 名；WorkBuddy frontmatter 合法，项目 Agent 名不带 plugin namespace |
| repository `skills/story-data-analyze/agents/workbuddy/` | `.codebuddy/agents/` | story-setup managed by marker | replace 精确数据物理名册（2 张） | 名字集精确为 `story-data-fetcher`, `story-data-readonly-runner`；4 张逻辑角色卡留在 Skill references |
| `skills/story-setup/references/workbuddy/rules/` | `.codebuddy/rules/` | story-setup managed by marker | replace managed files only | `alwaysApply` 可解析；用户 rules 保留 |
| `skills/story-setup/references/workbuddy/hooks/{story_workbuddy_hook.js,story_hook_core.js}` | `.codebuddy/hooks/` 同名文件 | story-setup managed | replace managed files only | Node syntax valid；shared core byte-parity | target_cli 含 workbuddy 且 project-local hook 模式 |
| `skills/story-setup/references/workbuddy/hooks/project-hooks.json` | merge into `.codebuddy/settings.json` | user+managed | merge or remove by plugin mutex | 只有 project-local 模式各注册一次；plugin 模式为零；用户设置与 hooks 保留 |
| `skills/story-setup/scripts/merge-workbuddy-settings.py` | 部署时执行，不复制到项目 | story-setup helper | execute | 稳定 runner 身份去旧、合并/移除幂等 |

## 部署前置

### WorkBuddy 归属与 Hook 互斥门

只替换带 `oh-story-managed` 标记的 canonical 中文主包 skill / command / agent / rule / CODEBUDDY（或 AGENTS）管理块，以及带适配器头注释或通用 shared-core 标记的 hook 文件；Skill 目录使用与 TRAE 相同的仓库 metadata / `<!-- oh-story-managed: skill/{name} -->` 双证据。同名用户文件保留并报告冲突。`.codebuddy/settings.json` 只通过 `merge-workbuddy-settings.py` 合并。

若当前 skill 来自已启用的 oh-story CodeBuddy plugin（实际执行路径位于插件安装根，或当前会话 registry / `codebuddy plugin list` 明确显示 `oh-story` 已启用），plugin hooks 会自动加载，此时必须用空模板移除项目内旧的 oh-story-managed hook 注册，不能再合并 `project-hooks.json`；只有 project-local skills 模式才写项目 hooks，防止同一事件双触发。仓库里存在 `.codebuddy-plugin/plugin.json` 或插件曾经安装过都不算「当前已启用」的证据。

### WorkBuddy 命名空间门

plugin 模式只由 `.codebuddy-plugin/plugin.json` 暴露 Skills、Agents 与 Hooks；不得同时在 manifest 暴露与 Skills 同名的 Commands，否则 `/oh-story:story-*` 会发生组件名竞争。plugin 模式调用 `/oh-story:story`、`/oh-story:story-long-write` 等命名空间化 Skill；运行 `story-setup` 后的项目模式才由 `.codebuddy/commands/` 暴露 `/story`、`/story-long-write` 等裸命令。两种模式必须在安装报告中分开写，不能把裸命令说成 plugin 命令。

## WorkBuddy / CodeBuddy Code 原生部署算法

1. 按「canonical 中文主包 Skill 清单」复制 canonical Skill 到 `.codebuddy/skills/{skill-name}/`；只替换能由本仓库 metadata 或精确 marker 证明归属的主包目录，保留用户其他 Skills。源目标相同时记 no-op。
2. 对 canonical 名字逐一复制 `references/workbuddy/commands/{name}.md` 到 `.codebuddy/commands/{name}.md`；命令模板必须与 canonical skill 名单一一对应，canonical 中的某个 skill 缺预生成模板即按包不完整停止，不为项目扩展生成 fallback command。这里是项目裸命令 `/story-*`；plugin manifest 不加载这批 Commands。作品查询与资料研究由 `story-explorer` / `story-researcher` agent 承载，不设对应命令，判据见 [deploy-trae.md](deploy-trae.md)「canonical 中文主包 Skill 清单」第 3 条。
3. 按「部署 WorkBuddy Agents」与「TRAE / WorkBuddy 固定 Agent 名册」把通用 8 名与 WorkBuddy 数据物理 2 名的精确并集（10 张）部署到 `.codebuddy/agents/`；项目卡使用裸 agent 名，由 `Agent` 工具的 `subagent_type` 字段调用。数据分析的四个只读逻辑角色按映射调用 pooled runner，不把逻辑卡复制到 registry。plugin-only 名称 `oh-story:<name>` 只能在当前 registry 真实返回时使用。
4. 将 `references/workbuddy/rules/*.md` 合并到 `.codebuddy/rules/`，只替换同管理标记文件；再按「WorkBuddy memory 合并策略」处理当前唯一生效的 memory 文件，禁止用一份很短的 CODEBUDDY 文件遮住已有 `AGENTS.md`。
5. 按「WorkBuddy settings.json 合并算法」选择 project-local 或 plugin 互斥分支，并运行 Node 语法、共享 core byte-parity、中文正文写前/写后门与合并幂等 fixture。Windows 若使用 PowerShell，只有专项 fixture 已覆盖的静态写入命令属于硬门；动态表达式、splatting、.NET API 或未识别外部写盘程序仍必须依赖 Skill 自检与写后兜底，安装报告不得声称「所有 PowerShell 写入均可硬拦截」。
6. 校验 `.codebuddy/skills/` 与 `.codebuddy/commands/` 的受管名字集精确等于 canonical 名字集，受管 Agent 名字集精确等于「TRAE / WorkBuddy 固定 Agent 名册」列出的 WorkBuddy 10 名并集，rule/memory marker 唯一，用户其他 `.codebuddy` 资产仍在。校验 pooled runner 的四个逻辑角色映射全集、唯一且指向 Skill 内真实卡；若本机可找到 WorkBuddy 内嵌或独立 `codebuddy`，还要在仓库根运行 `codebuddy plugin validate .` 验证 plugin manifest；命令不可用时明确记为未执行，不能伪称通过。
7. `.story-deployed` 的 `target_cli` 写 `workbuddy` 或多端组合，`references_dir` 写 `.codebuddy/skills/story-setup/references/agent-references`。安装报告分别列出：project 命令 `/story-*`；plugin-only Skill `/oh-story:story-*`；Hook 当前唯一注册源；Agent registry 结果；PowerShell 硬门边界。部署后完整执行 `references/workbuddy/runtime-activation.md`，新开 WorkBuddy / CodeBuddy 会话刷新发现结果；未进 `/skills`、`/agents`、`/hooks` 实际确认时只能报告静态/合成运行时通过。

Plugin 安装不经过项目复制算法：仓库根 `.codebuddy-plugin/plugin.json` 是唯一规范 manifest，路径均以 `./` 开头，只暴露 Skills、Agents、Hooks，不暴露同名 Commands。plugin hooks 与项目 hooks 必须互斥；即使随后运行了项目 `story-setup` 部署 Skills/Commands/Agents/Rules，也仍以 plugin hooks 为唯一注册源，并用 `disabled-hooks.json` 清掉项目旧注册。

### 部署 WorkBuddy Agents

- 先校验 `references/workbuddy/agents/` 的名字集精确为通用 8 名；再校验 `skills/story-data-analyze/agents/workbuddy/` 的物理名字集精确为 `story-data-fetcher`, `story-data-readonly-runner`（2 张数据卡），且四张只读逻辑角色卡完整留在该 Skill 的 WorkBuddy role-card references。全部物理名必须无重复，合并后中文主包物理名册精确为 10 张。
- CodeBuddy 当前会在 `agentic` registry 查询阶段把 **内置 + 项目** Subagent 总数硬截为 20。本节列出的 WorkBuddy 精确 10 张物理卡低于平台上限；部署器不向该名册注入项目扩展卡，不靠排序或截断隐藏容量问题。
- 每个 Markdown 必须有合法 YAML frontmatter，`name` 与文件名一致，`description` 非空，`tools` / `disallowedTools` 为逗号字符串且只使用当前 CodeBuddy 工具名。plugin agent 禁止 `hooks`、`mcpServers`、`permissionMode`；项目 agent 也不依赖这些字段。
- 只新建或替换带 `<!-- oh-story-managed: agent/<name> -->` 标记的 `.codebuddy/agents/<name>.md`；无标记同名文件保留并报告冲突。项目定义优先级高于 plugin/user agent，项目模式统一用裸名称和 `Agent(subagent_type: "<name>")`。
- pooled runner 的逻辑角色卡留在所属 Skill 内，不能复制进 `.codebuddy/agents/`。主协调器必须按该 Skill 的运行时映射选择 runner，并在 prompt 中传入 `logical_role`、角色卡绝对路径、项目根、输入隔离合同和任务正文；runner 必须完整读取且核对角色卡后执行。
- plugin-only 模式的 UI 名为 `oh-story:<name>`；只有当前 registry 确实暴露该名称时才用它。未运行 story-setup 时不得凭磁盘 manifest 猜测 registry 已加载；调用失败立即按 Skill 合同降级。完成项目部署后统一使用 `.codebuddy/agents/` 的裸名称，避免命名空间分歧。
- 部署后新开 WorkBuddy / CodeBuddy 会话，用 `/agents` 或当前 registry 确认本节列出的精确 10 张物理卡全部可见；再分别冒烟一个通用 Agent 和一个 pooled runner 逻辑角色。子 Agent 不得递归 spawn。

### WorkBuddy memory 合并策略

CodeBuddy 把根 `CODEBUDDY.md` 与 `.codebuddy/CODEBUDDY.md` 作为项目 memory，并只在没有 CODEBUDDY memory 时回退读取 `AGENTS.md`。因此不能无条件新建一份短模板遮住现有通用约定。

1. 同时检查根 `CODEBUDDY.md`、`.codebuddy/CODEBUDDY.md` 和根 `AGENTS.md`。若两份 CODEBUDDY 都存在，停止 memory 写入并报告冲突，请用户选择唯一规范位置；不得猜测加载优先级，也不得删除任一份。其他 WorkBuddy 资产可继续验证，但安装报告必须标为 memory 未闭环。
2. 只有一份 CODEBUDDY 已存在时，在原位 marker-merge WorkBuddy 管理块；若同时存在 `AGENTS.md`，把模板占位 `{{OH_STORY_AGENTS_IMPORT}}` 按目标位置替换为根文件的 `@AGENTS.md` 或 `.codebuddy` 文件的 `@../AGENTS.md`，确保原通用约定仍进入上下文。无 AGENTS 时替换为空行。
3. 两份 CODEBUDDY 都不存在但 `AGENTS.md` 已存在时，直接把 WorkBuddy 管理块合并进现有 `AGENTS.md`，并把导入占位替换为空；不新建 CODEBUDDY 文件，从而继续使用 CodeBuddy 的 AGENTS fallback。
4. 三者都不存在时，创建 `.codebuddy/CODEBUDDY.md`，导入占位替换为空。所有分支都只替换 `BEGIN/END oh-story-managed: workbuddy` 内文本，用户独有内容保留。
5. 写后验证：管理块恰好一份；`{{OH_STORY_AGENTS_IMPORT}}` 不得残留；有既存 AGENTS 且最终使用 CODEBUDDY 时必须有正确相对导入；再次合并字节幂等。

### WorkBuddy settings.json 合并算法

1. 先判定本次会话是否已实际启用 oh-story plugin：只接受当前执行 Skill 路径位于 CodeBuddy plugin 安装根、运行时 registry 明确返回 `oh-story`，或可用的 `codebuddy plugin list` 明确显示该插件 enabled。仓库里有 manifest、磁盘上有未启用副本、或用户口头说「装过」都不能代替运行时证据。
2. plugin 已启用时选择 `references/workbuddy/hooks/disabled-hooks.json`；project-local 模式选择 `references/workbuddy/hooks/project-hooks.json`。按跨平台规则探测 `python3/python/py`，调用 `merge-workbuddy-settings.py --existing {项目}/.codebuddy/settings.json --template <所选模板> --output {项目}/.codebuddy/settings.json`；无 Python 时停止 WorkBuddy 分支，不手写 JSON。
3. helper 只把命令中含 `story_workbuddy_hook.js` 的注册认作 oh-story 管理项：先从所有历史事件/matcher 中移除，再按所选模板追加。用户 hook、权限、模型、MCP 和未知顶层字段全部保留；重复执行必须字节幂等。
4. project-local 模式把 `story_workbuddy_hook.js` 与 `story_hook_core.js` 写入 `.codebuddy/hooks/`，并确认四个当前注册各恰好一次。plugin 模式不再注册第二套项目 Hook，`.codebuddy/settings.json` 中 oh-story runner 注册必须为零。不得用「双份输出内容相同」证明兼容。
5. 校验 Hook 输出只使用 CodeBuddy 支持字段：JSON 输出分支都有顶层 `continue: true`；PreToolUse 拒绝使用 `hookSpecificOutput.permissionDecision=deny`；commit 提醒使用顶层 `systemMessage`；健康 no-op stdout 为空。matcher 只声明 runner 已有目标解析 fixture 覆盖的工具。

## 验证

- 检查 `.codebuddy/skills/` 与 `.codebuddy/commands/` 的受管名字集均精确等于 canonical 名字集；每个 command 有合法 frontmatter 与管理标记
- 检查 `.codebuddy/agents/` 的受管名字集精确等于「TRAE / WorkBuddy 固定 Agent 名册」列出的通用 8 名 + WorkBuddy 数据物理 2 名（共 10 张），总数不超过 19，名称唯一，frontmatter 只使用 CodeBuddy 支持字段；pooled runner 的每个逻辑角色都必须唯一映射到 Skill 内真实卡。新会话中分别实调基础 Agent、`story-data-fetcher` 和 pooled runner 的一个逻辑角色，成功后才允许报告多 Agent 模式生效；设置页「全部开启」不能代替 Task registry 证据
- 检查 `.codebuddy/rules/` 和唯一生效 memory 文件的管理块；项目原有 `AGENTS.md` 内容必须仍被直接读取或通过 `@AGENTS.md` / `@../AGENTS.md` 导入，模板条件占位不得残留；根与 `.codebuddy/` 两份 CODEBUDDY 同时存在时必须报告冲突而不是猜优先级
- 检查 `.codebuddy/settings.json` 保留用户字段，且按互斥分支验证：project-local 模式当前 4 个 oh-story Hook 注册各恰好一次，事件只有 `SessionStart` / `PreToolUse` / `PostToolUse`；plugin 模式项目注册为零。运行 helper 两次必须字节幂等
- 用 fixture 调用 SessionStart（含 agents_version 38/39/40）、PreToolUse deny/allow/commit、PostToolUse；确认 healthy no-op stdout 为空、所有输出都有 `continue: true`，拒绝与提醒字段符合 CodeBuddy schema，路径逃逸不能绕过项目根
- 检查 plugin manifest 不含与 Skills 同名的 `commands` 字段，所有自定义路径以 `./` 开头；可用时运行真实 `codebuddy plugin validate .`
- 检查 `.codebuddy/skills/story-setup/references/agent-references/` 完整且所有 reference 路径可解析

## 安装报告必须提示

- 明确 project `/story-*` 与 plugin `/oh-story:story-*` 的差异；不可把裸命令说成 plugin 命令
- 唯一 Hook 来源（project-local 或 plugin）；若两份 CODEBUDDY 并存，标为 memory 未闭环并说明冲突
- Agent registry 实际可见数量与名称；未实调成功前不得声称多 Agent 已生效
- PowerShell 硬门边界：只有专项 fixture 覆盖的静态写入命令可硬拦截
- 新开 WorkBuddy / CodeBuddy 会话刷新 `/skills`、`/agents`、`/hooks`；未实际确认前只能报告静态/合成运行时通过
