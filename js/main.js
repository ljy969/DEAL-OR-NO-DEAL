/**
 * 主入口文件
 * 初始化、主流程控制、Switch Case逻辑、游戏结束处理
 *
 * 说明：本项目使用普通脚本(classic script)加载。StateManager 由 state.js 全局提供，
 * generateBankerOfferWithDrama 由 banker.js 全局提供，UI 由 ui.js 全局提供，
 * 因此此处不再使用 import。各脚本在 index.html 中按依赖顺序引入即可。
 */

// ========================================
// 游戏控制器
// ========================================
const GameController = {
    // 选箱飞行动画进行中的锁，防止动画期间误操作
    selectingAnimating: false,

    /**
     * 初始化游戏
     */
    async init() {
        // 对局代次：用于让挂起的异步流程在重置时失效（bug #6）
        this.generation = (this.generation || 0) + 1;
        // 决策锁：防止同一笔决策被重复/重入触发（修复 Bug A / Bug B）
        this.decisionLock = false;

        // 初始化主题（需先于 bindEvents，避免主题切换依赖的元素未就绪）
        this.initTheme();

        // 绑定事件（内部会确保元素已缓存）
        UI.bindEvents({
            onCaseClick: this.handleCaseClick.bind(this),
            onDeal: this.handleDeal.bind(this),
            onNoDeal: this.handleNoDeal.bind(this),
            onKeep: this.handleKeep.bind(this),
            onSwitch: this.handleSwitch.bind(this),
            onRestart: this.handleRestart.bind(this),
            onThemeToggle: this.handleThemeToggle.bind(this),
            onThemeSelect: this.handleThemeSelect.bind(this),
            onThemeClose: this.handleThemeClose.bind(this),
            onLangToggle: this.handleLangToggle.bind(this),
            onLangSelect: this.handleLangSelect.bind(this),
            onLangClose: this.handleLangClose.bind(this),
            onHaggle: this.handleHaggle.bind(this),
            onHaggleSubmit: this.handleHaggleSubmit.bind(this),
            onHaggleCancel: this.handleHaggleCancel.bind(this)
        });

        // 初始化语言（需先于首次渲染，默认跟随系统语言）
        this.initLanguage();

        // 重置游戏状态
        StateManager.reset();
        StateManager.initializeCases();

        // 重置 UI
        UI.resetUI();

        console.log('🎮 Deal or No Deal - 游戏初始化完成');
        console.log('📦 箱子分配:', Array.from(StateManager.getState().caseAssignments.entries()));
    },

    /**
     * 初始化主题（从 localStorage 或系统偏好）
     */
    initTheme() {
        // 已保存偏好可为 'light' | 'dark' | 'system'（无则视为跟随系统）
        const saved = localStorage.getItem('don_theme_preference');
        this.applyTheme(saved);

        // 仅当选择“跟随系统”时才随系统变化切换
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const pref = localStorage.getItem('don_theme_preference');
            if (pref === 'system' || pref === null) {
                this.applyTheme('system');
            }
        });
    },

    /**
     * 应用主题偏好（'light' | 'dark' | 'system' | null）
     */
    applyTheme(pref) {
        const effective = this.resolveTheme(pref);
        document.documentElement.setAttribute('data-theme', effective);
        UI.updateThemeIcon(effective);
        this.updateThemeUI(pref, effective);
    },

    /**
     * 解析实际生效主题：system 跟随系统，其它直接用偏好
     */
    resolveTheme(pref) {
        if (pref === 'light' || pref === 'dark') return pref;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    /**
     * 更新切换按钮图标与菜单选中态
     */
    updateThemeUI(pref, effective) {
        const normalized = (pref === null) ? 'system' : pref;
        const iconEl = document.getElementById('theme-current-icon');
        if (iconEl) {
            iconEl.textContent = (normalized === 'system') ? '🖥️' : (effective === 'dark' ? '🌙' : '☀️');
        }
        const menu = document.getElementById('theme-menu');
        if (menu) {
            menu.querySelectorAll('[data-theme-value]').forEach((li) => {
                li.classList.toggle('is-active', li.getAttribute('data-theme-value') === normalized);
            });
        }
    },

    /**
     * 展开/收起主题菜单（点击按钮触发）
     */
    handleThemeToggle() {
        const menu = document.getElementById('theme-menu');
        const btn = document.getElementById('theme-toggle');
        if (!menu || !btn) return;
        const willOpen = menu.hasAttribute('hidden');
        if (willOpen) {
            menu.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
        } else {
            menu.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * 关闭主题菜单
     */
    handleThemeClose() {
        const menu = document.getElementById('theme-menu');
        const btn = document.getElementById('theme-toggle');
        if (menu && !menu.hasAttribute('hidden')) {
            menu.setAttribute('hidden', '');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * 选择具体主题（light / dark / system）并保存偏好
     */
    handleThemeSelect(value) {
        localStorage.setItem('don_theme_preference', value);
        this.applyTheme(value);
        this.handleThemeClose();
    },

    // ========================================
    // 语言切换（中文 / English / 跟随系统），默认跟随系统语言
    // ========================================

    /**
     * 初始化语言：读取偏好（默认跟随系统）并应用
     */
    initLanguage() {
        const saved = localStorage.getItem(LANG_STORAGE_KEY);
        this.applyLanguage(saved);
    },

    /**
     * 应用语言偏好（'zh' | 'en' | 'system' | null）
     */
    applyLanguage(pref) {
        const effective = resolveLanguage(pref);
        document.documentElement.setAttribute('lang', effective);
        // 静态文案（data-i18n 标注处）统一替换
        applyStaticI18n();
        // 动态文案（轮次信息 / 结算弹窗等）刷新
        if (typeof UI !== 'undefined' && UI.applyI18n) UI.applyI18n();
        this.updateLanguageUI(pref, effective);
    },

    /**
     * 更新语言按钮图标与菜单选中态
     */
    updateLanguageUI(pref, effective) {
        const normalized = (pref === null) ? 'system' : pref;
        const iconEl = document.getElementById('lang-current-icon');
        if (iconEl) {
            iconEl.textContent = normalized === 'system' ? '🌐' : (effective === 'en' ? 'EN' : '中');
        }
        const menu = document.getElementById('lang-menu');
        if (menu) {
            menu.querySelectorAll('[data-lang-value]').forEach((li) => {
                li.classList.toggle('is-active', li.getAttribute('data-lang-value') === normalized);
            });
        }
    },

    /**
     * 展开/收起语言菜单（点击按钮触发）
     */
    handleLangToggle() {
        const menu = document.getElementById('lang-menu');
        const btn = document.getElementById('lang-toggle');
        if (!menu || !btn) return;
        const willOpen = menu.hasAttribute('hidden');
        if (willOpen) {
            menu.removeAttribute('hidden');
            btn.setAttribute('aria-expanded', 'true');
        } else {
            menu.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * 关闭语言菜单
     */
    handleLangClose() {
        const menu = document.getElementById('lang-menu');
        const btn = document.getElementById('lang-toggle');
        if (menu && !menu.hasAttribute('hidden')) {
            menu.setAttribute('hidden', '');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    },

    /**
     * 选择具体语言（zh / en / system）并保存偏好
     */
    handleLangSelect(value) {
        localStorage.setItem(LANG_STORAGE_KEY, value);
        this.applyLanguage(value);
        this.handleLangClose();
    },

    /**
     * 处理箱子点击
     * @param {number} caseNumber
     */
    async handleCaseClick(caseNumber) {
        const state = StateManager.getState();

        // 选箱飞行动画进行中，忽略其他点击，避免中途误操作
        if (this.selectingAnimating) return;

        // 阶段 1：选择玩家自己的箱子
        if (state.phase === GAME_PHASE.SELECTING_PLAYER_CASE) {
            const success = StateManager.selectPlayerCase(caseNumber);
            if (success) {
                UI.playSound('open');
                // 修复：selectPlayerCase 后需要重新获取状态以得到 playerCaseValue
                const newState = StateManager.getState();
                this.selectingAnimating = true;
                await UI.animatePlayerCaseSelection(caseNumber, newState.playerCaseValue);
                this.selectingAnimating = false;
                UI.renderMoneyPanels(); // 更新金额面板（玩家箱子金额标记）
            }
            return;
        }

        // 阶段 2：开箱阶段
        if (state.phase === GAME_PHASE.OPENING_CASES) {
            // 不能点击玩家自己的箱子，也不能点击已开启的箱子
            if (caseNumber === state.playerCaseNumber) return;
            if (state.openedCases.has(caseNumber)) return;
            if (state.openedThisRound >= state.boxesToOpenThisRound) return;

            // 执行开箱
            const result = StateManager.openCase(caseNumber);
            if (!result) return;

            // 播放开箱音效
            UI.playSound('open');

            // 触发翻转动画
            await UI.animateCaseOpen(caseNumber, result.value);

            // 高亮金额面板对应金额
            UI.highlightMoneyValue(result.value);

            // 更新轮次进度
            UI.updateRoundInfo();

            // 检查轮次是否完成
            if (StateManager.isRoundComplete()) {
                // 短暂延迟后进入银行家报价（间隔见 config.js 的 TIMING）
                const gap = (typeof TIMING !== 'undefined' && TIMING.roundCompleteToBankerCall != null)
                    ? TIMING.roundCompleteToBankerCall : 250;
                // 修复 Bug C：捕获 generation，避免本轮结束→报价间隙内的“重新开始”让定时器
                // 把报价作用到全新对局（对局代次防护前移）
                const gen = this.generation;
                setTimeout(() => { if (gen === this.generation) this.triggerBankerOffer(); }, gap);
            }
        }
    },

    /**
     * 触发银行家报价
     */
    async triggerBankerOffer() {
        const gen = this.generation;
        const state = StateManager.getState();

        // 计算报价（带戏剧性延迟）
        const offer = await generateBankerOfferWithDrama();
        // 若在此期间玩家点了“再来一局”，本轮报价作废，避免作用到新对局
        if (gen !== this.generation) return;

        // 保存报价到状态
        StateManager.setBankerOffer(offer);

        // 先启用按钮：弹窗一出现玩家就能决策，不必再等铃声动画播完
        UI.setButtonDisabled('btn-deal', false);
        UI.setButtonDisabled('btn-no-deal', false);

        // 显示报价弹窗
        await UI.showBankerOffer(offer);

        // 更新阶段（getState 返回浅拷贝，必须用 StateManager.setPhase 才能真正改写）
        StateManager.setPhase(GAME_PHASE.BANKER_OFFER);
        // 解锁决策：新报价已出现，允许玩家作出 DEAL / NO DEAL（修复 Bug B）
        this.decisionLock = false;
    },

    /**
     * 决策锁：同一笔决策（DEAL / NO DEAL / 保留 / 交换）只允许进入一次，
     * 防止快速双击、Esc 在弹窗关闭窗口期重入、以及还价结算延时窗口内误触
     * 导致重复结算或轮次错乱（修复 Bug A / Bug B）。
     * @returns {boolean} 是否允许继续处理本次决策
     */
    _canDecide() {
        if (StateManager.getState().isGameOver) return false;
        if (this.decisionLock) return false;
        this.decisionLock = true;
        return true;
    },

    /**
     * 处理接受报价
     */
    async handleDeal() {
        if (!this._canDecide()) return;
        // 捕获对局代次：下面显示结算的延时回调在重开后必须作废（修复 BUG-1）
        const gen = this.generation;
        UI.playSound('deal');
        UI.setButtonDisabled('btn-deal', true);
        UI.setButtonDisabled('btn-no-deal', true);
        // 决策后一并禁用还价按钮，避免过渡窗内还价被受理（修复 BUG-A）
        UI.setButtonDisabled('btn-haggle', true);

        StateManager.acceptDeal();
        UI.hideBankerOffer();

        // 接受报价后的后续：翻转打开自己的箱子，揭晓里面到底是多少钱
        const playerCase = StateManager.getPlayerCase();
        await UI.animatePlayerCaseOpen(playerCase.value);

        // 短暂延迟后显示结果（重开后此回调作废，避免弹出"幽灵结算窗"）
        setTimeout(() => {
            if (gen !== this.generation) return;
            UI.showResult();
        }, 600);
    },

    /**
     * 处理拒绝报价
     */
    async handleNoDeal() {
        if (!this._canDecide()) return;
        UI.playSound('open');
        UI.setButtonDisabled('btn-deal', true);
        UI.setButtonDisabled('btn-no-deal', true);
        // 决策后一并禁用还价按钮（修复 BUG-A）
        UI.setButtonDisabled('btn-haggle', true);

        StateManager.rejectDeal();

        // 检查是否进入 Switch Case
        const newState = StateManager.getState();
        // 进入交换阶段时复用背景遮罩（keepBackdrop=true），避免遮罩先隐后显的闪烁（修复 4.4）
        UI.hideBankerOffer(newState.phase === GAME_PHASE.SWITCH_CASE);

        if (newState.phase === GAME_PHASE.SWITCH_CASE) {
            // 刷新轮次信息为“最终轮”，避免仍停留在上一轮开箱提示（修复 4.6）
            UI.updateRoundInfo();
            // 解锁决策：进入交换阶段，允许玩家选择“保留 / 交换”（修复 Bug A / Bug B）。
            // 但决策锁必须延迟到交换弹窗真正出现时才释放——否则在银行家弹窗仍可见的
            // 250ms 过渡期内，ESC 会绕过按钮 disabled 检查而重入 handleNoDeal，导致
            // consecutiveRejects 被重复累加、enterSwitchCase 被二次执行（修复 BUG-2）。
            // 同时该延时回调需受对局代次保护，重开时作废（修复 BUG-1）。
            const gen = this.generation;
            setTimeout(() => {
                if (gen !== this.generation) return;
                this.decisionLock = false;
                UI.showSwitchCase();
            }, 500);
        } else {
            // 进入下一轮开箱：显式复位决策锁并重新启用按钮，
            // 消除对 triggerBankerOffer 重新解锁的隐式依赖，更健壮（修复 4.2）
            this.decisionLock = false;
            UI.setButtonDisabled('btn-deal', false);
            UI.setButtonDisabled('btn-no-deal', false);
            // 下一轮报价将由 updateHaggleUI 按 haggleUsed 重新显隐；此处复位 disabled（修复 BUG-A）
            UI.setButtonDisabled('btn-haggle', false);
            UI.updateRoundInfo();
            UI.renderCasesGrid(); // 更新箱子状态
            UI.renderMoneyPanels(); // 更新金额面板
        }
    },

    /**
     * 处理点击"讨价还价"按钮：展开还价输入面板
     * 整局仅能使用一次，由 state.haggleUsed 控制
     */
    async handleHaggle() {
        const state = StateManager.getState();
        if (state.haggleUsed) return;
        // 仅当处于银行家报价阶段且未锁定决策时才允许展开还价（修复 BUG-A）
        if (state.phase !== GAME_PHASE.BANKER_OFFER || this.decisionLock) return;
        UI.showHagglePanel();
    },

    /**
     * 处理取消还价
     */
    async handleHaggleCancel() {
        UI.hideHagglePanel();
    },

    /**
     * 处理提交还价：银行家可能接受或拒绝，整局仅此一次
     */
    async handleHaggleSubmit() {
        const state = StateManager.getState();
        if (state.haggleUsed) return;
        // 阶段/决策锁/已结束守卫：禁止在报价已作废或已决策后受理还价（修复 BUG-A）
        if (state.phase !== GAME_PHASE.BANKER_OFFER || state.isGameOver || this.decisionLock) return;
        const gen = this.generation;

        const counter = Number(UI.getHaggleInputValue());
        if (!isFinite(counter) || counter <= 0) {
            UI.showHaggleResult(t('banker.haggle.invalid'), false);
            return;
        }

        const originalOffer = state.currentOffer;
        const expectedValue = StateManager.calculateExpectedValue();
        const decision = resolveHaggle(counter, originalOffer, expectedValue);

        // 整局仅一次：无论接受或拒绝，机会都用掉了（必须用 setHaggleUsed 改写真实状态）
        StateManager.setHaggleUsed(true);
        UI.hideHagglePanel();
        UI.updateHaggleUI();

        if (decision.accepted) {
            // 直接更新当前报价（并修正最近一条报价历史），避免重复 push 同轮记录（bug #9）
            StateManager.setCurrentOffer(decision.finalOffer);
            UI.setOfferDisplay(decision.finalOffer);
            UI.playSound('deal');
            UI.showHaggleResult(t('banker.haggle.accepted', { amount: formatCurrency(decision.finalOffer) }), true);
            // 还价被接受后强制结束游戏（自动成交，禁用两个按钮并走 DEAL 流程）
            UI.setButtonDisabled('btn-deal', true);
            UI.setButtonDisabled('btn-no-deal', true);
            // 还价被接受即成交，禁用还价按钮（修复 BUG-A）
            UI.setButtonDisabled('btn-haggle', true);
            // 锁定决策：阻止 900ms 结算窗口内 Esc 等误触再次触发 NO DEAL（修复 Bug B）
            this.decisionLock = true;
            setTimeout(() => { if (gen === this.generation) { this.decisionLock = false; this.handleDeal(); } }, 900);
        } else {
            UI.showHaggleResult(t('banker.haggle.rejected', { amount: formatCurrency(originalOffer) }), false);
            // 银行家拒绝还价后，原报价作废，自动强制继续游戏（禁用两按钮并走 NO DEAL 流程，无需玩家点击）
            UI.setButtonDisabled('btn-deal', true);
            UI.setButtonDisabled('btn-no-deal', true);
            // 锁定决策：阻止 900ms 结算窗口内 Esc 等误触再次触发决策（修复 Bug B）
            this.decisionLock = true;
            setTimeout(() => {
                if (gen !== this.generation) return;
                // 还价被拒 = 玩家并未接受报价、选择继续游戏，这本身是对当档银行家报价的
                // 一次真实拒绝，应正常计入 consecutiveRejects（由 handleNoDeal→rejectDeal 完成）。
                // 注意：切勿再调用 decrementConsecutiveRejects()，否则真实拒绝会被抵消、
                // 诱饵报价触发条件（baitTriggerRejects=3）被推迟一轮（修复 BUG-B 回归）。
                this.decisionLock = false;
                this.handleNoDeal();
            }, 900);
        }
    },

    /**
     * 处理保留原箱子
     */
    async handleKeep() {
        if (!this._canDecide()) return;
        // 捕获对局代次：下面显示结算的延时回调在重开后必须作废（修复 BUG-1）
        const gen = this.generation;
        UI.playSound('deal');
        StateManager.keepCase();
        UI.hideSwitchCase();

        // 保留原箱子后，翻转打开自己的箱子
        await UI.animatePlayerCaseOpen(StateManager.getPlayerCase().value);

        // 短暂延迟后显示结果（重开后此回调作废，避免弹出“幽灵结算窗”）
        setTimeout(() => {
            if (gen !== this.generation) return;
            UI.showResult();
        }, 600);
    },

    /**
     * 处理交换箱子
     */
    async handleSwitch() {
        if (!this._canDecide()) return;
        // 捕获对局代次：下面显示结算的延时回调在重开后必须作废（修复 BUG-1）
        const gen = this.generation;
        UI.playSound('deal');
        StateManager.switchCase();
        UI.hideSwitchCase();

        // 显示交换动画
        const playerCaseEl = document.querySelector('.switch-case--player .switch-case__box');
        const otherCaseEl = document.querySelector('.switch-case--other .switch-case__box');

        if (playerCaseEl && otherCaseEl) {
            playerCaseEl.classList.add('switch-case__box--swapping');
            otherCaseEl.classList.add('switch-case__box--swapping');

            await new Promise(resolve => setTimeout(resolve, 600));

            playerCaseEl.classList.remove('switch-case__box--swapping');
            otherCaseEl.classList.remove('switch-case__box--swapping');
        }

        // 更新显示的箱子编号（交换后）
        const playerCase = StateManager.getPlayerCase();
        const otherCase = StateManager.getOtherCase();
        document.getElementById('switch-player-case-num').textContent = playerCase.number;
        document.getElementById('switch-other-case-num').textContent = otherCase.number;

        // 交换后，翻转打开现在属于自己的箱子（即原另一个箱子内的金额）
        await UI.animatePlayerCaseOpen(playerCase.value);

        // 短暂延迟后显示结果（重开后此回调作废，避免弹出“幽灵结算窗”）
        setTimeout(() => {
            if (gen !== this.generation) return;
            UI.showResult();
        }, 600);
    },

    /**
     * 处理重新开始
     */
    handleRestart() {
        // 递增对局代次，使任何挂起的异步流程（银行家报价、还价延迟等）作废
        this.generation = (this.generation || 0) + 1;
        this.decisionLock = false;
        UI.hideResult();

        // 完全重置并重新开始
        this.selectingAnimating = false;
        StateManager.reset();
        StateManager.initializeCases();
        UI.resetUI();

        console.log('🔄 新游戏开始');
    }
};

// ========================================
// 启动游戏
// ========================================
// 修复：ES 模块可能在 DOMContentLoaded 后执行，需检查 readyState
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GameController.init();
    });
} else {
    // DOM 已就绪，直接初始化
    GameController.init();
}

// 导出供调试用
window.DealOrNoDeal = {
    StateManager,
    GameController,
    UI
};

console.log('🎯 Deal or No Deal 模块加载完成');
console.log('💡 调试对象可通过 window.DealOrNoDeal 访问');