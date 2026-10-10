# TRAE.md — oh-story TRAE 本地变体技术手册

> 受众：维护这套本地部署的人。写作者看工作区《oh-story使用手册.md》，每本书看项目根 README.md，对话里说「网文工具怎么用」看 story 新手引导。

## 一、这是什么

- 本仓库是 `qin1473692580-ux/oh-story-claudecode`（v0.7.10 发行线）与 `worldwonderer/oh-story-claudecode` 的**本地语义合并变体**，分支 `local/trae`，**不发布 GitHub**。
- 相对 qin 基底的增量：#355 三件套（narrative-writer Bash 白名单 / 内容层-形状层拆分 / check-outline-copy.js）、#352 上下文瘦身（workflow-chapter.md 下沉）、Edge 浏览器适配（`--browser chrome|edge|auto`）、TRAE 运行时适配。
- **架构（当前）**：**16 技能全局并存**。TRAE 全局技能目录（`~\.trae-cn\skills\`）安装全部 16 个 canonical 技能（`story` 主编 + 15 个专岗），全局命令目录（`~\.trae-cn\commands\`）安装 16 个同名命令。任一目录下均可直接调用，无需逐目录部署。
  - 旧的**单入口架构**（全局只部署 `story`、其余 13 专岗留在仓库按文件派单）**已退役**，其部署脚本 `tools\deploy-to-trae.ps1` 已删除（该脚本会删除全局 13 技能并把 `story` 覆盖为旧版，与新模型冲突）。
  - 全局通道**不影响**项目级资产的独立性：同一技能允许全局与项目各存一份，项目根打开时以项目版为准。

## 二、快速开始 / 重新部署

全局层部署由 **`story-setup` 技能**负责（不再有独立部署脚本）：

```
/story-setup      # 在会话里说「准备写书」或「配置写作环境」
```

- 全局层：把 16 canonical 技能复制到 `~\.trae-cn\skills\{skill-name}\`、16 命令复制到 `~\.trae-cn\commands\{name}.md`，并在 `~\.trae-cn\skill-config.json` 的 `managedSkills` 登记（来源 `oh-story-deploy`）。
- 项目层（可选）：仅当该目录需要 `AGENTS.md` 路由表、`globs` 规则或降级 hooks 时，再在项目根跑一次原生部署。
- 部署后**新开会话**技能才会被加载。

## 二·五、架构运维

- **兼容性前置**：待全局化的技能必须**相对自身目录**解析 `references/`、`scripts/`，不得含绝对路径、本地仓库名或用户主目录硬编码。
- **撞名处置**：全局目录里若已有同名非本仓库技能，按「后缀 `-old`」改名让位（改名而非删除，保留回退）。
- **上游新增 skill**：同步后由 `story-setup` 全局部署直接覆盖，**自动到位、无需登记**（这是新架构相对旧单入口架构消除同步盲点之处）。
- **校验**：全局技能目录名与 canonical 名字集精确相等；每个 `SKILL.md` 的 frontmatter `name` 与目录名一致；每个命令的 frontmatter `name` 与文件名一致。

## 三、TRAE 运行时适配要点

| Claude Code 机制 | TRAE 现状 | 处理 |
|---|---|---|
| Hooks | 无 | 流程化闸口：skill 内 Phase 5 硬性步骤 + 写前欠账扫描 + `追踪/质检进度.md` 机械记录 |
| 项目 custom agents | 不注册 | solo/direct fallback，agent 模板作行为规范被主线程读；结果标注 `Fallback: ... -> solo` |
| Skill() 调用 | 有 | `Skill("story-long-write")` 等价 `/story-long-write`；story SKILL.md 路由表头已注明 |
| AskUserQuestion | 有 | 直接用；不可用时降级为会话内文字提问 |
| 项目规则 | `.trae/rules/` | story-setup（TRAE 模式）写 `.trae/rules/oh-story.md` 强制路由 + 写作守卫 |
| slash command | 无 | 全部走自然语言触发词（各 SKILL.md description 已列） |

写作项目建议放 `f:\AI\Trae工作区\novel_projects\{英文或拼音书名}\`（规避中文/`&` 路径隐患；正文内容仍是中文不受影响）。

## 四、日常写作循环

```
写前：check-ai-patterns / check-degeneration 复查上一章（欠账门）
写中：story-long-write 单章流程（references/workflow-chapter.md）
写后：check-typos → check-ai-patterns → check-emotion-floor → check-hook-strength
      → check-outline-copy → tracking check，结果登记 追踪/质检进度.md
```

浏览器登录态（扫榜）：`node skills/browser-cdp/scripts/setup-cdp-chrome.js 9222 --detect-only --browser edge`；首次启动会关闭 Edge 全部进程（consent 门），登录态快照自日常 profile，之后长期复用 `~/edge-debug-profile`。

## 五、上游同步（双仓监听）

- 监听脚本：`tools/check-updates.mjs`（零依赖；查两仓 releases/latest + main commit；单例锁 `tools/.update.lock`；退出码 0 无更新 / 1 有更新 / 2 网络异常跳过）。
- TRAE 内置自动化**每周日 19:00** 跑一次；有更新会按模板发通知（通知全文留档 `tools/update-state.json` 的 `last_notice`）。
- 人工确认后的同步流程：

```powershell
git fetch origin ; git fetch upstream
git checkout main ; git merge origin/main
git checkout local/trae ; git rebase main     # 冲突按 port-log.md「冲突解决策略」
python scripts/skill-numbering.py check       # 编号一致性
# 全局层重新部署：在会话里跑 /story-setup（16 技能全局并存）
# 每个在写项目重跑「准备写书」，然后新开会话
```

- 同步后核对：上游新 PR 是否需新移植；qin 新版是否已吸收旧移植（吸收则删本地补丁）；**上游新增 skill 由 story-setup 全局部署直接覆盖，自动到位**；结论登记 `port-log.md`。

## 六、故障排查

| 症状 | 处置 |
|---|---|
| 新会话认不出技能 | 确认 `C:\Users\74439\.trae-cn\skills\{name}\SKILL.md` 存在；重跑 `/story-setup`；新开会话 |
| `NEEDS_CONSENT` 退出码 3 | 正常保护：先征得用户同意再加 `--yes`；详见 browser-cdp SKILL.md |
| Edge 起不来 / 登录态坏 | `--reset` 重建 debug profile；日常 profile 必须在关闭状态下快照 |
| `agents_version` 不匹配提示 | 项目里重跑「准备写书」；本地变体号规则见 port-log.md（qin 发同号则本地顺延） |
| 监听一直退出码 2 | 网络问题；GitHub API 未认证限流 60 次/时，周日 19:00 一跑占用极小；连续失败查代理 |
| 脚本报路径错 | 项目路径含中文/`&`：迁到 `novel_projects\{英文}`；命令一律带引号 |
| 采集报 `spawnSync agent-browser ENOENT` | 扫榜脚本依赖 `agent-browser` CLI：`npm install -g agent-browser`。本机 `F:\AI\nodejs\node_global` 对非管理员只读，npm prefix 已改到 `C:\Users\74439\AppData\Roaming\npm`（已入用户 PATH，TRAE 重启后全局可见；当前会话先 `$env:Path="$env:APPDATA\npm;$env:Path"` 前置） |
| 采集中途 CDP 失联（9222 不通） | 调试实例的最后一个窗口被关时整个调试 Edge 退出。若用户正开着普通 Edge（不能杀），**并行启动**调试实例：`Start-Process msedge.exe -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\Users\74439\edge-debug-profile','--remote-allow-origins=*','--no-first-run','--no-default-browser-check'`（独立 profile，与正常浏览器互不干扰；登录态沿用 debug profile 内已刷新文件） |
| C 盘突然暴涨 ~19 GB（`C:\edge-debug-profile`） | 手工启动调试 Edge 时 `--user-data-dir` 误用**相对路径**，落在工作目录（如 C:\），触发 profile 全量复制。预防：`--user-data-dir` 永远写绝对路径 `C:\Users\74439\edge-debug-profile`。处置：确认无 `msedge.exe` 命令行含该路径后整个删除 |
