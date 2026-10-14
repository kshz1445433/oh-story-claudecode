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
- [x] **Phase 5 · drama 二期部署（2026-10-12 完成，详见 B-068）**：裁决 A=v0.8.1（fork HEAD `c2426e03` 与 release 同一 commit，锚点候选合一）；B=监听加仓**实测免做**（check-updates.mjs 早已含 drama 条目 `zenstory-ai/drama-skills`，update-state 今日 12:00 已实跑 v0.8.1）；C=EP001 冷启动+真实书目二轮；D=Vd4 授权出片。**5.2**：浅 clone main（本地 tag `local-deploy-v0.8.1` 锚定）→ 撞名核验零同名（drama `short-drama*` 11 前缀 vs 本机全部在役名；「漫剧剧本审核专家/编剧创作系统」功能相似但职责不同，保留）→ 目录隔离核验（drama 根 `.agents/`=维护者 notes、skill 内 `agents/`=interface yaml 非注册表、无 hooks 注入）→ 白名单 9 技能复制 `F:\AI\Trae工作区\漫剧\.trae\skills\`（produce/edit/knowhow 排除）+ `.drama-deployed` 哨兵。**5.3**：`漫剧\.trae\rules\drama-router.md`（路由表/五文档制/划界话术/分流词/数据区边界）。**Vd1 双态 ✅**：EP001 原样 OK exit=0；故意破坏视觉依据 → exit=1 报具体修法原因 → 恢复复 OK。**Vd2 ✅**：恰 9 目录。**Vd3/Vd4 待后续会话**（漫剧项目内实测；Vd4 属 halt 出片）。temp clone 已清理。
- [x] **Phase 5 · 矩阵规范整合（计划外升级，2026-10-12 用户批准，详见 B-069）**：祟仙 EP001 投稿版三轮迭代（v2 附件格式映射 → v3 闪回成对+OS 栏+调度七型 → v4 分场修正，1-2/1-3/1-4 并为两场）暴露「投稿格式层缺失」→ 把本机「编剧创作系统」矩阵规范整合进 `drama-router.md` 两节：**投稿版渲染**（场头/标签映射表、分场三要素=时间/空间/人物、SC≠场景边界禁直接继承、硬约束自查）+ **第二入口从零原创链**（创作调度中心 9 步走全局层，路由词「从零写个短剧/原创漫剧」，原创产物落 projects\…\剧本.md 可接出片）。红线八大维度不接（与漫剧剧本审核专家同源重复）。矩阵文件不复制（全局已在位引用即用）。划界话术补注 MiniMax H3/H3 Max 接 API 通路（回装 produce+凭据）。Vd4 出片裁决变更：**延后至接 API 时一并做**（用户 2026-10-12 拍板）。
- [x] **Phase 5 · 母本入库接口落地（计划外升级，2026-10-12 用户拍板「只管发剧本 Agent 自行分配」，详见 B-069 追加 2）**：根级 `漫剧\参考资料\` 建 5 类子目录 + `母本索引.md`；drama-router 新增「参考资料库与母本入库」节（入库四步/分标签三问/按维度消费表/透明声明可否决）。《深院有春迟》迁入 `格式母本\`（项目内副本清除防双源漂移），索引首条 F-001 双标签（格式+对白文风），SHA `C98EA03C` 迁移前后一致。
- [x] **Phase 5 · 首批实战入库 W/F 双系定型（2026-10-12，详见 B-069 追加 3）**：用户批量投喂 3 部剧本完成入库首测——W-001 赛博天尊完本（5.3 万字/23 集，往期作品）、W-002 重生千禧（6.3 万字/60 集，往期作品）、F-002 陛下我在耍你耶一卡（结构母本+桥段台词）；用户改判「赛博天尊镜头语言无参考价值」→ 索引立「消费禁区」节（W 系镜头语言消费一律排除 + F-001 为投稿版唯一格式母本）；drama-router 补「编号双系」（F 系按维度查母本 / W 系按书名题材查作品）。SHA8：D2E5CD78/3C651CC4/E72EDEBD。
- [x] **Phase 5 · 母本入库入口升级全局（2026-10-12，详见 B-069 追加 4）**：全局 ask-matt SKILL.md 新增「第一·五步：剧本类文件识别拦截」——内容级判定（四特征命中≥2）+ 四选框（入库/干活/仅参考/都不是），用户拍板「不靠触发词靠识别+弹框」方案落地；F 侧镜像同步一致（SHA8 A125E40F，占用报错为假警实测已同步）；协议真源仍在漫剧 drama-router，全局只指路不副本。观察项：下次投喂剧本实测弹框。
- [x] **Phase 5 · 弹框未触发根因修复（2026-10-12，详见 B-069 追加 5）**：首用实测败（用户投《铁火卿娜》剧本 docx，TRAE 直接进入「怎么改」问答，未弹框）→ 根因=拦截写在按需加载的 ask-matt 体内，文件投喂不唤起该技能；修复=user_rules.md 常驻层新增**第 11 条剧本类文件投喂必拦截**（内容判定先于意图响应；判中不执行不先问怎么改，弹四选框；例外三条）；ask-matt 节降级为指针防双源。镜像 SHA8=6564E172 一致。二次观察待下次投喂。
- [x] **Phase 5 · 母本数据质量治理（2026-10-12，详见 B-069 追加 6）**：二次首用实测通过（W-003 铁火阑珊处弹框入库走通）；审计发现三本 W 系体量偏大 ~20%（字节数估算所致）→ 索引改 docx XML 直读实测值（4.3/5.1/4.6 万字）+ W-003 SHA 改落盘实测 46E111E5；drama-router 协议补两条硬规则：SHA 以落盘文件实测为准、体量以 docx 直读实测为准（禁估算/禁自述）。
- [x] **上游同步 · T8 回植仓库（2026-10-12，详见 B-070）**：外部同步审计报告「上游同步待办-2026-10-12.md」R2 风险实证——T8 修复此前只落在全局技能目录，仓库侧缺失，重跑 /story-setup 会回退缺陷。修复=嫁接回仓库新版 scraper（保留 captureRunClock 双时脉本机增量）：移除 newsign 条目与用法行 + signnewbook 补 baseUrl /rank/signNewBkAll/ + 下线注记（含 `--type newsign` 现走 L530 fail-fast 报「未知 --type」）；SKILL.md 榜单表（newsign 行删、signnewbook 更 URL、补下线注记、文件命名示例改）+ scan-output-format.md 默认组合换签作/公众。验证：node --check 过、skill 内 grep 无 newsign 残留（仅剩 2 处有意注记）、全局与 F 镜像本就完好无需动。commit `5140163` 已推。
- [x] **Phase 5 · 真实书目闭环 + 人物档案卡体系（2026-10-12，详见 B-071/B-072）**：漫剧线真实闭环走通——novel-analyze S0-S1 全产物（triage=值得拆/开篇替换点第3章装疯/4 条分集候选）+ 检查步 A/B/C（review approved）+ **Vd3 项目内划界四段话术实测通过**；image-prompts 首产 11 条 IMG。用户投档案卡模板判「提示词不对」→ **F-003 入库**（人物设定图档案卡版式，SHA AE421B30，只取排版结构维度）+ **image-prompts 配方升级**（character-and-look.md character_sheet 默认档案卡结构：三视图+表情集+拆解+特写+色卡，长句字段禁入画面防鬼画符，三视图一致性铁律）+ **IMG-01 重写**（祟仙内容×档案卡版式，五板块）+ IMG-02/03 重绑 + state.json 生命周期 publish/accept。画风路线 A/B/C 待用户定案后全板统一追加风格锚点。部署层补丁防覆盖=B-072 全量留痕（源仓 temp clone 已清理，重部署须先比对 references）。
- [x] **Phase 5 · 档案卡实测通过 + 「风格随剧本」定案（2026-10-12，详见 B-073）**：用户四步递进单测 IMG-01 通过（①三视图/②表情集/③服装拆解/④整卡，结构保留为复用模板）；用户裁决体系级政策——**不设全局固定画风，风格随剧本推导**（题材·时代·氛围·光色 → 统一锚点句，同项目全板共用；原 A/B/C 四选一废止）→ SKILL.md 新增体系级规则一条 + 祟仙首例应用（赛博朋克底层写实锚点段提案，逐条出图末尾追加，待视觉设定定案升正式）。部署层补丁登记同 B-072。
- [x] **母本库上移工作区根（2026-10-12，详见 B-081）**：`漫剧\参考资料\`（7 文件）→ `F:\AI\Trae工作区\参考资料\` 根级跨项目共享库，SHA 盘前盘后 7/7 一致零损伤；引用改写 4 文件（索引六条目/drama-router/user_rules 第 11 条/EP001 图片提示词），旧路径活性引用零残留；项目特有素材仍就近 `projects\<书名>\参考资料\`（分层不变）。
- [x] **深化二段并入漫剧线（2026-10-12，详见 B-082）**：用户投《编剧创作系统_Skills.zip》判「小说→剧本单薄」属实（缺创造性打磨层）→ 用户裁决**不启动原 skill 路径**，方法本体并入：新建 `漫剧\.trae\rules\craft-review.md`（节奏四维 30 秒触点口径本地化+台词五维对照人物小传+避免清单+两阶段报告→用户选向→守恒八项复核+上头双法/1+1 铁律+返工≤2+交付后回路由；报告落 `projects\<书名>\剧集\EPxxx\深化报告\`）+ drama-router「深化二段（初稿后→审查前，固定执行）」节两入口全挂。与官方手艺书分工不重叠（craft-review 只管验收不管写法）；不复制 steps 原文、不动 9 技能与官方 check 脚本、不依赖全局系统（上游删除不受影响）。链路升级：初稿→**深化二段**→review 四表→投稿版渲染。
- [x] **分集大纲样张三件入库 + 分集格式锚定型（2026-10-12，详见 B-083）**：用户投三份分集大纲（满门抄斩/记忆战场/龙之囚）判样张更好 → F-004/005/006 落 `参考资料\结构母本\`（SHA 落盘实测 EC2E4AD5/6380D7A9/6D5C5087）+ 索引登记 + drama-router 按维度消费表新增「分集候选/分集地图/分集大纲产出 → F-004 单集三件套骨架+阶段核心目标+自审表（悬念型加 F-005 信息释放表、女频钩子参考 F-006，题材不带入）」。与 B-082 深化二段咬合：分集声明爽点 → craft-review 逐集核兑现。
