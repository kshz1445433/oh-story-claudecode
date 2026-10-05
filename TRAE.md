# TRAE.md — oh-story TRAE 本地变体技术手册

> 受众：维护这套本地部署的人。写作者看工作区《oh-story使用手册.md》，每本书看项目根 README.md，对话里说「网文工具怎么用」看 story 新手引导。

## 一、这是什么

- 本仓库是 `qin1473692580-ux/oh-story-claudecode`（v0.7.10 发行线）与 `worldwonderer/oh-story-claudecode` 的**本地语义合并变体**，分支 `local/trae`，**不发布 GitHub**。
- 相对 qin 基底的增量：#355 三件套（narrative-writer Bash 白名单 / 内容层-形状层拆分 / check-outline-copy.js）、#352 上下文瘦身（workflow-chapter.md 下沉）、Edge 浏览器适配（`--browser chrome|edge|auto`）、TRAE 运行时适配、**单入口主编架构**。移植明细见 `port-log.md`。
- **单入口架构（当前）**：TRAE 全局技能目录只部署 `story`（合伙人主编路由器）；其余 13 个专岗留在本仓库 `skills\` 目录，主编按「专岗基座」路径（`f:\AI\Trae工作区\Agent&Skill规划\oh-story-trae\skills\`）读 SKILL.md 文件派单。技能列表 14 行 → 1 行；上游同步后专岗改动即合即生效，无需部署。

## 二、快速开始 / 重新部署

```powershell
# 干跑确认动作（部署 story + 清理旧 13 个平铺目录）
powershell -File "f:\AI\Trae工作区\Agent&Skill规划\oh-story-trae\tools\deploy-to-trae.ps1" -DryRun
# 实际部署 + 清理 + 刷新工作区《oh-story使用手册.md》
powershell -File "f:\AI\Trae工作区\Agent&Skill规划\oh-story-trae\tools\deploy-to-trae.ps1"
```

- 部署白名单仅 `story`；清理白名单是旧平铺的 13 个专岗目录（`/MIR` 与 `Remove-Item` 都只动白名单，不碰 TRAE 其他技能）。
- 预检同时验证仓库内 13 个专岗 SKILL.md 齐全（路由按文件派单，缺了会路由失败）。
- 部署后**新开会话**技能才会被加载；写作项目内另需跑一次「准备写书」（story-setup，选 TRAE）刷新项目级文件。

## 二·五、单入口架构运维

- **仓库挪位置**：改 `skills\story\SKILL.md`「专岗基座」一节的路径 → 重跑 deploy。主编派单失败时会报告探测路径，不会凭记忆杜撰流程。
- **上游新增 skill**：同步后把新专岗登记进 story 调度表（一行：专岗名 + 生活化说法 + 派单文件路径），这是唯一的持续维护点（已列入上游同步核对清单）。
- **story 自身改动**：需要重跑 deploy；专岗（其余 13 个）改动即合即生效。
- **路由准确性**：三保险——description 语义唤起（第一道门）→ 调度表模糊词语义匹配（第二道门）→ 未命中弹两级选择框（闲聊直接放行不弹框）。

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
powershell -File tools/deploy-to-trae.ps1     # 重部署
# 每个在写项目重跑「准备写书」，然后新开会话
```

- 同步后核对：上游新 PR 是否需新移植；qin 新版是否已吸收旧移植（吸收则删本地补丁）；**上游新增 skill 是否已登记进 story 调度表**（单入口架构下未登记 = 该专岗不可达）；结论登记 `port-log.md`。

## 六、故障排查

| 症状 | 处置 |
|---|---|
| 新会话认不出技能 | 确认 `C:\Users\74439\.trae-cn\skills\{name}\SKILL.md` 存在；重跑 deploy 脚本；新开会话 |
| `NEEDS_CONSENT` 退出码 3 | 正常保护：先征得用户同意再加 `--yes`；详见 browser-cdp SKILL.md |
| Edge 起不来 / 登录态坏 | `--reset` 重建 debug profile；日常 profile 必须在关闭状态下快照 |
| `agents_version` 不匹配提示 | 项目里重跑「准备写书」；本地变体号规则见 port-log.md（qin 发同号则本地顺延） |
| 监听一直退出码 2 | 网络问题；GitHub API 未认证限流 60 次/时，周日 19:00 一跑占用极小；连续失败查代理 |
| 脚本报路径错 | 项目路径含中文/`&`：迁到 `novel_projects\{英文}`；命令一律带引号 |
| 采集报 `spawnSync agent-browser ENOENT` | 扫榜脚本依赖 `agent-browser` CLI：`npm install -g agent-browser`。本机 `F:\AI\nodejs\node_global` 对非管理员只读，npm prefix 已改到 `C:\Users\74439\AppData\Roaming\npm`（已入用户 PATH，TRAE 重启后全局可见；当前会话先 `$env:Path="$env:APPDATA\npm;$env:Path"` 前置） |
| 采集中途 CDP 失联（9222 不通） | 调试实例的最后一个窗口被关时整个调试 Edge 退出。若用户正开着普通 Edge（不能杀），**并行启动**调试实例：`Start-Process msedge.exe -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\Users\74439\edge-debug-profile','--remote-allow-origins=*','--no-first-run','--no-default-browser-check'`（独立 profile，与正常浏览器互不干扰；登录态沿用 debug profile 内已刷新文件） |
| C 盘突然暴涨 ~19 GB（`C:\edge-debug-profile`） | 手工启动调试 Edge 时 `--user-data-dir` 误用**相对路径**，落在工作目录（如 C:\），触发 profile 全量复制。预防：`--user-data-dir` 永远写绝对路径 `C:\Users\74439\edge-debug-profile`。处置：确认无 `msedge.exe` 命令行含该路径后整个删除 |
