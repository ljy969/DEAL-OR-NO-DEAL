# Deal or No Deal —— 美版经典游戏

这是一个完全客户端运行的《Deal or No Deal》（一掷千金 / 交换密码）美版经典电视
游戏的高还原复刻版，使用纯 HTML、CSS 和 JavaScript 编写。**无需构建、没有任何
第三方依赖**——直接用浏览器打开 index.html（包括通过 file:// 协议）即可开始游玩。

>  **语言 / Language:** 中文 | [English](README.md)

## 目录

- [项目简介](#项目简介)
- [主要功能](#主要功能)
- [玩法说明](#玩法说明)
- [运行方式](#运行方式)
- [项目结构](#项目结构)
- [架构与工作原理](#架构与工作原理)
- [主题切换](#主题切换)
- [国际化（i18n）](#国际化i18n)
- [音效](#音效)
- [无障碍支持](#无障碍支持)
- [数据持久化](#数据持久化)
- [自定义配置](#自定义配置)
- [浏览器兼容性](#浏览器兼容性)
- [调试接口](#调试接口)

## 项目简介

在《Deal or No Deal》中，玩家面对 **26 个密封箱子**，每个箱子装着 26 个固定
奖金中的一个，金额从 **$0.01 到 $1,000,000**（美版标准奖金阶梯）。其中一个箱子
会被随机分配给玩家并一直保密。每一轮玩家要打开若干个其余的箱子，揭开里面的
金额并将其从游戏中移除。每轮结束后，**银行家（Banker）**会打来电话，出一个现金
价格收购玩家的箱子。玩家必须选择 **DEAL（成交）** 或 **NO DEAL（不成交，继续）**。
目标是在游戏结束时，让最终收益超过自己箱子当前的**期望值（EV）**。

本项目高度还原了节目的悬念感，具备以下特性：

- 分阶段、非线性的“银行家 AI”（含诱饵报价与多种边界情况处理）。
- 整局限一次的**讨价还价（Haggle）**还价小机制。
- 实时的**期望值**展示，并附带通俗易懂的文字解释。
- 精致的动画 UI（3D 翻箱、选箱“飞入”动画、电话铃动效、火花特效、弹窗过渡）。
- 完整的**浅色 / 深色 / 跟随系统**主题，以及**中文 / English / 跟随系统**语言
  切换。
- 屏幕阅读器与键盘支持，并适配“减少动画（prefers-reduced-motion）”与
  “高对比度（prefers-contrast）”偏好。

## 主要功能

- **核心玩法：** 26 个箱子、9 个回合（每轮依次打开 6/5/4/3/2/1/1/1/1 个箱子），
  每轮银行家出价，最后进行“交换箱子”终局决策。
- **银行家 AI：** 按阶段给出基于期望值的百分比报价，采用三角分布随机、±5%~±12%
  波动，连续拒绝 3 次后可能触发诱饵报价，并对“全低值”“百万孤注一掷”等特殊牌面
  做专门处理。
- **讨价还价：** 整局一次还价机会；只有当还价不超过银行家隐藏上限（期望值
  ×0.85~1.15）时才会被接受。提供“+10% / +25% / +50%”快捷按钮。
- **期望值：** 每次银行家报价旁都会显示期望值，并配有白话解释，普通玩家也能判断
  “这个报价划不划算”。
- **主题：** 浅色、深色、跟随系统，持久化保存，并响应操作系统配色。
- **国际化：** 中文、英文、跟随系统；所有界面文案、银行家评语以及动态文本均本地化。
- **动画：** 3D 翻箱、选箱飞入、电话铃、报价数字滚动、结算揭晓、玩家箱子发光、交换
  动画、火花；在“减少动画”偏好下自动降级。
- **音效：** 使用 Web Audio API 实时合成（铃声 / 开箱 / 成交）音效，无需任何音频文件。
- **无障碍：** ARIA 角色与标签、键盘导航、可见焦点环、减少动画与高对比度支持。
- **持久化：** 主题、语言、以及累计游戏统计均保存在 localStorage。
- **响应式：** 流式网格可自适应平板与手机布局；附带打印样式。
- **零依赖：** 纯静态文件；以经典 script 标签按依赖顺序加载，因此可直接以 file://
  打开。

## 玩法说明

1. **选择你的箱子。** 点击 26 个箱子中的任意一个，将其设为“你的箱子”，其金额在
   整局游戏中保持隐藏。
2. **开箱。** 每轮你要打开若干个“其他”箱子。被揭开的金额会从两侧的奖金面板上
   消失（并划掉）。
3. **银行家来电。** 每轮结束后，银行家会展示一个报价以及你箱子的*期望值*。此时
   你需要决定：
   - **DEAL（成交）**——接受报价，游戏结束。
   - **NO DEAL（不成交）**——拒绝并进入下一轮。
   - **讨价还价（整局一次）**——还一个你期望的金额；银行家可能接受（游戏结束），
     也可能拒绝（此时你只能选择 NO DEAL）。
4. **最后两个箱子。** 9 轮结束后，场上只剩你的箱子和另一个箱子。你可以选择
   **保留原箱子**或**与另一个箱子交换**。
5. **揭晓。** 你的箱子（以及另一个箱子）会被翻转打开，最终收益与期望值进行比较
   （“你战胜了期望值！”）。

> **小贴士：** 报价*高于*所显示的期望值，从统计上就是“赚到了”。银行家计算期望值时，
> 基于的是**所有尚未打开的箱子（包括你自己的箱子）**的平均值。

## 运行方式

无需安装、无需构建。

    # 方式 A：直接打开文件
    open index.html              # macOS
    xdg-open index.html          # Linux
    start index.html             # Windows

    # 方式 B：用任意静态服务器托管
    python3 -m http.server 8000  # 然后访问 http://localhost:8000

由于项目使用的是经典脚本（非 ES Module），通过 file:// 直接打开也能完美运行，
静态服务器并非必需。

## 项目结构

    Deal Or No Deal/
    ├── index.html            # 全部标记：顶部控制区、游戏棋盘、各类弹窗
    ├── css/
    │   ├── variables.css     # 设计令牌 + 浅色/深色主题变量
    │   ├── base.css          # 重置样式、工具类、按钮、弹窗、还价 UI
    │   ├── layout.css        # 游戏布局、面板、箱子、弹窗、响应式、打印
    │   └── animations.css    # 关键帧与动效（翻箱、铃声、揭晓、飞行等）
    └── js/
        ├── i18n.js           # 翻译字典 + t() 取词 + 语言解析
        ├── config.js         # 常量：奖金、回合、银行家参数、工具函数
        ├── state.js          # 全局游戏状态 + StateManager 接口
        ├── banker.js         # 报价计算、悬念延迟、评语、还价逻辑
        ├── ui.js             # DOM 渲染、动画、事件绑定、音效
        └── main.js           # GameController：流程编排与输入处理

脚本在 index.html 底部**按依赖顺序**加载：i18n -> config -> state -> banker ->
ui -> main。各文件之间通过全局作用域的 const/function 通信（不使用 import/export），
这正是它能以 file:// 直接打开的原因。

## 架构与工作原理

本项目遵循清晰的**关注点分离**原则：

- **config.js**——纯数据与无状态工具函数（不操作 DOM、不保存状态）。
- **state.js**——唯一的真相来源：一个普通的 state 对象，外加 StateManager 门面。
  UI 与控制器都只通过它来读写状态。
- **banker.js**——报价与还价的纯游戏逻辑；读取 StateManager。
- **ui.js**——所有 DOM 渲染、动画、事件绑定与音效。
- **main.js**——GameController，负责把“事件 → 状态 → UI”串联起来，并驱动
  回合 / 报价 / 终局的完整流程。

这样设计使游戏逻辑确定且易于推理；唯一的副作用集中在 ui.js（DOM/音频）与
state.js（localStorage 统计）中。

### 游戏状态模型

state 对象（位于 state.js）跟踪以下字段：

| 字段 | 含义 |
| --- | --- |
| phase | selecting_player_case -> opening_cases -> banker_offer -> switch_case -> game_over |
| caseAssignments | Map<箱子编号, 金额> —— 隐藏的奖金分布 |
| playerCaseNumber / playerCaseValue | 玩家所选（仍保密）的箱子 |
| remainingCases | 尚未打开的箱子（不含玩家自己的箱子） |
| openedCases | Map<箱子编号, 金额> —— 已揭开的箱子 |
| remainingValues | **所有**未打开的金额，**包含玩家自己的箱子**（用于计算 EV） |
| currentRoundIndex | 基于 0 的回合计数 |
| openedThisRound / boxesToOpenThisRound | 本轮进度 |
| offerHistory / currentOffer | 银行家报价追踪 |
| consecutiveRejects | 驱动诱饵报价逻辑 |
| haggleUsed | 确保还价整局仅一次 |
| otherCaseNumber / otherCaseValue | 终局剩下一个的“对手箱子” |
| finalDecision / finalWinnings / isGameOver | 最终结果 |
| stats | 累计统计 { gamesPlayed, gamesWon, totalWinnings, bestWin } |

> **关于期望值的要点：** remainingValues 在玩家的箱子真正被打开之前，会刻意保留
> 该箱子的金额。因此期望值等于*所有*未打开箱子金额的平均值——这才是正确的
> “此刻我的箱子平均大概值多少钱”的数字。

### 回合 / 游戏流程

    选择箱子 --> 开箱（按 ROUND_CONFIG） --> 银行家报价
                                                    |
                             +----------------------+
                             v                      v
                         （NO DEAL）            （DEAL）
                             |                      |
              是否为最后一轮？--否--> 下一轮         +--> 游戏结束（揭晓）
                             |
                           是
                             v
              交换箱子（保留 / 交换） --> 游戏结束（揭晓）

各回合依次打开 **6、5、4、3、2、1、1、1、1** 个其他箱子（共 25 个），最终只留下
玩家的箱子与恰好另一个箱子，进入“交换箱子”终局。

### 期望值

    calculateExpectedValue() = sum(remainingValues) / remainingValues.length

该值会在每次银行家报价旁以及最终结算中显示，并附带一段白话解释（键名 ev.explainer），
帮助玩家理解这条“参考线”。

### 银行家报价算法

实现位于 banker.js 的 calculateBankerOffer()：

1. 计算所有剩余箱子的**期望值（EV）**。
2. 根据**阶段**选取基础百分比：
   - 早期回合（1-3）：期望值的 **15%~35%**
   - 中期回合（4-6）：期望值的 **40%~65%**
   - 后期回合（7-9）：期望值的 **70%~92%**
3. 用**三角分布**在该区间取百分比（众数落在阶段中点，因此“典型”报价更可能出现，
   极端值较少）。
4. 施加 **±5%~±12%** 方向的随机**波动**。
5. **诱饵报价：** 在连续拒绝 **3 次及以上**后，有 30% 概率银行家会额外加上
   **+5%~+15%** 的“甜头”来引诱玩家成交。
6. **针对牌面的微调：**
   - 若剩余全为低值，报价整体上调 **+10%~+20%**。
   - 若唯一剩下的高值是 **$1,000,000** 且其余全部低于 $1,000（“百万孤注一掷”），
     报价会被压低至 **85%**。
7. **合理性保护：** 报价上限不超过剩余最大值的 95%，下限不低于剩余最小值。
8. **取整规则：** 低于 $1,000 的金额取整到 $1；达到或超过 $1,000 则取整到 $100。

报价随后通过 generateBankerOfferWithDrama() 交付，该函数会插入一段短暂的
“银行家思考中”延迟（可在 TIMING 中配置）后再返回结果。

### 讨价还价（还价）机制

整局中玩家可以有一次机会向银行家还价：

    resolveHaggle(counter, originalOffer, expectedValue):
        ceiling = expectedValue * random(0.85, 1.15)   // 银行家心中的最高接受价
        accepted = counter <= ceiling

- **接受**——还价金额成为最终报价，游戏以 DEAL 结束。
- **拒绝**——原报价作废，游戏被强制按 NO DEAL 继续（玩家不再有第二次还价机会）。

“+10% / +25% / +50%”快捷按钮可自动按当前报价的对应比例填入输入框。

### 交换箱子终局

当只剩两个箱子时，界面会同时展示两者。玩家选择**保留**或**交换**。内部实现中，
keepCase() 支付玩家自己箱子的金额；而 switchCase() 会交换显示值并支付*另一个*
箱子的金额（finalWinnings = otherCaseValue）。随后会以戏剧性的翻箱动画揭开
玩家（新）箱子里的真实金额。

## 主题切换

- 通过右上角的 🌙/☀️/🖥️ 按钮切换。选项为：**浅色**、**深色**、**跟随系统**
  （通过 prefers-color-scheme 跟随操作系统）。
- 当前偏好保存在 localStorage 的 don_theme_preference 键下。
- 所有颜色都是 css/variables.css 中的 CSS 自定义属性；切换主题只是改变 html
  元素上的 data-theme 属性。

## 国际化（i18n）

- 通过右上角的 中/EN/🌐 按钮切换。选项为：**中文**、**English**、**跟随系统**
  （读取 navigator.language；以 en 开头视为英文，其余视为中文）。
- 偏好保存在 localStorage 的 don_lang_preference 键下。
- i18n.js 中以扁平的点号键名（例如 round.current、banker.comments.low）维护
  两种语言的字典。applyStaticI18n() 会替换带有 data-i18n 标记的元素的文本
  （以及通过 data-i18n-attr 指定的属性），而 UI.applyI18n() 会刷新动态区域
  （回合信息、结算弹窗）。
- 银行家随机评语池同样做了本地化。

## 音效

音效在运行时通过 **Web Audio API** 实时合成（ui.js 中的
playSound('ring' | 'open' | 'deal')），**不需要任何音频文件**。AudioContext 会在
玩家首次交互时创建，以满足浏览器的自动播放策略。

## 无障碍支持

- 箱子带有 role="button"、tabindex="0" 以及本地化的 aria-label。
- 键盘操作：**方向键**在未打开的箱子间移动焦点；**Enter / 空格**开箱；
  **D** = DEAL、**N** = NO DEAL（报价期间）；**Esc** 关闭银行家 / 交换弹窗
  （默认等同于 NO DEAL / 保留）。
- 可见的 :focus-visible 焦点环；prefers-reduced-motion 会关闭非必要动画；
  prefers-contrast: high 会加强边框。
- 弹窗使用 role="dialog"、aria-modal 以及带标签的标题。

## 数据持久化

| 键名 | 内容 |
| --- | --- |
| don_theme_preference | 'light' | 'dark' | 'system' |
| don_lang_preference | 'zh' | 'en' | 'system' |
| don_game_stats | 累计统计 JSON（gamesPlayed、gamesWon、totalWinnings、bestWin） |

统计会在每局结束后由 StateManager.updateStats() 累加，并在刷新后保留。

## 自定义配置

几乎所有可调项都集中在 **js/config.js**：

- **CASE_VALUES**——26 个奖金金额。想保留完整棋盘请保持长度为 26，也可以整体替换
  奖金阶梯。LOW_VALUE_COUNT（13）将两侧奖金面板划分为“低值 / 高值”两半。
- **ROUND_CONFIG**——每轮 boxesToOpen。各轮之和应为 25，以便终局恰好剩下一个
  非玩家箱子。TOTAL_ROUNDS 会根据该数组自动推导。
- **BANKER_CONFIG**——各阶段百分比区间（early/mid/late）、波动幅度、
  baitTriggerRejects（默认 3）与 baitBonus，以及取整阈值。
- **TIMING**——节奏相关毫秒数：开箱到银行家来电的间隔、“思考”延迟
  （bankerThinkMin/Max）、以及装饰性铃声时长。
- 工具函数：formatCurrency、isHighValue、getValueClass、shuffleArray
  （Fisher-Yates 洗牌）、generateCaseNumbers、getValueLabel。

主题配色、按钮颜色、布局尺寸等都是 css/variables.css 中的 CSS 变量，无需改动 JS
即可重新换肤。

## 浏览器兼容性

- 支持 CSS 自定义属性、aspect-ratio、backdrop-filter 与 Web Audio API 的现代
  浏览器（Chrome、Edge、Firefox、Safari 等主流版本）。
- 可从 file:// 直接运行（无 Module / CORS 问题），也可部署到任意静态托管。

## 调试接口

为方便开发，页面在全局暴露了 window.DealOrNoDeal，可直接访问核心对象：

    window.DealOrNoDeal.StateManager   // 状态门面
    window.DealOrNoDeal.GameController // 流程控制器
    window.DealOrNoDeal.UI             // 渲染 / 动画辅助

打开浏览器控制台即可查看 StateManager.getState()、手动构造报价，或以编程方式
逐步推进游戏。

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
