# deploy-to-trae.ps1 — oh-story 单入口部署：story 主编 -> TRAE 全局技能目录 + 清理旧平铺技能 + 使用手册刷新
# 架构：TRAE 只部署 story（合伙人主编路由）；其余 13 个专岗留在本地仓库按文件读取（路径见 story/SKILL.md 专岗基座）。
# 用法：
#   powershell -ExecutionPolicy Bypass -File tools\deploy-to-trae.ps1 -DryRun   # 干跑，只打印动作
#   powershell -ExecutionPolicy Bypass -File tools\deploy-to-trae.ps1           # 实际部署
# 退出码：0 成功；1 失败（预检缺文件 / robocopy >=8 / 校验 MISS）
# 注意：robocopy 退出码 0-7 均为成功（1=有文件复制 2=检测到多余文件 3=两者皆有），仅 >=8 是失败。

param([switch]$DryRun)

$ErrorActionPreference = 'Stop'

$repo      = Split-Path -Parent $PSScriptRoot
$src       = Join-Path $repo 'skills'
$dst       = Join-Path $env:USERPROFILE '.trae-cn\skills'
$workspace = Split-Path -Parent $repo
$manual    = Join-Path $workspace 'oh-story使用手册.md'

$deploy = @('story')

# 旧平铺架构的 13 个专岗目录：单入口架构下从 TRAE 全局目录移除（仓库内保留，按文件读取）
$legacy = @('story-setup','story-long-write','story-long-analyze',
            'story-long-scan','story-short-write','story-short-analyze',
            'story-short-scan','story-deslop','story-import','story-review',
            'story-cover','story-data-analyze','browser-cdp')

# 预检：story 源与 SKILL.md 必须在；专岗基座 13 个 SKILL.md 也必须齐全（路由表按文件派单，缺了会路由失败）
$missing = @($deploy | Where-Object { -not (Test-Path (Join-Path $src "$_\SKILL.md")) })
$missingBase = @($legacy | Where-Object { -not (Test-Path (Join-Path $src "$_\SKILL.md")) })
if ($missing.Count -gt 0 -or $missingBase.Count -gt 0) {
    if ($missing.Count -gt 0)     { Write-Host "[FAIL] 部署源缺 SKILL.md: $($missing -join ', ')" -ForegroundColor Red }
    if ($missingBase.Count -gt 0) { Write-Host "[FAIL] 专岗基座缺 SKILL.md: $($missingBase -join ', ')" -ForegroundColor Red }
    exit 1
}

if ($DryRun) {
    $deploy | ForEach-Object { Write-Host "[DRY] 部署 $src\$_ -> $dst\$_" }
    $legacy | ForEach-Object { $p = Join-Path $dst $_; if (Test-Path $p) { Write-Host "[DRY] 清理 $p（旧平铺技能）" } }
    Write-Host "[DRY] 手册将刷新: $manual"
    exit 0
}

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

$failed = @()
foreach ($s in $deploy) {
    robocopy (Join-Path $src $s) (Join-Path $dst $s) /MIR /XD .git /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { $failed += "$s (robocopy exit $LASTEXITCODE)" }
}

if ($failed.Count -gt 0) {
    Write-Host "[FAIL] robocopy 失败: $($failed -join '; ')" -ForegroundColor Red
    exit 1
}

# 清理旧平铺技能目录（只删白名单里的 13 个，不动 TRAE 其他技能）
$cleaned = 0
foreach ($s in $legacy) {
    $p = Join-Path $dst $s
    if (Test-Path $p) { Remove-Item $p -Recurse -Force; $cleaned++ }
}

# 尾部核对：story SKILL.md 存在 + 专岗基座完整 + 旧目录已清
$missCount = 0
foreach ($s in $deploy) {
    $f = Join-Path $dst "$s\SKILL.md"
    if (Test-Path $f) {
        $desc = (Select-String -Path $f -Pattern '^description:' | Select-Object -First 1).Line
        if ($desc) {
            $short = $desc.Substring(0, [Math]::Min(72, $desc.Length))
            Write-Host "[OK] $s : $short"
        } else {
            Write-Host "[WARN] $s : description 行未找到，请检查 SKILL.md 格式" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[MISS] $s : SKILL.md 不存在" -ForegroundColor Red
        $missCount++
    }
}
foreach ($s in $legacy) {
    if (Test-Path (Join-Path $dst $s)) {
        Write-Host "[MISS] 旧技能未清理: $s" -ForegroundColor Red
        $missCount++
    }
}
if ($missCount -gt 0) {
    Write-Host "[FAIL] $missCount 项校验缺失" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# 刷新工作区《oh-story使用手册.md》（写作者版，随部署更新）
# ---------------------------------------------------------------------------
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$manualBody = @"
# oh-story 使用手册（写作者版）

> 生成时间：$stamp · 由 deploy-to-trae.ps1 自动刷新
> 架构：TRAE 只装一个「合伙人主编」（story），其余 13 个专岗由主编按需调度——技能列表干净，大白话直接说。

## 一、你的合伙人主编

**story = 网文工作室合伙人主编**。你的收入来自投稿分成，他的判断只有一个标准：让这本书卖得更好。

- 他的平台盘：长篇盯**起点（付费精品）、番茄（免费走量）、晋江（女频言情）**；短篇盯**知乎盐言、七猫、黑岩、点众**
- 他的职责：接需求 → 商业判断 → 派专岗执行 → 交稿把关
- 他不亲自写稿：正文/拆解/数据由专岗完整流程产出，他负责派单和让稿子值钱

## 二、直接说人话（不用记任何命令）

| 你想干什么 | 直接说 |
|---|---|
| 看市场 | 「最近什么火」「起点最近什么书火」「番茄有什么好看的」 |
| 选题 | 「现在写什么能爆」「帮我选题」 |
| 拆书学习 | 「帮我拆这本书」「这书为什么火」「看看黄金三章」 |
| 开长篇 | 「我想写本小说」「帮我开个新书」「我有个点子想写成长篇」 |
| 开短篇 | 「帮我写个短篇」「我想投盐言」 |
| 日更 | 「写第 N 章」「日更 3 章」「接着往下写」 |
| 卡文了 | 「写不下去了帮我推剧情」 |
| 去AI味 | 「这段读着太机器了」「改得像人写的」「这段一股AI腔」 |
| 审稿 | 「帮我审下这章」「看看有没有逻辑漏洞」「这章能不能发」 |
| 数据复盘 | 「为什么没人看我的书」「追读一直掉」「哪一章掉读者最多」 |
| 导入旧书 | 「把我的书导进来」「我有本写了一半的书」 |
| 封面 | 「帮我做个封面」「给我的书设计封面」 |
| 建项目 | 「准备写书」「我要开始写小说了」 |
| 工作台 | 「打开工作台」 |
| 求助 | 「网文工具怎么用」 |

说法不在这个表里也没关系——主编做的是语义理解，意思相近就能命中；实在听不懂会弹一个选择框让你点，选 Other 或直接描述也行。

## 三、三条典型流程

### 1. 从零写长篇（六步）

| 步骤 | 做什么 | 说什么 | 产出 |
|---|---|---|---|
| 1 扫榜 | 看市场什么火 | 「帮我扫番茄榜」 | 榜单分析报告 |
| 2 选题 | 定题材方向 | 「写什么能爆」 | 选题决策.md |
| 3 拆对标 | 学爆款结构 | 「拆解《对标书名》」 | 拆文库/书名/ |
| 4 建项目 | 部署写作环境 | 「准备写书」（环境选 TRAE） | 项目目录 + 规则文件 |
| 5 开书 | 设定+大纲+首批细纲 | 「帮我开书」 | 设定/ 大纲/ 细纲 |
| 6 日更循环 | 逐章写正文 | 「写第 1 章」「日更 3 章」 | 正文/ + 质检记录 |

### 2. 从零写短篇（三步）

1. 说「扫短篇榜看什么火」→ 2. 说「写一个短篇」 → 3. 写完说「帮我审一下」

### 3. 已有书导入续写（两步）

1. 说「把我的书导进来」并给出文件/目录 → 2. 导入完成后说「写下一章」

## 四、日更一章的标准循环

你只管说「写第 N 章」，其余主编自动调度：写前复查上一章质检欠账 → 按细纲写正文 → 六项质检（错别字 / AI句式 / 情绪下限 / 钩子强度 / 细纲照搬 / 追踪一致性）→ 结果登记 `追踪/质检进度.md` → 更新状态追踪。想改剧情：先说「改第 N 章细纲」，再写正文。

## 五、FAQ

- **技能列表里怎么只剩一个 story 了？** 这是单入口架构：主编在本地仓库按文件调度 13 个专岗（基座：`f:\AI\Trae工作区\Agent&Skill规划\oh-story-trae\skills\`），功能一点没少，列表干净了。
- **仓库挪位置了怎么办？** 主编派单会报告探测失败路径；改 `story\SKILL.md` 里「专岗基座」一节的路径，重跑 deploy 脚本即可。
- **怎么更新到新版？** 每周日 19:00 自动监听，上游有更新会主动通知；确认后走本地同步流程，你只管点头。
- **扫榜需要登录的网站怎么办？** 首次会弹出浏览器调试窗口（Edge），手动登录一次后长期复用。首次启动会关闭 Edge 全部窗口，注意保存工作。
- **换电脑怎么迁移？** 备份 `novel_projects\` 整个目录 + 本仓库 + 重跑 deploy 脚本。
- **我的数据在哪？** 全部在本地：书稿在 `novel_projects\{书名}\`，登录态在 `~/edge-debug-profile`，不云端存储。
- **英文小说能写吗？** 当前部署未含 story-globalize（英文/海外发行专岗），提英文需求主编会明确告知缺失并停止，不会用中文流硬凑。
"@

[System.IO.File]::WriteAllText($manual, $manualBody, (New-Object System.Text.UTF8Encoding($true)))
Write-Host ""
Write-Host "[DONE] $($deploy.Count) 个技能已同步到 $dst（单入口架构）"
if ($cleaned -gt 0) { Write-Host "[DONE] 已清理 $cleaned 个旧平铺技能目录" }
Write-Host "[DONE] 手册已刷新: $manual"
exit 0
