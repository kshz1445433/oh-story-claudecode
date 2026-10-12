# port-log：upstream → qin 基底的移植记录

基底：qin1473692580-ux/oh-story-claudecode（local/trae 分支）
上游：worldwonderer/oh-story-claudecode 0.7.6（zip 解压，路径 `c:\Users\74439\.trae-cn\work\6a8bf3366c082112629786ed\oh-story-zips\upstream\oh-story-claudecode-0.7.6`，git 网络不可用）

原则：qin 自研功能一律保留（情绪下限、错别字、钩子强度、中文语言锁、英文旧债门、质检进度表、硬性 agent 审查、story-globalize 路由、agents_version 29）；只移植 upstream 明确优于基底的增量。

## #355 移植（写作 Agent 自检三件套）— 已完成

1. **Bash 工具白名单**：`skills/story-setup/references/templates/agents/narrative-writer.md` 的 `tools` 加 `Bash`（字数/句长/细纲照搬自检需要确定性数值）；opencode 版 `permission` 加 `bash: allow`。
2. **内容层/形状层拆分**：narrative-writer.md（templates + opencode）写明「细纲是内容契约不是正文形状」；story-architect.md 细纲模板新增「复沓锚句」字段（须逐字落进标注情节点）。
3. **check-outline-copy.js**：从 upstream 复制到 story-long-write / story-deslop / story-short-write 的 scripts/；`scripts/shared-assets.json` 新增 `prose-outline-copy-detector` 组登记同步关系。

## #352 移植（SKILL.md 上下文瘦身）— 已完成

- 新建 `skills/story-long-write/references/workflow-chapter.md`：upstream 骨架 + qin 全部自研闸口融合（英文旧债门、生成前中文锁、语言契约、步骤 9 三问+钩子诚信、错别字校验、情绪落地下限、钩子强度下限、退化/英文泄漏防护、硬性 consistency-checker / narrative-writer 审查、质检进度表打勾、`dialogue-density-stat`）+ #355 增量（细纲优先边界内容层/形状层两条 prompt、check-outline-copy.js 复扫、复沓锚句补登记）。
- `SKILL.md`：单章写作流程 13 步（约 83 行）+ 写作技巧提醒 + 字数验收权威（22 行）+ Phase 5 质量检查正文（50 行）全部外迁，Phase 4 处换指针；参考索引头部加四 workflow 路由句。486 行 → 337 行。Phase 5 参考索引表保留。
- `workflow-daily.md`：头部 26 行写前准备重复内容 → 指针（引 SKILL.md Phase 4「缺失文件处理」+ workflow-chapter.md 写前准备 (a)-(g)），保留「多本对标书」段；两处引用改指 workflow-chapter.md。215 行 → 194 行。
- `workflow-revision.md`：完整检查清单链接 `../SKILL.md#phase-5质量检查` → `workflow-chapter.md`。
- 验证：`python scripts/skill-numbering.py check` PASS（278 文件）。

## 阶段3：Edge 适配 setup-cdp-chrome.js — 已完成（实测通过）

- `--browser chrome|edge|auto` 参数（auto 优先 Chrome，未装回落 Edge）；`PLATFORM_CONFIG` 三平台均拆 chrome/edge 双配置（路径/profile 目录/映像名/进程名/debug profile 名）。
- 全部硬编码 "Chrome" 文案改 `config.displayName`（启动/等待/失败/清理/dry-run/consent 提示）；`verifyPortOwnedByLaunch` 增加 browserName 参数。
- killChrome 语义：按所选浏览器映像名精确匹配（win32 tasklist/taskkill IMAGENAME 精确等值，msedge.exe 不波及 msedgewebview2.exe；Edge 模式不动 chrome.exe，反之亦然）。
- 文档同步：browser-cdp / story-long-scan / story-short-scan 的 SKILL.md 补 Edge 用法与 `--browser` 选项。
- 本机实测（win32，装有 Edge 无 Chrome）：`--detect-only --browser edge` → `BROWSER_KIND=edge` + 15 个进程；`--browser chrome` → `BROWSER_KIND=none`；auto → edge；dry-run 全动态文案正确；`--browser firefox` 正确拒绝 exit 1；`node --check` 通过。

### 与计划 §5.2 的偏差（有意为之）

计划原案「killChrome 只杀命令行含 edge-debug-profile 的进程」**不可行**：profile 复制的源是用户日常 profile（`User Data/Default`），SQLite 文件必须在浏览器完全关闭后快照（源码注释明确依赖此不变量；写一半的 Cookies 是登录态损坏第一大来源）。若只杀 debug 实例，日常 Edge 保持运行，复制就在打开状态下进行。实际实现保留「关闭所选浏览器整体 + consent 门（`--yes`/TTY 询问）+ 重启可恢复标签页」的原版安全模型，仅收窄误伤面到「所选浏览器的精确映像名」。V5-③ 验证口径相应调整为：杀进程仅经同意门触发、跨浏览器/WebView2 零误伤、杀完可恢复标签页。

## 修复：Edge CDP 完整启动「关了却不开」（用户实测报障）— 已完成

用户跑 `--browser edge --yes` 后：Edge 被关闭、12.6 GB profile 已复制（`edge-debug-profile` mtime 18:23:46），但浏览器未再拉起。受控复现（`tools/test-cdp-verify.mjs`）证明启动机制与验证链本身健康（冷启动 ~760ms、`verifyPortOwnedByLaunch` ok:true），根因是**大 profile 复制后首启的时序余量不足**：

1. `queryStdout` 5s 超时太紧——空闲时 `Get-NetTCPConnection` 就要 ~2s，复制 12.6 GB 后杀软/磁盘饱和期 CIM 查询易超时 → `CDP_OWNER_UNVERIFIABLE` → `abortAfterLaunch` 杀掉刚拉起的浏览器；且 win32 已有 wmic 移除的降级链（PowerShell CIM），Win11 无 wmic 不致失败，纯超时问题。
2. 启动等待窗 15×2s=30s 偏短——首启在杀软扫描下可能超窗 → 第 11 步清理杀掉新实例。
3. 两条失败路径叠加的观感 =「日常 Edge 已被关 + 新实例秒死」= 用户看到的「关了却不开」。

修复（setup-cdp-chrome.js）：`queryStdout` 超时 5s→15s；`listPortListenerPids` win32 查询序改 **netstat 优先**（61ms vs 2038ms，33×），PowerShell 降为兜底；启动等待 30s→60s（`尝试 i/30`）；第 11 步失败信息补「大 profile 首启可能被杀软拖慢，稍后重跑即可」与「日常浏览器已被关、可手动重开」恢复提示。另加 `require.main` 守卫 + `module.exports`（verify 链可被工具化测试），直接运行行为不变。

实测（修复后）：受控测试冷启动 796ms、端口查询 61ms、`verifyPortOwnedByLaunch` ok:true；CDP 就绪态跑正式脚本走「复用现有实例」exit 0；`node --check` 通过；**端到端全流程实测通过**（关 19 进程 → 刷新 8 个登录态文件 → CDP 启动 → 验证成功，无 12.6 GB 重复制）。

## 单入口主编架构（TRAE 技能列表收敛 14→1）— 已完成

用户诉求：14 个技能平铺在 TRAE 技能列表太杂，希望单 agent 入口引导调度。经讨论定案四件套：**合伙人主编 persona + 平台锚定 + 模糊词路由表 + 两级选择框**。

- `skills/story/SKILL.md` 重写：「角色设定：合伙人主编」（收入绑定投稿分成、平台盘起点/番茄/晋江/盐言/七猫/黑岩/点众、商业判断三原则：附注不挡路/平台锚定/越用越准，主编不亲自写稿）；「专岗基座」节定义文件派单协议（Read 基座路径下专岗 SKILL.md 逐条执行，缺失报路径不杜撰）；「专岗调度表」13 行 × 每行 8-13 句生活化说法（语义匹配非字符串比对）；「未命中处理」两级选择框（明显闲聊直接放行不弹框；疑似写作相关弹 4 类一级框→专岗二级框，Other 可打字）；description 改为主编身份+平台名+大白话触发句。内置职责（引导/Dashboard/版本/切书/查询降级）保留原样。
- `tools/deploy-to-trae.ps1`：部署白名单缩为 `story` 单项；新增 13 旧平铺目录清理白名单（Remove-Item 只动白名单）；预检扩展为「部署源 + 专岗基座 13 个 SKILL.md」齐全；手册重写为单入口版。
- 部署实测：story 部署 OK、13 旧目录清理 OK、手册刷新 OK；TRAE 全局目录现存 story（其余 55 个无关技能未动）。
- 验证：路由表 13 个派单文件全部存在（story-globalize 预期缺失，英文 Gate 探测报告）；`skill-numbering.py check` PASS（279 文件）。
- 架构代价与缓解：13 专岗不再被 TRAE description 自动唤起——缓解为 description 收编触发句 + 调度表语义匹配 + 选择框兜底；上游新增 skill 未登记 = 不可达——已列入 TRAE.md 上游同步核对清单。
- 连带更新：TRAE.md（一/二/二·五节重写 + 监听频率改周日 19:00 + 同步清单加路由登记项）。

## 备注

- `.agents/` 是指向 `skills/` 的符号链接，无需双份维护。
- qin 版 `narrative-writer` 去AI味审查 prompt 已含「细纲多字段重复要求逐项复述」检查项（与 #355 细纲语义去重同源），融合版保留 qin 完整 prompt。
- upstream 未动 `workflow-setup.md:7`（「走 SKILL.md 的 Phase 4」语义仍成立），未跟进。

## 待办（阶段 2-4）

- [x] 阶段3：Edge 适配 `setup-cdp-chrome.js`（见上；实际完整启动/登录态复用留待 V5 实测，需用户同意关闭 Edge）
- [ ] 阶段2：SKILL.md TRAE 适配 + 四层引导（story 引导分支/使用手册/项目 README/TRAE.md）
- [ ] 阶段2：deploy-to-trae.ps1 部署到 TRAE 全局技能目录
- [ ] 阶段4：check-updates.mjs 监听 + 定时任务
- [ ] V1-V8 全量验证
- [x] **B-065 · C 类两条文档缺口 — 已修复（2026-10-12）**：① `story-data-analyze/references/workflow-contract.md` 新增 §4.1「面向作者的报缺话术」——6 状态（无数据/LOGIN_INVALID/PLATFORM_NOT_UPDATED/CORRUPT/SCOPE_UNKNOWN/PARTIAL）→ 中文引导话术表 + 转述三规则（一句话说清缺什么+要作者做什么 / 不编造平台行为 / 补齐后从 RAW_CAPTURED 重走不伪造续跑）；C 侧全局 + F 侧镜像均已同步（SHA `96AF0601…` 双侧一致）。② `story-publish/SKILL.md` 解释器探测行改「意图句 + bash/PowerShell 双形态」——实测发现 PS 5.1 会吞原生程序空字符串参数（`-c ''` → `python -c` exit=2 误判失败），最终采用 `--version` 探测（实测 probe=python exit=0），并附原因注记；双侧同步（SHA `CD0AE41F…` 一致）。publish_bridge.py 未动（探测逻辑本身正确）。
- [x] **Phase 4 · T8（B 类上游基线缺陷）→ 已修复（2026-10-12）**：`story-long-scan` 起点移动端 SSR 的 `newsign`（新人签约新书榜）与 `signnewbook`（签约作者新书榜）映射到同一 URL `m.qidian.com/rank/sign/`，两榜数据完全相同 → 聚合重复计数。**根因升级**：实测（移动端 404 探测 + PC CDP 导航比对 + 书单前 5 名吻合）证明 **newsign 榜已被起点下线**（PC 导航无此榜、`/rank/newsign/` 重定向总览页、移动端 404）；且 `/rank/signnewbook/` 端点也已失效（重定向总览页，直抓会得到 8 条侧边栏假数据），PC 真实榜在 `/rank/signNewBkAll/`（与移动端 `/rank/sign/` 同榜，前 5 名吻合）。**修复**：`qidian-rank-scraper.js` 移除 `newsign` 条目（`--type newsign` 现报「未知 --type」）；`signnewbook` 补 `baseUrl` 指向 `/rank/signNewBkAll/`；`platform-qidian.md`（榜单表+下线榜注记+默认组合）与 `scan-output-format.md`（批量采集组合）同步更新。**验证**：CDP 新路径提取 20 本（#1 有仙则名）/ 移动端同榜 20 本；语法检查通过。**待定**：是否回传上游（newsign 下线情报 + signnewbook PC 路径迁移）。
