# 题材契约与正文卫生审查协议

本文件承载 story-review 的专项审查协议：题材契约审查、去味语义模式治理、中文正文英文零容忍审查、文风卫生审查与适度对白语义审查。审查任务命中对应项时按需读取，不整份预读。

## 题材契约审查（v0.8）

项目存在 `设定/题材契约.json` 时，在题材与节奏审查前读取该文件；不存在时沿用现有 rubric，不因缺失契约阻塞旧项目。

每条题材相关发现必须增加 `finding_type`：

| `finding_type` | 判定条件 | 可用严重度 |
|---|---|---|
| `contract_violation` | 正文或大纲有明确证据违反项目题材契约、设定或已声明规则 | blocking / major / minor |
| `continuity_error` | 数值、资源、能力、楼层、人物状态前后矛盾 | blocking / major |
| `market_risk` | 未违反项目事实，但可能削弱目标平台或题材读者预期 | major / minor |
| `preference` | 只是审查者个人更喜欢另一种写法 | suggestion only |

客观问题必须同时引用「文本证据」和「契约字段」；无法指出明确契约字段时，不得标为 `contract_violation`。温馨奇幻不得只因没有生死危机或强悬念判为节奏失败，应先检查人物、关系、手艺、社区或生活空间是否发生状态变化。

## 去味语义模式治理 v1.1

审查 [候选语义模式契约](pattern-contracts.json) 时，默认按 advisory/S3 输出，必须同时给出文本证据、可能功能和排除条件。单次命中不得证明文本由 AI 生成，也不得直接升级为 blocking/S2。只有现有确定性脚本已判 blocking、或项目明示规则被破坏时，才按原严重度流程处理。人物声线趋同、全文节拍同构、动作后解释和跨章反应循环属于语义审计，不自动改正文。

## 中文正文英文零容忍审查

中文作品中任何未精确授权的拉丁字母 token 均按语言泄漏处理，不因位于台词、词很短、首字母大写或全大写而降为 advisory。URL、邮箱、路径、文件名和代码只机械保护明确非叙事结构；其他外语只有在用户单独确认后才可通过 `.deslop-whitelist` 精确登记。HTML 标签、注释和实体一律阻断。审查前首先运行 `node scripts/language_gate.js "{正文文件}"`；返回非零或其他检测脚本报 `language-leak blocking` 时一律阻止通过，不计入 AI 味轻中重分档。

## 中文正文文风卫生审查

语言门通过后运行 `node scripts/check-style-hygiene.js --check --fail-on=blocking "{正文文件}"`。默认只阻断高置信的表情符号、颜文字、火星文、标点堆砌与不可见字符；有功能的 `？！`、`……` 不报。项目若配置 `设定/文风.md`，按 [正文文风卫生门](style-hygiene.md) 读取策略；审查者不得把允许项自行升级为 blocking，也不得用宽松配置豁免未授权外语。

## 适度对白语义审查

审查对白时必须读取 [适度对白技巧](dialogue-craft-moderate.md) 与 [对白归属标记漂移](dialogue-attribution-drift.md)，需要核对卡片字段时使用 [对白卡 schema](dialogue-scene-card.schema.json)。先运行 `node scripts/dialogue_drift_gate.js --current "{正文文件}" --history-dir "{正文目录}"`；机械门返回非零时本章不得通过，只有预警时继续语义判断，不得按密度直接退回。重点检查人物是否在采取不同语言策略、主要人物语言能否互换、动作是否只是标签替身、潜台词是否过密、多人场景是否清楚。允许必要的简单「说/问」，禁止机械换成华丽标签或空动作。
