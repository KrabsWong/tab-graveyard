# Tab Graveyard — Product Requirements Document

> Close tabs with confidence. Recall them the way you remember them.  
> 放心关闭，按你记得的方式找回。

---

## 0. 文档信息

| 项 | 内容 |
|---|---|
| 产品名称 | Tab Graveyard |
| 文档状态 | Final Candidate |
| 作者 | huajiankan |
| 最近更新 | 2026-06-01 |
| 阅读对象 | 产品、设计、前端、扩展开发、数据、增长、商业化、法务 |
| 产品形态 | Chromium 系浏览器扩展 |
| 核心能力 | Tab Memory、Safe Archive、Tab Recall、Resurface、Session Restore、Personal Browser Memory |

---

## 1. 背景与机会

### 1.1 用户问题

现代浏览器已经成为用户主要的工作与生活入口。对知识工作者、研究者、产品经理、设计师、工程师而言，日均打开 20–100+ 个标签页是常态。

但浏览器原生的标签管理能力没有随使用强度进化：

- 标签栏超过 30 个 Tab 后几乎无法识别内容。
- History 是按时间线性堆叠的，无法表达「这个页面我曾经有意保留过」。
- Bookmark 需要用户主动分类、命名、决策，心理成本过高。
- 用户不敢关 Tab，因为关掉就意味着「我可能再也找不到」。

因此，用户不是不知道 Tab 太多，而是**不敢关闭**。

### 1.2 产品判断

Tab 过多的表层问题是「标签栏拥挤」，真实问题是：

> **用户缺少一个可信的浏览记忆系统。**

用户需要的不是单纯的 Tab Cleaner，而是：

1. **自动记住**我打开过什么。
2. **安全归档**我暂时不用的 Tab。
3. **随时找回**我曾经打开过的页面。
4. **在我需要时主动提醒**我之前看过的相关内容。
5. **让我相信关闭 Tab 不等于失去它。**

### 1.3 核心洞察：找 Tab 是情景记忆检索

用户想找回一个曾经打开过的 Tab 时，通常记不住精确 title 或 URL，而是记得一些碎片：

- 「上周六晚上看的」
- 「从 Twitter 点进去的」
- 「一个紫色封面的页面」
- 「karpathy 提到的那个视频」
- 「我当时看了一堆 AI video 定价相关内容」
- 「那篇我滚到底、读了很久的文章」

因此，Tab Search 不应被设计为传统关键词搜索，而应被设计为：

> **Tab Recall：按用户记得的任意碎片，帮助用户重新想起并找回页面。**

### 1.4 核心洞察：系统必须提前整理可回忆特征

Recall 是否好用，不取决于用户是否输入精确关键词，而取决于系统是否提前为每个 Tab 整理了足够多、足够好的可回忆特征。

因此，Tab Graveyard 会在后台为每个 Tab 生成一张「信息卡」，包含：

- 一句话总结
- 主题
- 人物 / 产品 / 公司
- 内容类型
- 阅读状态
- 重要度
- 来源
- 可能的查询表达
- 双语主题
- 任务上下文

用户不需要主动做笔记，系统会默默把 Tab 变成可找回、可识别、可恢复的记忆对象。

### 1.5 核心洞察：从找回到主动唤醒

一部分用户甚至想不起任何明确碎片，只知道「我之前好像看过相关内容」。因此，产品不能只等用户搜索，还应在合适时机主动唤醒：

> 当用户正在浏览一个新页面时，系统提示：「你 3 周前看过 4 篇相关内容，要打开吗？」

这使产品从被动工具升级为主动的浏览记忆助手。

### 1.6 产品护城河

AI 总结、语义搜索等能力会逐渐被浏览器内置。Tab Graveyard 的长期护城河不是单点 AI 能力，而是：

1. **跨浏览器 / 跨设备的个人 Tab Memory**：用户的浏览记忆不被单一浏览器生态绑定。
2. **长期个性化沉淀**：用户修正过的主题、重要度、Session 命名和规则会形成个人化记忆系统。
3. **隐私可信度**：用户明确知道哪些数据被记录、哪些不会离开本地、哪些能力可关闭。
4. **聚焦 Tab Recall 的体验深度**：比原生 History 更懂「我为什么留着这个页面」。

---

## 2. 产品定位

### 2.1 一句话定位

**Tab Graveyard 是一款 Chromium 系浏览器扩展，自动记录并智能整理你打开过的标签页，将不再活跃的标签安全归档，并支持你按时间、来源、主题、视觉印象、阅读状态或自然语言找回它们；同时在你浏览相关内容时主动唤醒过去的相关页面。**

### 2.2 产品价值主张

| 价值 | 用户语言 |
|---|---|
| 安全关闭 | 「我终于敢关 Tab 了。」 |
| 快速找回 | 「我不记得标题，但我记得一些碎片，也能找到。」 |
| 上下文恢复 | 「我可以一键恢复当时那组调研 Tab。」 |
| 主动唤醒 | 「我打开新内容时，它提醒我之前看过相关资料。」 |
| 隐私可控 | 「我知道它记录什么，也能随时关掉。」 |

### 2.3 产品边界

本产品不做：

- 完整浏览器 History 替代品。
- 笔记工具或知识库。
- 团队协作空间。
- 完整网页内容存档。
- 强制自动关闭标签页。
- Firefox / Safari 适配。

---

## 3. 用户画像

### 3.1 Tab Hoarder Tina

**占比预估：60%**

- 桌面常驻 2–4 个浏览器窗口。
- 单窗口 30–80 个 Tab。
- 不敢关 Tab，担心后面找不到。
- 每天感到标签栏混乱，但很少主动整理。

**核心痛点**：视觉过载、关 Tab 焦虑、偶尔找不回。

**核心价值**：每天清爽一点，每周关键时刻找回一次。

### 3.2 Power Researcher Paul

**占比预估：25%**

- 研究员、投资人、产品经理、分析师、创作者。
- 一次任务会打开 10–50 个相关 Tab。
- 经常需要恢复某个调研上下文。
- 对任务摘要、Session、实体浏览、跨 Tab 总结有强需求。

**核心痛点**：资料多、上下文散、调研路径难复原。

**核心价值**：找回资料、恢复上下文、总结一组 Tab。

### 3.3 Tidy Tom

**占比预估：15%**

- 平时标签数较少。
- 偶尔因为手动关闭而后悔。
- 希望有一个轻量保险箱。

**核心痛点**：偶发性误关、偶发性找不到。

**核心价值**：低干扰、关键时刻兜底。

---

## 4. 指标体系

### 4.1 核心成功指标

Tab Graveyard 使用双核心指标衡量产品是否成立：

| 指标 | 定义 | 衡量问题 | 目标 |
|---|---|---|---|
| Archive Confidence Index (ACI) | 开启自动归档 ≥ 7 天且未关闭的用户 / WAU | 用户是否真的敢关 Tab | M3 ≥ 25% |
| Recall Success Rate (RSR) | 发起 Recall 后 30 秒内点击某结果，且该结果 10 秒内未被立即关闭的比例 | 用户是否真的找得到、找得对 | M3 ≥ 65% |

两者必须同时成立：

- ACI 高但 RSR 低：用户敢关，但找不回，产品不可持续。
- RSR 高但 ACI 低：用户能找回，但仍不敢关，核心心智未建立。

### 4.2 关键业务指标

| 类别 | 指标 | M3 目标 |
|---|---|---|
| 留存 | WAU / Installed | ≥ 35% |
| 留存 | D7 / D30 | ≥ 40% / ≥ 25% |
| 归档 | 平均每用户每周归档 Tab 数 | ≥ 20 |
| Recall | 平均每用户每周 Recall 次数 | ≥ 5 |
| Recall 质量 | 首屏命中率（Top 3 含目标） | ≥ 75% |
| Recall 质量 | 平均 cue 数 | ≥ 2.5 |
| Resurface | 主动推荐点击率 | ≥ 12% |
| 商业化 | Free → Premium 转化 | ≥ 4% |

### 4.3 健康度告警指标

| 指标 | 正常区间 | 异常含义 |
|---|---|---|
| Tab Restore Rate | 8%–25% | 过低：Recall 未被使用；过高：归档判定不准 |
| Auto-Archive 关闭率 | < 15% | 用户不信任自动归档 |
| Session 手动拆分率 | < 10% | Session 聚类过激进 |
| Why-Tip 负反馈率 | < 1% | 系统推测过度或措辞越界 |
| 信息卡修正率 | 5%–20% | 过低：没人使用；过高：生成质量差 |
| Resurface 关闭率 | < 10% | 主动提醒过于打扰 |

### 4.4 不应过度优化的指标

- Ghost Tabs 数量。
- 用户单次输入字符数。
- 排行榜参与人数。

这些指标可以观察，但不应作为核心增长目标，否则会诱导错误产品行为。

---

## 5. 竞品与差异化

| 产品 | 核心能力 | 局限 | Tab Graveyard 差异 |
|---|---|---|---|
| 浏览器 History | 浏览记录 | 时间线堆叠，缺少任务上下文 | 以 Tab 为单位，提供 Recall、信息卡、Session |
| Bookmark | 主动收藏 | 用户懒得分类，收藏后也很少再看 | 被动记录、自动整理、按记忆找回 |
| OneTab | 一键收缩 | 只是列表，不理解内容 | 自动归档 + 智能 Recall + Session Restore |
| Dia Tab Cleanup | 按天清理 | 清理强，找回弱 | 找回是核心能力 |
| Arc Tab Sleep | 休眠标签 | 降低资源占用，但不解决记忆 | 安全归档 + 可搜索 + 可恢复 |
| Workona / Toby | Workspace 管理 | 需要用户主动维护 | 零成本被动记录与整理 |

---

## 6. 核心场景

### 6.1 每日回顾

Tina 早上打开浏览器，Popup 顶部展示：

> 「昨天你打开了 23 个 Tab，最重要的是 Runway Pricing，最久停留的是 AI Video Market Map。」

她不需要立刻搜索，也能感到系统在帮她整理浏览记忆。

### 6.2 日常清理

Tina 看到自己有 14 个 Ghost Tabs。

系统提示：

> 「可安全归档 14 个标签，其中 2 个看起来可能重要，已为你保留。」

Tina 点击归档，标签栏立即清爽。5 秒内可撤销。

### 6.3 模糊记忆找回

Paul 想找三天前晚上看过的一篇 AI video 定价文章，只记得从 Twitter 点进去、是 Substack、主题是定价。

他输入：

```text
昨晚 twitter substack ai 视频 定价
```

系统识别出时间、来源、域名、主题四个 cue，返回 1–3 张高相关卡片。

### 6.4 自然语言找回

Paul 输入：

```text
karpathy 提到的那个讲 LLM 评估的视频
```

系统理解为：人物 = karpathy，内容类型 = video，主题 = LLM evaluation，并返回目标 Tab。

### 6.5 完全想不起关键词

用户只记得「是上周某个调研时打开的页面」，于是进入 Sessions 视图，通过时间线和缩略图浏览，找到「AI Video Pricing Research」Session，并在其中找到目标 Tab。

### 6.6 主动唤醒

Paul 打开一篇新的 AI 视频论文。系统提示：

> 「你 3 周前看过 4 篇相关内容，要打开吗？」

Paul 点击后，系统打开之前的相关 Tab，帮助他快速恢复研究上下文。

### 6.7 跨 Tab 任务摘要

Paul 输入：

```text
帮我总结上周做 AI 视频调研看的所有东西
```

系统返回：

- 你看了 14 个相关 Tab。
- 主要集中在定价、模型能力、市场格局三个主题。
- 最长停留的是 Runway Pricing。
- 你似乎还缺少客户付费意愿相关资料。

### 6.8 批量恢复 Session

Paul 在 Graveyard 看到：

> AI Video Pricing Research · 14 Tabs · 上周六晚

点击后，系统在新窗口恢复整组 Tab。

### 6.9 误归档撤销

Tom 不小心点击归档。系统提供 5 秒 Undo。点击后所有 Tab 回到原窗口、原位置。

### 6.10 排行榜分享

用户可以分享自己本周归档了多少 Ghost Tabs，形成轻量社交传播。但排行榜默认鼓励健康行为，而不是鼓励囤积更多 Tab。

---

## 7. 功能架构

```text
Tab Graveyard
├── Tab Memory
│   ├── 自动记录打开过的 Tab
│   ├── 本地保存浏览记忆
│   └── 支持导出 / 导入
├── Tab Info Card
│   ├── 一句话总结
│   ├── 主题 / 实体 / 内容类型
│   ├── 阅读状态 / 重要度
│   └── 用户可修正
├── Safe Archive
│   ├── Ghost Tab 判定
│   ├── 一键归档
│   ├── 自动归档信任阶梯
│   └── Undo / Restore
├── Tab Recall
│   ├── Smart Input
│   ├── Facets
│   ├── Cards
│   ├── Timeline / Sessions / Source / Entity
│   ├── Why-Tip
│   └── Synthesis
├── Resurface
│   ├── Continue where you left off
│   ├── 相关内容主动唤醒
│   └── Session 延续提示
├── Graveyard
│   ├── By Date
│   ├── By Session
│   ├── By Source
│   └── By Entity
├── Leaderboard
└── Privacy & Settings
```

---

## 8. 详细功能需求

### 8.1 浏览器兼容范围

| 浏览器 | 支持 | 备注 |
|---|---|---|
| Chrome | 支持 | 主目标浏览器 |
| Edge | 支持 | Chromium 内核 |
| Brave | 支持 | Chromium 内核 |
| Opera | 支持 | Chromium 内核 |
| Vivaldi | 支持 | Chromium 内核 |
| Arc | 支持 | 需与 Tab Sleep 共存 |
| Dia | 支持 | 需与内置清理能力共存 |
| Firefox | 不支持 | 非本期范围 |
| Safari | 不支持 | 非本期范围 |

### 8.2 Tab Memory

#### 8.2.1 自动记录

安装后自动开始记录用户打开过的 Tab。

记录对象包括：

- 当前打开的 Tab。
- 后续打开的新 Tab。
- 被归档后从浏览器关闭的 Tab。
- 被恢复后再次关闭的 Tab。

#### 8.2.2 记录字段

用户感知层面需要记录：

- 标题
- URL
- 网站图标
- 域名
- 打开时间
- 最近激活时间
- 所属窗口
- 是否 pinned
- 是否播放音频
- 是否归档
- 是否恢复过
- 所属 Session
- 信息卡

#### 8.2.3 用户控制

用户可以：

- 暂停记录。
- 清空所有数据。
- 对特定域名关闭记录。
- 导出 / 导入数据。
- 开启严格隐私模式。

隐私模式 Tab 默认不记录。

#### 8.2.4 冷启动导入

新用户安装首日，Tab Memory 为空，Recall 价值不足。因此 Onboarding 提供三个选项：

1. **导入过去 30 天浏览历史**：用户授权后一次性导入，帮助 Recall 当天可用。
2. **使用 Demo Workspace**：提供模拟数据，帮助用户体验 Recall 与 Session。
3. **从零开始**：不导入历史，直接开始记录。

导入数据与 Demo 数据都可一键清除。

---

### 8.3 Tab Info Card（智能信息卡）

#### 8.3.1 定义

每个 Tab 都会被整理成一张信息卡。信息卡不是展示给用户填写的表单，而是系统用于 Recall、归档判断、Session 聚类、主动唤醒的基础记忆单元。

#### 8.3.2 信息卡内容

| 字段 | 作用 |
|---|---|
| 一句话总结 | 帮助用户识别卡片，比原网页 title 更可读 |
| 主题 | 用于主题筛选与语义 Recall |
| 人物 / 产品 / 公司 | 用于 Entity 浏览与召回 |
| 内容类型 | Article / Video / PDF / Tweet / Repo / Doc / Image / SaaS 等 |
| 来源 | Twitter / Slack / Email / Search / Direct / Bookmark 等 |
| 阅读状态 | Fully Read / Skimmed / Bounced |
| 重要度 | Must Keep / Should Keep / Maybe / Safe to Archive |
| 视觉印象 | 页面主色、缩略图、视觉特征 |
| 可能查询表达 | 用户可能如何描述这个 Tab |
| 双语主题 | 支持中文搜英文页、英文搜中文页 |
| 内容指纹 | 用于同内容去重 |

#### 8.3.3 阅读状态

| 状态 | 含义 | 用户价值 |
|---|---|---|
| Fully Read | 用户完整读过或看过 | 可找「我上周完整读完的那篇」 |
| Skimmed | 用户浏览过但未深读 | 可与完整阅读区分 |
| Bounced | 用户快速离开 | 降低召回和重要度权重 |

#### 8.3.4 重要度等级

| 等级 | 含义 | 自动归档行为 |
|---|---|---|
| Must Keep | 明显重要 | 永不自动归档 |
| Should Keep | 可能重要 | 默认不自动归档 |
| Maybe | 中性 | 进入渐进式自动归档候选 |
| Safe to Archive | 安全归档 | 优先自动归档候选 |

#### 8.3.5 用户修正

用户可以修正信息卡。修正分为两类：

**轻量修正**：

- 仅作用于当前 Tab。
- 可改一句话总结、主题、重要度。
- 即时生效。

**规则化修正**：

- 用户可将修正保存为规则。
- 规则可作用于同域名、同主题、同类型 Tab。
- 例：所有 `*.linear.app` 永不自动归档；所有 Substack 默认归为 Reading。

系统保留原始信息卡，用户可一键回滚到系统生成版本。

---

### 8.4 Safe Archive

#### 8.4.1 Ghost Tab 定义

一个 Tab 在默认 48 小时内未被激活，且不满足排除条件，则被判定为 Ghost Tab。

用户可将阈值改为：12h / 24h / 48h / 7d / 自定义。

#### 8.4.2 默认排除条件

以下 Tab 不会被自动归档：

- Pinned Tab。
- 正在播放音频或视频。
- 视频会议页面。
- 存在未保存表单输入的页面。
- 用户设置的白名单域名。
- 本地开发地址。
- Must Keep Tab。
- Should Keep Tab。
- 匹配用户规则化修正的 Tab。

#### 8.4.3 一键归档

用户在 Popup 或 Dashboard 点击：

> Archive N Ghost Tabs

系统展示归档确认：

> 将归档 14 个标签，其中 2 个看起来可能重要，已为你保留。

确认后：

- Tab 从浏览器关闭。
- 进入 Graveyard。
- 5 秒内可 Undo。
- 仍可通过 Recall 找回。

#### 8.4.4 自动归档信任阶梯

自动归档默认关闭。系统通过信任阶梯逐步引导用户开启。

| 阶段 | 条件 | 行为 |
|---|---|---|
| Stage 0 · 观察 | 安装首日 | 只记录，不自动归档 |
| Stage 1 · 推荐归档 | 连续使用 3 天且至少手动归档 1 次 | Popup 推荐「今天有 X 个建议归档」 |
| Stage 2 · 半自动归档 | 用户接受过 3 次推荐 | 归档前 24 小时预告，只归档 Safe to Archive |
| Stage 3 · 全自动归档 | 半自动稳定 14 天 | 可扩展到 Maybe，仍保留预告与 Undo |

每个阶段升级必须由用户主动确认。

#### 8.4.5 开启前预演

首次开启自动归档前，系统必须展示预演：

> 如果按当前规则，过去 7 天会被自动归档这些 Tab。

用户可以在预演中：

- 批量标记 Must Keep。
- 修改阈值。
- 排除域名。
- 取消开启。
- 确认开启。

#### 8.4.6 错误反馈闭环

以下行为会反馈给重要度判断：

- 用户 Restore 后 24 小时内高频激活该 Tab：说明该 Tab 不应被归档。
- 用户 Recall 后 10 秒内关闭结果：说明可能点错，不计入成功。
- 用户手动将 Tab 标记为 Must Keep 或 Safe to Archive：后续类似 Tab 自动学习偏好。

---

### 8.5 Tab Recall

#### 8.5.1 设计原则

| 原则 | 含义 |
|---|---|
| Recall, not Search | 帮用户想起来，而不是要求用户打对关键词 |
| Multi-Cue Composition | 支持多个记忆碎片任意组合 |
| Recognition over Recall | 用缩略图、总结、人话时间让用户认出来 |
| Browsable Memory | 完全想不起时也能从 Session、Timeline、Source、Entity 逛进去 |
| Conversational | 支持自然语言输入和反问澄清 |
| Latency First | 普通查询必须秒级响应 |

#### 8.5.2 支持的记忆碎片

| 碎片类型 | 用户表达 |
|---|---|
| 时间 | 昨晚、上周六、三周前、开会前 |
| 来源 | 从 Twitter 点的、Slack 里别人发的、Google 搜出来的 |
| 共现 | 当时旁边开着 GitHub、跟那篇 paper 一起开的 |
| 主题 | LLM 评估、AI 视频定价、voice agent |
| 类型 | YouTube、PDF、Tweet 串、Repo、Notion、Doc |
| 作者 | karpathy 写的、Sam Altman 发的 |
| 视觉 | 紫色封面、黑底页面、有一张大图 |
| 阅读状态 | 我完整读完的、我看了很久的、我复制过的 |
| 任务上下文 | 上次做竞品调研那一组 |
| 标题片段 | 标题里有 pricing 的那个 |
| 域名片段 | 某个 substack、某个 .ai 域名 |

#### 8.5.3 使用方式一：自然语言

用户直接输入自己记得的描述：

```text
昨天晚上从 twitter 点的 substack，讲 ai 视频定价
```

系统将识别出的 cue 展示为可编辑 chip：

```text
[昨晚] [from Twitter] [substack.com] [主题: AI 视频定价]
```

用户可删除或修改任意 chip。

#### 8.5.4 使用方式二：Facets 筛选

Recall 页左侧提供 Facets：

- Time：今天、昨天、本周、上周、自定义。
- Source：Twitter、Slack、Email、Search、Direct、Bookmark。
- Type：Video、PDF、Tweet、Repo、Article、Doc、Image、SaaS。
- Color：紫、蓝、黑、白、红、绿。
- Reading Status：Fully Read、Skimmed、Bounced。
- Importance：Must Keep、Should Keep、Maybe、Safe。
- Topic：从信息卡聚合。
- Entity：人物、产品、公司。
- Session：自动聚类的任务上下文。

#### 8.5.5 使用方式三：浏览

当用户完全想不起关键词时，提供浏览入口：

- Sessions：按任务上下文浏览。
- Timeline：按时间轴浏览。
- By Source：按来源浏览。
- By Entity：按人物、产品、公司浏览。

#### 8.5.6 Recall 结果卡片

结果卡片分三层，避免信息过载。

| 层级 | 内容 | 默认展示 |
|---|---|---|
| 主信息层 | 缩略图、一句话总结、人话时间 | 始终展示 |
| 次信息层 | 网站图标、域名、来源 chip、状态点、Why-Tip | Hover / Focus 展示 |
| 操作层 | Reopen、Open in new window、Copy、Delete、Edit | Hover 展示 |

单卡片初次扫描不超过三个视觉重点。

#### 8.5.7 人话时间规范

| 时间距离 | 展示格式 |
|---|---|
| 今天 | Today 3pm |
| 昨天 | Yesterday 9am |
| 7 天内 | Sat 11pm |
| 7–30 天 | 3 weeks ago, Sat |
| 30 天以上 | May 24 |
| 跨年 | May 24, 2025 |

#### 8.5.8 Why-Tip

Why-Tip 帮用户判断「是不是这个」。

默认只展示事实层信息：

> 你 Sat 11pm 从 Twitter 点进来的，停留 8 分钟，滚动到 90%。

如果用户点击展开，可展示 AI 猜测：

> AI 猜测，可能不准：你打开它似乎是为了比较 SaaS 与 credit 定价。

#### 8.5.9 反问澄清

当结果过多或置信度不足时，系统反问：

> 你说的「那个关于 AI 评估」，是指：
> 1. karpathy 的 YouTube 视频
> 2. OpenReview 上那篇 paper
> 3. 你的 Notion 笔记

用户选择后，结果进一步收敛。

#### 8.5.10 同内容去重

同一内容可能以多种 URL 出现：

- arxiv / openreview / personal blog
- youtube.com / youtu.be
- medium.com / mirror site

Recall 结果默认合并为一张卡片，可展开查看所有出现位置。

#### 8.5.11 跨 Tab 任务摘要

用户可对一组 Recall 结果或某个 Session 触发摘要：

> 帮我总结这组 Tab

输出包括：

- 主题聚类。
- 关键页面。
- 用户停留最长的页面。
- 用户反复打开的页面。
- 可能缺失的信息角度。
- 建议下一步。

#### 8.5.12 个性化学习

系统会学习：

- 用户点击了哪些结果。
- 用户跳过了哪些结果。
- 用户修正了哪些信息卡。
- 用户将哪些 Tab 标记为重要。
- 用户 Restore 后是否继续使用。

个性化数据默认本地保存，并可导出。

---

### 8.6 Resurface 主动唤醒

#### 8.6.1 定义

Resurface 是系统主动把过去相关 Tab 带回用户面前的能力，解决用户「完全想不起任何关键词」的问题。

#### 8.6.2 触发场景

| 触发 | 行为 |
|---|---|
| 打开新页面且历史中存在强相关内容 | Toast 提示「你之前看过 4 篇相关内容」 |
| 当前页面与某 Session 强相关 | 提示「这是某个 Session 的延续吗？」 |
| 新建 Tab Page | 展示 Continue where you left off 推荐区 |
| 用户复制 URL 或链接 | 提示「你之前打开过这个域名的相关页面」 |

#### 8.6.3 不打扰原则

- 单日 Resurface 提示默认 ≤ 3 次。
- 同一推荐 24 小时内不重复。
- 用户连续忽略某类型推荐后自动降频。
- 用户可关闭全部 Resurface。

#### 8.6.4 成功指标

- 主动推荐点击率 ≥ 12%。
- 主动推荐关闭率 < 10%。

---

### 8.7 Graveyard

#### 8.7.1 定义

Graveyard 是已归档 Tab 的家。它不是垃圾箱，而是浏览记忆库。

#### 8.7.2 分组视图

| 视图 | 说明 |
|---|---|
| By Date | Today、Yesterday、This Week、具体日期 |
| By Session | 按任务上下文分组 |
| By Source | Twitter、Slack、Email、Search 等 |
| By Entity | 人物、产品、公司 |

#### 8.7.3 操作

对单个 Tab：

- Reopen。
- Reopen in new window。
- Copy link。
- Edit Info Card。
- Mark as Must Keep。
- Delete from Graveyard。

对整组：

- Restore group。
- Delete group。
- Search within group。
- Rename Session。

---

### 8.8 Session

#### 8.8.1 定义

Session 是系统基于时间、窗口、主题、来源和行为自动聚类出的任务上下文。

#### 8.8.2 聚类原则

- 保守优于激进。
- 宁可拆成多个小 Session，也不要错误合并。
- 低置信度时不聚类。

#### 8.8.3 展示方式

每个 Session 展示：

- 名称。
- 时间范围。
- Tab 数量。
- 缩略图预览条。
- 主要主题。
- 关键实体。
- Restore 按钮。

#### 8.8.4 命名策略

默认采用保守命名：

```text
Sat night · 14 tabs · mostly substack
```

系统可建议更自然的命名：

```text
AI Video Pricing Research
```

用户点击采纳后才成为正式 Session 名称。

#### 8.8.5 用户控制

用户可以：

- 重命名 Session。
- 拆分 Session。
- 合并 Session。
- 将某个 Tab 移出 Session。
- 将某个 Tab 加入已有 Session。

---

### 8.9 Restore

| 粒度 | 行为 |
|---|---|
| 单 Tab | 新 Tab 打开 |
| 单 Tab in Window | 新窗口打开 |
| 整组 Session | 新窗口批量打开 |
| 整天归档 | 新窗口批量打开 |
| Undo Archive | 回到原窗口、原位置 |

恢复后的 Tab 继续进入 Tab Memory，可被再次归档、再次 Recall。

---

### 8.10 跨设备与数据可携带

#### 8.10.1 免费能力

用户可免费导出 / 导入：

- Tab Memory。
- 信息卡。
- 用户修正。
- 用户规则。
- Sessions。
- Settings。

用户可在新设备或新浏览器中手动导入。

#### 8.10.2 Premium 能力

Premium 支持端到端加密的实时云同步：

- 跨设备自动同步。
- 跨浏览器自动同步。
- 冲突合并。
- 无限保留。

#### 8.10.3 用户承诺

> Tab Graveyard 永远是你的数据。你可以随时导出、迁移、清空或离开。

---

## 9. 浏览器入口与信息架构

### 9.1 入口策略

| 入口 | 策略 | 用户感知 |
|---|---|---|
| 插件图标 | 打开 Popup | 快速查看 Ghost Tabs 与 Recall |
| New Tab Page | 默认替换为 Graveyard 主页，可关闭 | 每次新建 Tab 都能 Recall 或继续上次任务 |
| Omnibox | 输入 `tg` 触发 Recall | 地址栏中快速查找 Graveyard 内容 |
| 全局快捷键 | `Cmd/Ctrl + Shift + F` 唤起 Recall | 任意页面快速找回 |
| History 快捷键 | 可选接管 | 高级用户可替代浏览器 History |

所有入口接管都必须可关闭，并在 Onboarding 中明确说明。

### 9.2 Popup

Popup 是轻量入口，包含：

```text
┌────────────────────────────────┐
│  Tab Graveyard           ⚙     │
├────────────────────────────────┤
│  Today's Recap                 │
│  昨天 23 个 Tab，最重要 X       │
├────────────────────────────────┤
│  Total 29 · Ghost 14 · Today 8 │
├────────────────────────────────┤
│  [ ⌕ Describe what you remember ]
│  Resurface: 你之前看过相关 4 个 │
├────────────────────────────────┤
│  [ Archive 14 Ghost Tabs ]     │
│  [ Open Graveyard → ]          │
└────────────────────────────────┘
```

### 9.3 New Tab Page

New Tab Page 是建立 Recall 心智的核心入口。

```text
┌────────────────────────────────────────────────┐
│  ⌕  Describe what you remember…                │
├────────────────────────────────────────────────┤
│  Continue where you left off                   │
│  [card] [card] [card]                          │
├────────────────────────────────────────────────┤
│  Active Sessions                               │
│  ▸ AI Video Pricing · 14 tabs · last active 3d │
│  ▸ Q3 Planning · 8 tabs · last active 1w       │
├────────────────────────────────────────────────┤
│  Today's Recap                                 │
│  昨天你打开了 23 个 Tab…                       │
└────────────────────────────────────────────────┘
```

### 9.4 Dashboard

Dashboard 包含三个主 Tab：

| Tab | 内容 |
|---|---|
| Recall | Smart Input、Facets、结果卡片、Timeline、Sessions、Source、Entity |
| Graveyard | 已归档 Tab 的分组浏览与恢复 |
| Leaderboard | 健康行为榜单与轻量社交分享 |

---

## 10. 排行榜

### 10.1 设计原则

排行榜用于传播和轻量社交，不应激励用户制造更多 Ghost Tabs。

因此默认榜单鼓励健康行为。

### 10.2 榜单

| 榜单 | 说明 | 默认 |
|---|---|---|
| Most Reclaimed This Week | 本周归档数 | 默认 |
| Most Restored This Week | 本周恢复数 | 体现产品价值 |
| Cleanest Browser | Ghost / Total 比例最低 | 健康浏览 |
| Hall of Ghosts | Ghost Tabs 数最多 | 自嘲榜，不作为默认 |
| Memory Keepers | 累计归档数 | 长期成就 |

### 10.3 上报原则

排行榜只上报聚合数据：

- 昵称。
- 头像。
- 浏览器类型。
- OS。
- Ghost Tabs 数。
- Total Tabs 数。
- Archived 数。
- Restored 数。

永不上报：

- URL。
- 标题。
- 浏览内容。
- 信息卡。
- 缩略图。

用户可完全关闭排行榜参与。

---

## 11. 隐私与安全

### 11.1 数据分层

| 数据 | 存储位置 | 是否上行 |
|---|---|---|
| Tab Memory | 本地 | 否 |
| 信息卡 | 本地 | 否 |
| 缩略图 | 本地 | 否 |
| 用户修正 | 本地 | 否 |
| 用户规则 | 本地 | 否 |
| 排行榜聚合数据 | 服务端 | 是，脱敏 |
| AI 增强所需首屏文本 | 调用时传输 | 是，零保留 |
| 行为埋点 | 服务端 | 是，不含内容 |

### 11.2 隐私承诺

1. 默认不上传 URL、标题、缩略图、信息卡或完整浏览内容。
2. AI 增强只处理必要的首屏可见文本。
3. 服务端不保留首屏文本。
4. 隐私模式 Tab 不记录、不增强、不截图。
5. 邮箱、银行、HR、密码管理器、账号设置等敏感域名默认黑名单。
6. 上传前自动脱敏邮箱、手机号、身份证、银行卡号等 PII。
7. 用户可一键关闭 AI 增强。
8. 用户可开启严格隐私模式，所有能力降级为本地处理。
9. 用户可一键清空所有本地数据。
10. 用户可随时导出个人数据。

### 11.3 严格隐私模式

开启后：

- 不调用任何云端 AI。
- 不上传任何页面文本。
- 只使用本地记录、标题、URL、时间、来源和用户行为信号。
- Recall 降级但仍可用。

### 11.4 信任可视化

设置页提供：

- 数据流路径图。
- AI 增强开关。
- 域名黑名单。
- 最近 30 天数据处理记录。
- 一键导出 / 清空。

---

## 12. Onboarding

### 12.1 首次启动流程

| 步骤 | 内容 |
|---|---|
| 1 | 价值介绍：关闭 Tab 不等于失去它 |
| 2 | 权限解释：每个权限为什么需要 |
| 3 | AI 增强三选一 |
| 4 | 冷启动选择：导入历史 / 使用 Demo / 从零开始 |
| 5 | Recall 演示：完成一次成功找回 |
| 6 | 入口选择：New Tab Page / Omnibox / 快捷键 |
| 7 | 排行榜昵称与头像（可跳过） |

### 12.2 AI 增强三选一

| 选项 | 推荐 | 行为 |
|---|---|---|
| 智能模式 | 推荐 | AI 增强开启，黑名单严格执行 |
| 本地优先 | 可选 | 默认本地处理，Recall 失败时提示是否启用 AI |
| 纯本地 | 可选 | 完全关闭 AI 增强 |

用户必须选择一个，不能跳过。任何时候可在设置中更改。

### 12.3 Recall 心智建立

- Onboarding 中必须完成一次 Recall 演示。
- 前 14 天 Popup 展示 Recall 使用提示。
- 用户连续切换多个 Tab 仍未找到目标时，可提示「试试 Recall」。

---

## 13. 商业化策略

### 13.1 原则

- Free 版必须保证基础体验完整。
- Premium 不应卡住基础 Recall。
- 付费点应来自复合能力、跨设备、深度个性化，而不是基础记录或基础信息卡。
- 任何付费引导都不应打断归档与找回关键路径。

### 13.2 Free 版

| 能力 | 配额 |
|---|---|
| Tab Memory 自动记录 | 无限 |
| 基础信息卡 | 无限 |
| 一键归档 + Undo | 无限 |
| Smart Input | 无限 |
| 基础 Recall | 无限 |
| Facets | 无限 |
| Why-Tip 事实层 | 无限 |
| Reading Status / Importance 基础判定 | 无限 |
| Sessions 浏览 | 无限 |
| Resurface | 无限，但有频次控制 |
| 导出 / 导入 JSON | 无限 |
| 数据保留 | 365 天 / 100K 条 |
| 复合能力调用 | 每月 5 次 |

### 13.3 Premium

建议价格：$2.99 / 月 或 $19.99 / 年。

Premium 包含：

- 无限跨 Tab 任务摘要。
- 无限反问澄清。
- 学习型重要度评估。
- Why-Tip 意图展开。
- 日历意图 Recall。
- 端到端加密跨设备同步。
- 无限保留。
- 无限记录上限。
- 个人浏览图谱全量浏览。
- 优先支持。

### 13.4 试用机制

- 首次安装赠送 14 天 Premium 全开。
- 首次 Recall 后赠送 3 次 Synthesis 试用。
- Free 用户每月可查看 1 次完整周回顾摘要。
- 试用到期不自动扣费，必须用户主动订阅。

---

## 14. 非功能需求

| 维度 | 目标 |
|---|---|
| Popup 打开 | 体感即时 |
| Dashboard 首屏 | 体感即时 |
| Recall 输入反馈 | 输入即有候选 |
| 普通 Recall | 秒级返回 |
| 自然语言拆解 | 0.5 秒内有反馈 |
| 任务摘要 | 流式呈现，避免空白等待 |
| 一键归档 1000 个 Tab | 3 秒内完成 |
| 离线 | 本地 Recall 可用，AI 增强暂停 |
| 浏览器性能 | 用户不可感知卡顿 |

---

## 15. 埋点需求

| 关注点 | 关键事件 |
|---|---|
| 安装与留存 | install、uninstall、daily_open |
| 入口使用 | popup_open、new_tab_open、omnibox_recall、shortcut_recall |
| 归档 | archive_click、archive_confirm、archive_undo、auto_archive_enable、auto_archive_disable |
| 信任阶梯 | trust_stage_enter、trust_stage_upgrade、trust_stage_downgrade |
| Recall | recall_input、cue_detected、facet_used、result_click、empty_result、clarification_triggered |
| Recall 成功 | result_opened、result_closed_within_10s、restore_after_recall |
| 信息卡 | card_generated、card_edited、smart_rule_created |
| Session | session_created、session_renamed、session_split、session_merged、session_restored |
| Resurface | resurface_shown、resurface_clicked、resurface_dismissed、resurface_disabled |
| 商业化 | premium_trial_start、premium_feature_used、paywall_shown、subscribe_click、subscribe_success |
| 隐私 | ai_mode_selected、strict_privacy_enabled、blacklist_domain_added、data_exported、data_deleted |

所有埋点不得包含 URL、标题、正文、缩略图或信息卡内容。

---

## 16. 发布计划与 Launch Gates

### 16.1 发布阶段

| 阶段 | 时间 | 目标 |
|---|---|---|
| Internal Alpha | T0 + 2w | 验证记录、一键归档、Recall MVP |
| Closed Beta | T0 + 5w | 验证信息卡、Smart Input、Why-Tip、Resurface |
| Public Beta | T0 + 8w | Web Store 上线，验证留存与隐私反馈 |
| GA | T0 + 12w | 多浏览器适配、i18n、导入导出稳定 |
| Premium Launch | T0 + 24w | Synthesis、云同步、个人浏览图谱 |

### 16.2 Launch Gates

| 阶段 | 进入下一阶段标准 |
|---|---|
| Alpha → Beta | 10 名种子中 ≥ 7 名连续使用 7 天；RSR ≥ 50%；无 P0 bug |
| Beta → Public | RSR ≥ 60%；ACI ≥ 15%；D7 ≥ 35%；卸载率 ≤ 15% |
| Public → GA | RSR ≥ 65%；ACI ≥ 20%；D7 ≥ 40%；卸载率 ≤ 10%；隐私投诉 = 0 |
| GA 后回滚 | 任一周卸载率 > 20% 或出现重大隐私事件 |

---

## 17. 优先级

### 17.1 Must Have

- 自动记录 Tab。
- 本地 Tab Memory。
- 基础信息卡。
- Ghost Tab 判定。
- 一键归档。
- Undo。
- 单 Tab / Session 恢复。
- Recall Smart Input。
- Recall 基础 Facets：Time、Source、Type。
- Recall 结果卡片。
- Why-Tip 事实层。
- Sessions 浏览。
- New Tab Page。
- Popup。
- Daily Recap。
- Resurface MVP。
- Onboarding。
- AI 增强三选一。
- 严格隐私模式。
- 中英双语。

### 17.2 Should Have

- 信息卡增强：实体、阅读状态、重要度。
- Facets 扩展：Color、Reading Status、Importance、Topic、Entity。
- Timeline / Source / Entity 浏览。
- 同内容去重。
- 信息卡轻量修正与规则化修正。
- Session 拆分、合并、重命名。
- 自动归档信任阶梯完整版本。
- Omnibox Recall。
- 全局快捷键 Recall。
- 导出 / 导入 JSON。
- 排行榜。

### 17.3 Could Have

- 跨 Tab 任务摘要。
- 反问澄清。
- 浏览器 History 合并 Recall。
- 自定义 Tag。
- 数据流路径图。
- 我的数据日志。
- 日历意图 Recall。

### 17.4 Won't Have

- Firefox / Safari。
- 团队协作。
- 完整网页存档。
- 企业管理后台。
- 公开分享用户具体 Tab 内容。

---

## 18. 风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| 用户担心 AI 读取页面 | 高 | AI 三选一、严格隐私模式、黑名单、数据流可视化 |
| Recall 不够准 | 高 | 信息卡、用户修正、多 cue、反馈闭环 |
| 用户想不起来用 Recall | 高 | New Tab Page、Omnibox、快捷键、Onboarding 演示 |
| 自动归档误伤 | 高 | 信任阶梯、预演、预告、Undo、Must Keep |
| Resurface 打扰用户 | 中 | 频次限制、忽略降频、可关闭 |
| Session 聚错 | 中 | 保守聚类、预览条、拆分合并、用户命名优先 |
| 信息卡质量不稳定 | 中 | 用户可修正、原始版本保留、规则覆盖 |
| 排行榜诱导囤积 Tab | 中 | 默认健康榜单，Ghost 榜自嘲化 |
| 浏览器平台限制 | 中 | 关键数据本地持久化，跨浏览器可导入导出 |
| Premium 转化不足 | 中 | 14 天试用、周回顾、Synthesis 试用 |
| 被浏览器内置能力替代 | 高 | 跨浏览器中立、数据可携带、个性化沉淀、隐私可信度 |

---

## 19. 待决策问题

| # | 问题 | 建议方向 | 负责人 |
|---|---|---|---|
| Q1 | Premium 定价选择 $2.99 还是 $4.99 | 先用 $2.99 降低试用转化摩擦 | 商业化 |
| Q2 | Color Facet 是否进入首发 | 若设计成本可控，建议进入 P1 | 产品 / 设计 |
| Q3 | New Tab Page 是否默认接管 | 建议默认接管，但 Onboarding 明确说明且可关闭 | 产品 |
| Q4 | Resurface 默认频次 | 建议每天最多 3 次 | 产品 / 数据 |
| Q5 | 周回顾是否默认推送 | 建议只在有高质量内容时展示，不强制每日 | 产品 / 设计 |
| Q6 | 跨设备云同步何时上线 | Premium Launch，上线前先提供导入导出 | 产品 / 工程 |
| Q7 | 数据流可视化做内置 UI 还是文档 | 建议内置最小版 + 外链完整说明 | 法务 / 设计 |
| Q8 | 是否探索虚拟归档 | 放入下一阶段研究，不进入首发 | 产品 |

---

## 20. 术语表

| 术语 | 定义 |
|---|---|
| Tab Memory | 系统记录的个人浏览标签记忆库 |
| Ghost Tab | 长时间未激活且可归档的 Tab |
| Archived Tab | 已从浏览器关闭但保留在 Graveyard 中的 Tab |
| Restored Tab | 从 Graveyard 或 Recall 中重新打开的 Tab |
| Graveyard | 已归档 Tab 的浏览与恢复界面 |
| Tab Recall | 按记忆碎片找回 Tab 的能力 |
| Cue | 用户记得的任意碎片，如时间、来源、主题、颜色 |
| Info Card | 系统为每个 Tab 生成的可搜索、可识别信息集合 |
| Session | 一组有共同任务上下文的 Tab |
| Resurface | 系统主动唤醒过去相关 Tab 的能力 |
| Why-Tip | 帮用户判断某张卡片是否为目标的一行说明 |
| Synthesis | 跨 Tab 任务摘要 |
| ACI | Archive Confidence Index，衡量用户是否敢开启自动归档 |
| RSR | Recall Success Rate，衡量 Recall 是否找得到、找得对 |
| Trust Ladder | 自动归档的渐进式信任建立机制 |

---

## 21. 文案库

| 场景 | 中文 | English |
|---|---|---|
| Hero | 关闭标签页，不再等于失去它们。 | Closing tabs no longer means losing them. |
| Recall Placeholder | 描述你记得的：时间、来源、颜色、主题… | Describe what you remember: time, source, color, topic… |
| 一键归档 | 安全归档 14 个幽灵标签 | Archive 14 Ghost Tabs |
| 归档保留 | 已为你保留 2 个可能重要的标签 | Kept 2 tabs that look important to you |
| 归档成功 | 已归档 14 个标签 · 撤销 | 14 tabs archived · Undo |
| Recall 空结果 | 没找到。试试少填一个线索，或从 Sessions 逛逛。 | Nothing found. Try fewer cues, or browse Sessions. |
| Why-Tip 事实层 | 你 {time} 从 {source} 点进来的，停留 {duration}，滚到 {scroll}。 | Opened on {time} from {source}, stayed {duration}, scrolled to {scroll}. |
| Why-Tip 意图层 | AI 猜测，可能不准：你打开它似乎是为了 {intent}。 | AI guess, may be wrong: you seemed to open it for {intent}. |
| Resurface | 你 3 周前看过 4 篇相关内容，要打开吗？ | You looked at 4 related pages 3 weeks ago. Open them? |
| Daily Recap | 昨天你打开了 23 个 Tab，最重要的是 X。 | You opened 23 tabs yesterday. The most important: X. |
| 自动归档预告 | 明天将归档 14 个 Tab，你可以现在检查或豁免。 | 14 tabs will be archived tomorrow. Review or exempt now? |
| AI 关闭 | AI 增强已关闭。Recall 仅使用本地能力。 | AI enhancement is off. Recall uses local capabilities only. |
| 严格隐私模式 | 严格隐私模式已开启。所有处理在本地完成。 | Strict Privacy is on. All processing is local. |
| Synthesis CTA | 帮我总结这组 Tab | Summarize these tabs |
| Synthesis 数据不足 | 还没有足够相关 Tab 来摘要，再多看几篇试试。 | Not enough related tabs yet. Look at a few more. |
| Hall of Ghosts | 上榜不光荣，但很真实。 | Not a flex. But honest. |

---

> End of Document.
