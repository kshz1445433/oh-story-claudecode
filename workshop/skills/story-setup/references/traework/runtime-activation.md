# TraeWork 原生能力激活与验证

把 `.trae/` 文件写入项目只能证明静态部署完整，不能证明当前 TraeWork（TRAE SOLO）会话已加载 Skills、Commands、Rules。TraeWork **没有项目 Hooks 入口**，四个原 Hook 职责改由 Skill 流程显式调起 `story_check_cli.js`。部署后按下列顺序验证。

## 1. 确认环境边界

- 本适配器面向 **TraeWork（TRAE SOLO）**，项目路径为 `.trae/skills/`、`.trae/commands/`、`.trae/rules/`；降级检查脚本在 `.trae/hooks/story_check_cli.js`。
- TraeWork 与 TraeCode 共用 `.trae/`，靠根 `AGENTS.md` 的标题行区分：TraeWork 标题行为 `网文写作工具集（TraeWork）`，TraeCode 为 `网文写作工具集（TRAE Code）`。二者互斥。
- 从项目根目录打开 TraeWork，并信任该项目。

## 2. Hooks 层：由 Skill 流程调起（无平台自动执行）

TraeWork 不读取、不执行项目 `.trae/hooks.json`。原四个 Hook 职责全部降级为 Skill 流程内显式调起的内部脚本，判定逻辑（`story_hook_core.js`）一字未改：

```bash
node .trae/hooks/story_check_cli.js session-start --cwd <项目根>
node .trae/hooks/story_check_cli.js pre-write  --cwd <项目根> --file <正文路径>   # BLOCKED 时 exit=1
node .trae/hooks/story_check_cli.js post-write --cwd <项目根> --file <正文路径>
node .trae/hooks/story_check_cli.js pre-commit --cwd <项目根> --command "git commit -m ..."
```

退出码：`0` 无阻断/无发现；`1` pre-write 被拦截（须先补细纲）；`2` 调用错误。

**调用时机（流程硬步骤，不得跳过）**：

- 会话/流程开始 → `session-start`，把输出并入主会话上下文；
- **写正文前** → `pre-write`，返回 `BLOCKED` 即停止写入、先补细纲；
- 正文写完后 → `post-write`，按输出处理到净再进下一章；
- git 提交前 → `pre-commit`（可选），有警告即提示。

运行需要 PATH 中可用的 `node`。

## 3. 确认 Skills 与 Commands

1. 打开「设置 > 技能与命令」，确认「项目」Skill 中能看到 `story`、`story-long-write`、`story-review` 等条目。
2. 确认这些 Skill 已启用；若 `.trae/skill-config.json` 将某项目 Skill 列为禁用，磁盘上存在 `SKILL.md` 也不会生效。
3. 在输入框的 `/` 面板确认同名项目 Commands 可见。Skills 和 Commands 是两条独立发现链，不得只验证其中一条。

## 4. 激活 Rules 与 AGENTS.md

1. 打开「设置 > Rules」，确认 `.trae/rules/` 下由 story-setup 部署的 oh-story 规则文件可见。
2. 项目依赖根 `AGENTS.md` 的路由和写作门禁。TraeWork 默认 `AI.rules.importAgentsMd = true`，根 `AGENTS.md` 会读入上下文；确认该开关未被关闭。
3. 确认根 `AGENTS.md` 的 oh-story 管理块标题行为 `网文写作工具集（TraeWork）`——这是 TraeWork 与 TraeCode 的互斥识别标记。

## 5. 多智能体层：常态降级

- TraeWork 不读取 `.trae/agents/*.md`，多角色流程一律按各 Skill 契约降级 `solo/direct`，由主会话串行执行同一契约。
- 安装报告必须固定标注 `Fallback: .trae/agents not read by TraeWork -> solo/direct`，不得声称 full/lean 多 Agent 已生效。

## 6. 新会话验证

重载项目或新建 TraeWork 会话后，逐项确认：

- Skills 面板能看到 `story`、`story-long-write`、`story-review` 等项目 Skills。
- `/` 面板能看到同名 Commands，命令参数没有以字面量 `$ARGUMENTS` 泄漏到请求中。
- Rules 面板显示 `.trae/rules/` 下的 oh-story 规则已加载；根 `AGENTS.md` 已读入上下文。
- 在临时测试书目中对一个缺失对应细纲的新正文文件运行 `story_check_cli.js pre-write`，应返回 `BLOCKED` 且 exit=1；补齐细纲与追踪后再写入作品。

任一项未经实际验证时，安装报告只能写「静态兼容，运行时未验证」，不能写「已在 TraeWork 中生效」。

## 官方契约链接

- [Skill](https://docs.trae.cn/ide_skills)
- [Command](https://docs.trae.cn/ide_slash-commands)
- [Rule 与 AGENTS.md 导入](https://docs.trae.cn/ide_rules)
