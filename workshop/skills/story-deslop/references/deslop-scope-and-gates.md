# 去味改写边界与正文质量门禁

本文件承载去 AI 味的「改写前边界」与「交付前质量门禁」两段细则。`story-deslop/SKILL.md` 只在对应时刻指向本文件，不整份预读。

## Phase 0：保护账本与改写边界

执行改写前先读 [小说保护账本](fiction-protection-ledger.md)、[模式治理](pattern-governance.md) 和 [结构审计](structural-audit.md)。项目存在 `追踪/文风/accepted-voice-profile.json` 时，再读 [已接纳正文声音画像](accepted-voice-profile.md) 并先验证画像没有过期。

问题密度、改写力度和改写范围是三条独立轴，不得互相推导：

| 轴 | 取值 | 含义 |
|---|---|---|
| `issue_density` | `light / concentrated / structural` | 模式出现多少、是否扩散到全文结构 |
| `rewrite_intensity` | `minimal / standard / aggressive` | 单个问题改动多深 |
| `edit_scope` | `in-place / bounded / structural` | 是否允许删整句、并句、重排场景 |

- 用户自己的已成稿默认 `minimal + in-place`。
- 本轮刚生成的网文章节默认 `standard + bounded`。
- 只有用户明确要求大改、回炉，或结构问题无法局部修复时，才使用 `aggressive + structural`。
- 命中数量多只能提高 `issue_density`，不能自动扩大 `edit_scope`。

文件模式先建候选运行（`{PYTHON}` 取 `python3`/`python`/`py` 第一个能跑的）：

```bash
"{PYTHON}" scripts/deslop_guard.py init "{正文文件}" --project-root "{项目根目录}" --scope bounded --intensity standard
```

脚本在 `.story-deslop/runs/{run-id}/` 创建运行清单、源文快照、候选稿和保护账本。先补全人物、伏笔、信息差和声线字段，**只编辑候选稿**；完成后运行：

```bash
"{PYTHON}" scripts/deslop_guard.py diff "{run-dir}"
"{PYTHON}" scripts/deslop_guard.py check "{run-dir}"
"{PYTHON}" scripts/deslop_guard.py apply "{run-dir}" --confirm APPLY
```

用户已明确要求修改该文件时，当前请求视为应用授权；若准备扩大 `edit_scope` 或升级到 `aggressive`，必须先说明后果并重新取得授权。脚本不修改追踪文件。交互贴文模式不落盘，但必须在内存中建立同样的保护账本和三轴决策。

---

## 正文质量门禁（强制，按序执行）

| 次序 | 门禁 | 命令 / 依据 |
|---|---|---|
| 1 | 中文语言验收门 | `node scripts/language_gate.js "{正文文件}"`（不通过则退回原正文写作者，不得自动翻译/加白名单） |
| 2 | 英文零容忍门 | 同上（`language-leak blocking`；HTML 标签/注释/实体阻断） |
| 3 | 文风卫生门 | `node scripts/check-style-hygiene.js --check --fail-on=blocking "{正文文件}"` |
| 4 | 对白漂移门 | `node scripts/dialogue_drift_gate.js --current "{正文文件}" --history-dir "{正文目录}"` |
| 5 | 本书声音画像 | `scripts/voice_profile.py check`（有足量接纳样本时；advisory，画像过期先更新） |
| 6 | 近章结构指纹 | `scripts/chapter_shape_gate.py`（长篇≥3 章历史时；只给证据，须语义冷读） |
| 7 | 错别字 / 情绪落地下限 / 句段分布 | `scripts/check-typos.js`、`scripts/check-emotion-floor.js`、`scripts/prose_metrics.py` |

**语言验收门**：正文初稿完成后第一关按 [语言门循环](language-gate-loop.md) 运行 `scripts/language_gate.js`。发现中英文混杂或 HTML 标记时，必须把行号、原片段和所在行退回原正文写作者；修改后重检。只有门返回码为零，才可继续其他检测、去味、追踪提交或下一章。门不自动翻译、不自动加白名单。

**文风卫生门**：语言门返回零后按 [正文文风卫生门](style-hygiene.md) 运行。默认出版级策略阻断表情符号、颜文字、火星文、重复装饰标点和不可见字符；`？！`、`……` 等有功能的小说标点不在默认阻断范围。作者可在本书 `设定/文风.md` 选择对白弹性或逐类策略，工具不得替作者偷偷放宽；逐字例外只写入 `.style-hygiene-whitelist`。

**适度对白**：重要对白场景写作前先按 [适度对白技巧](dialogue-craft-moderate.md) 形成轻量对白卡，结构参考 [对白卡 schema](dialogue-scene-card.schema.json)。连续逐句报幕等明确退化可阻断；标签密度、动词集中和跨章偏移只作预警并进入语义审查。语义审查确认人物声线可区分、动作有独立价值、潜台词适量且多人场景清楚后，才可继续后续验收。

**本书声音画像**：完整协议见 [已接纳正文声音画像](accepted-voice-profile.md)。新项目只从 `committed` 章节回执取样；无回执旧项目必须由作者显式批准连续旧章范围。已接纳基线与作者精选黄金样本分开维护，候选检查分别输出双向 advisory。任一画像哈希过期时不得继续使用旧数据。

**近章结构指纹**：按 [近章结构指纹与语义冷读](cross-chapter-shape.md) 运行 `scripts/chapter_shape_gate.py`。脚本相似度、问答对和收尾类型都只提供证据；主 Agent 必须回答五问并指出具体章节/段落。结构性同构不能自动改写，需重排已接纳正文时转入修订治理。
