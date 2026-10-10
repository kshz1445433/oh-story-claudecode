# oh-story 网文工具箱 — TRAE 项目规则

本项目接入 oh-story 网文写作工具集（TRAE 本地变体）。TRAE 无 hooks、无项目 custom agents，原 hooks 硬拦截以本规则 + 各 skill 内流程化闸口替代执行。

## 路由（意图 → Skill）

用户意图涉及网文写作时，先按下表用 `Skill()` 调用对应技能；意图模糊、用户求助或不知道用哪个时先调 `story`（它自带路由表与新手引导）：

| 意图 | Skill |
|---|---|
| 模糊意图 / 怎么用 / 新手引导 | story |
| 写长篇 / 开书 / 日更 / 写第N章 | story-long-write |
| 写短篇 | story-short-write |
| 长篇拆文 / 分析这本书 | story-long-analyze |
| 短篇拆文 | story-short-analyze |
| 扫长篇榜 / 选题 | story-long-scan |
| 扫短篇榜 | story-short-scan |
| 去AI味 | story-deslop |
| 审稿 / 一致性检查 | story-review |
| 封面 | story-cover |
| 导入已有书 | story-import |
| 后台数据复盘 | story-data-analyze |
| 准备写书 / 部署环境 | story-setup |
| 浏览器登录态 / 抓取 | browser-cdp |

Skill 缺失时报告缺失并停止，不得用其他 skill 顶替交付（中文写作流不得交付英文正稿，反之亦然）。

## 写作硬约束（替代 hooks 的流程化闸口）

1. 写正文前必有大纲：长篇需 `{书名}/大纲/细纲_第N章*.md`，短篇需 `{书名}/小节大纲.md`；缺纲先补纲再写。
2. 每章正文落盘后同一轮内跑完质检脚本（错别字 → AI句式 → 情绪下限 → 钩子强度 → 细纲照搬 → tracking check），结果登记 `{书名}/追踪/质检进度.md`；不过项先修再交付。
3. 写下一章前先复查上一章质检无欠账（英文旧债、毒句式欠账零容忍）。
4. 中文正文全程锁中文：未授权英文句段、裸英文词必须清除（缩写/型号/URL/邮箱/文件名/代码与 `.deslop-whitelist` 登记项除外）；英文/海外意图改走 `story-globalize`，缺失即停。
5. skill 要求 spawn `story-architect`、`narrative-writer` 等子代理时：TRAE 不注册项目 custom agents，一律 solo/direct 执行并在结果标注 `Fallback: ... -> solo`。
6. Compact / 新会话后先读 `{书名}/追踪/上下文.md` 恢复写作状态。
7. 版本更新：不要在本项目跑 `npx skills add` 覆盖本地变体；上游更新走本地仓库同步（git fetch + rebase）后重跑 `/story-setup`。
