/**
 * 游戏状态管理
 * 负责维护游戏全局状态、剩余箱子、当前轮次、已开金额、历史报价等
 */

// 说明：本项目使用普通脚本加载，CASE_VALUES / ROUND_CONFIG / TOTAL_ROUNDS /
// GAME_PHASE / CASE_STATE / STORAGE_KEYS / shuffleArray 等均由 config.js
// 以全局常量形式提供，此处不再使用 import。

// ========================================
// 状态对象
// ========================================
const state = {
    // 游戏阶段
    phase: GAME_PHASE.SELECTING_PLAYER_CASE,

    // 箱子分配：编号 -> 金额
    caseAssignments: new Map(),

    // 玩家选择的箱子编号
    playerCaseNumber: null,

    // 玩家箱子中的金额
    playerCaseValue: null,

    // 剩余未开启的箱子编号（选箱前为全部 26；selectPlayerCase 后剔除玩家箱，变为 25 个可开箱）
    remainingCases: [],

    // 已开启的箱子：编号 -> 金额
    openedCases: new Map(),

    // 剩余金额（未开启的箱子金额 + 玩家箱子金额）
    remainingValues: [],

    // 当前轮次索引 (0-based)
    currentRoundIndex: 0,

    // 当前轮次已开启数量
    openedThisRound: 0,

    // 当前轮次需要开启的数量
    boxesToOpenThisRound: ROUND_CONFIG[0].boxesToOpen,

    // 银行家历史报价
    offerHistory: [],

    // 当前银行家报价
    currentOffer: 0,

    // 连续拒绝次数
    consecutiveRejects: 0,

    // 讨价还价（还价）是否已使用（整局仅一次）
    haggleUsed: false,

    // 最后剩下的另一个箱子编号（Switch Case阶段）
    otherCaseNumber: null,

    // 最后剩下的另一个箱子金额
    otherCaseValue: null,

    // 玩家最终决定：'deal' | 'banker-accepted' | 'no-deal' | 'switch' | 'keep'
    finalDecision: null,

    // 玩家最终获得金额
    finalWinnings: 0,

    // 游戏是否结束
    isGameOver: false,

    // 统计数据
    stats: {
        gamesPlayed: 0,
        gamesWon: 0,        // 获得金额 > 期望值
        totalWinnings: 0,
        bestWin: 0
    }
};

// ========================================
// 状态管理器
// ========================================
const StateManager = {
    /**
     * 获取完整状态快照（用于调试）
     */
    /**
     * 获取状态快照（浅拷贝）。
     * 注意：返回对象中的 Map/Array 字段（caseAssignments、openedCases、remainingValues 等）
     * 与原 state 共享同一引用，因此对其读取是“实时”的；而 phase / openedThisRound /
     * boxesToOpenThisRound 等数值字段是调用时刻的快照。需要最新数值时请重新调用 getState()
     * 或改用 StateManager 提供的方法（如 isRoundComplete()），切勿持有旧快照读取可变数值字段。
     * @returns {object} 状态对象的浅拷贝
     */
    getState() {
        return { ...state };
    },

    /**
     * 直接修改游戏阶段（getState 返回的是浅拷贝，不能用副本来改阶段）
     * @param {string} phase
     */
    setPhase(phase) {
        state.phase = phase;
    },

    /**
     * 标记"讨价还价"是否已使用（整局仅一次）
     * getState 返回的是浅拷贝，必须用本方法才能真正改写
     * @param {boolean} value
     */
    setHaggleUsed(value) {
        state.haggleUsed = value;
    },

    /**
     * 重置游戏状态
     */
    reset() {
        // 重置所有状态
        state.phase = GAME_PHASE.SELECTING_PLAYER_CASE;
        state.caseAssignments.clear();
        state.playerCaseNumber = null;
        state.playerCaseValue = null;
        state.remainingCases = [];
        state.openedCases.clear();
        state.remainingValues = [...CASE_VALUES];
        state.currentRoundIndex = 0;
        state.openedThisRound = 0;
        state.boxesToOpenThisRound = ROUND_CONFIG[0].boxesToOpen;
        state.offerHistory = [];
        state.currentOffer = 0;
        state.consecutiveRejects = 0;
        state.haggleUsed = false;
        state.otherCaseNumber = null;
        state.otherCaseValue = null;
        state.finalDecision = null;
        state.finalWinnings = 0;
        state.isGameOver = false;

        // 从本地存储加载统计数据
        this.loadStats();
    },

    /**
     * 初始化箱子分配（随机打乱金额分配给1-26号箱子）
     */
    initializeCases() {
        const shuffledValues = shuffleArray([...CASE_VALUES]);
        const numbers = Array.from({ length: 26 }, (_, i) => i + 1);

        state.caseAssignments.clear();
        numbers.forEach((num, index) => {
            state.caseAssignments.set(num, shuffledValues[index]);
        });

        state.remainingCases = numbers;
        state.remainingValues = [...CASE_VALUES];
    },

    /**
     * 玩家选择自己的箱子
     * @param {number} caseNumber - 箱子编号
     */
    selectPlayerCase(caseNumber) {
        if (!state.remainingCases.includes(caseNumber)) return false;

        state.playerCaseNumber = caseNumber;
        state.playerCaseValue = state.caseAssignments.get(caseNumber);

        // 从“可开箱列表”中移除玩家自己的箱子（开箱阶段不能再点它）
        state.remainingCases = state.remainingCases.filter(n => n !== caseNumber);
        // 注意：remainingValues 故意保留玩家箱子金额！
        // 期望值 = 所有“未开箱金额（含玩家自己的箱子）”的平均值，
        // 这才是你箱子当前真实的平均可能价值。只有真正开箱时才从 remainingValues 移除对应金额。

        // 进入开箱阶段
        state.phase = GAME_PHASE.OPENING_CASES;
        state.currentRoundIndex = 0;
        state.openedThisRound = 0;
        state.boxesToOpenThisRound = ROUND_CONFIG[0].boxesToOpen;

        return true;
    },

    /**
     * 开启一个箱子
     * @param {number} caseNumber - 箱子编号
     * @returns {object|null} 结果 { caseNumber, value, isHighValue } 或 null(无效操作)
     */
    openCase(caseNumber) {
        // 验证：必须在开箱阶段、箱子未开启、不是玩家箱子、当前轮次未完成
        if (state.phase !== GAME_PHASE.OPENING_CASES) return null;
        if (!state.remainingCases.includes(caseNumber)) return null;
        if (state.openedThisRound >= state.boxesToOpenThisRound) return null;

        const value = state.caseAssignments.get(caseNumber);

        // 更新状态
        state.remainingCases = state.remainingCases.filter(n => n !== caseNumber);
        state.openedCases.set(caseNumber, value);
        state.remainingValues = state.remainingValues.filter(v => v !== value);
        state.openedThisRound++;

        return {
            caseNumber,
            value,
            isHighValue: value >= 1000
        };
    },

    /**
     * 检查当前轮次是否完成
     */
    isRoundComplete() {
        return state.openedThisRound >= state.boxesToOpenThisRound;
    },

    /**
     * 进入下一轮次或银行家报价阶段
     * @returns {boolean} 是否进入报价阶段
     */
    advanceRound() {
        if (!this.isRoundComplete()) return false;

        state.currentRoundIndex++;

        // 检查是否所有轮次完成（进入Switch Case阶段）
        if (state.currentRoundIndex >= TOTAL_ROUNDS) {
            this.enterSwitchCase();
            return false;
        }

        // 进入下一轮开箱阶段（银行家报价由 triggerBankerOffer 单独触发）
        state.phase = GAME_PHASE.OPENING_CASES;
        state.openedThisRound = 0;
        state.boxesToOpenThisRound = ROUND_CONFIG[state.currentRoundIndex].boxesToOpen;
        return true;
    },

    /**
     * 进入Switch Case阶段
     */
    enterSwitchCase() {
        state.phase = GAME_PHASE.SWITCH_CASE;
        // 此时应该只剩1个箱子
        state.otherCaseNumber = state.remainingCases[0];
        state.otherCaseValue = state.caseAssignments.get(state.otherCaseNumber);
    },

    /**
     * 设置银行家报价
     * @param {number} offer - 报价金额
     */
    setBankerOffer(offer) {
        state.currentOffer = offer;
        state.offerHistory.push({
            round: state.currentRoundIndex + 1,
            offer,
            remainingValues: [...state.remainingValues],
            expectedValue: this.calculateExpectedValue()
        });
    },

    /**
     * 直接更新当前报价（用于还价被接受时），并同步修正最近一条报价历史，
     * 避免重复 push 一条同轮记录（bug #9）。
     */
    setCurrentOffer(offer) {
        state.currentOffer = offer;
        const last = state.offerHistory[state.offerHistory.length - 1];
        if (last) last.offer = offer;
    },

    /**
     * 玩家接受报价
     */
    acceptDeal() {
        state.finalDecision = 'deal';
        state.finalWinnings = state.currentOffer;
        // 捕获决策时刻的期望值（用于统计判定：是否战胜期望值）
        state.decisionExpectedValue = this.calculateExpectedValue();
        state.isGameOver = true;
        state.phase = GAME_PHASE.GAME_OVER;
        this.updateStats();
    },

    /**
     * 银行家接受玩家的还价（讨价还价成交）。
     * 与 acceptDeal 的区别：最终决定记为 'banker-accepted'，
     * 结算页据此显示“银行家接受了报价”而非“你接受了报价”（修复还价成交文案）。
     * 金额取当前报价（还价被接受时已通过 setCurrentOffer 更新为成交价）。
     */
    acceptHaggle() {
        state.finalDecision = 'banker-accepted';
        state.finalWinnings = state.currentOffer;
        state.decisionExpectedValue = this.calculateExpectedValue();
        state.isGameOver = true;
        state.phase = GAME_PHASE.GAME_OVER;
        this.updateStats();
    },

    /**
     * 玩家拒绝报价
     */
    rejectDeal() {
        state.consecutiveRejects++;

        // 拒绝报价后进入下一轮开箱，或在最后一轮后进入交换阶段。
        // advanceRound() 会自增 currentRoundIndex 并据此设置阶段与本轮需开箱数量。
        this.advanceRound();
    },

    /**
     * 递减连续拒绝次数。
     * 用于“还价被银行家拒绝”这类场景：玩家只是结束了一次讨价还价，
     * 并未真正拒绝银行家的报价（其原报价已作废、玩家只是继续游戏），
     * 因此不应计入 consecutiveRejects，否则会让“诱饵报价”触发条件
     * （baitTriggerRejects = 3）比设计意图更早满足。
     */
    decrementConsecutiveRejects() {
        if (state.consecutiveRejects > 0) state.consecutiveRejects--;
    },

    /**
     * 玩家选择保留原箱子
     */
    keepCase() {
        state.finalDecision = 'keep';
        state.finalWinnings = state.playerCaseValue;
        // 捕获决策时刻的期望值（Switch Case 阶段，此时 remainingValues 仅含最后两箱，
        // 决策时刻的 EV = 两箱平均值，这才是玩家做决策时的真实参考线）
        state.decisionExpectedValue = this.calculateExpectedValue();
        state.isGameOver = true;
        state.phase = GAME_PHASE.GAME_OVER;
        this.updateStats();
    },

    /**
     * 玩家选择交换箱子
     */
    switchCase() {
        state.finalDecision = 'switch';
        state.finalWinnings = state.otherCaseValue;
        // 交换显示用的值
        const temp = state.playerCaseValue;
        state.playerCaseValue = state.otherCaseValue;
        state.otherCaseValue = temp;
        // 捕获决策时刻的期望值（同上）
        state.decisionExpectedValue = this.calculateExpectedValue();
        state.isGameOver = true;
        state.phase = GAME_PHASE.GAME_OVER;
        this.updateStats();
    },

    /**
     * 计算当前剩余金额的期望值
     */
    calculateExpectedValue() {
        if (state.remainingValues.length === 0) return 0;
        const sum = state.remainingValues.reduce((acc, val) => acc + val, 0);
        return sum / state.remainingValues.length;
    },

    /**
     * 获取当前轮次信息
     */
    getCurrentRoundInfo() {
        if (state.currentRoundIndex >= TOTAL_ROUNDS) {
            return { round: TOTAL_ROUNDS, label: '最终轮', boxesToOpen: 0 };
        }
        return ROUND_CONFIG[state.currentRoundIndex];
    },

    /**
     * 获取剩余金额列表（用于显示）
     */
    getRemainingValues() {
        return [...state.remainingValues].sort((a, b) => a - b);
    },

    /**
     * 获取已开启金额列表
     */
    getOpenedValues() {
        return Array.from(state.openedCases.values()).sort((a, b) => a - b);
    },

    /**
     * 检查金额是否已开启
     */
    isValueOpened(value) {
        return Array.from(state.openedCases.values()).includes(value);
    },

    /**
     * 更新统计数据
     */
    updateStats() {
        state.stats.gamesPlayed++;
        state.stats.totalWinnings += state.finalWinnings;
        if (state.finalWinnings > state.stats.bestWin) {
            state.stats.bestWin = state.finalWinnings;
        }
        // 使用决策时刻捕获的期望值（state.decisionExpectedValue），而非游戏结束时的剩余值
        // 修复: Keep/Switch 时剩余值仅剩两箱，此时 EV 失去决策参考意义
        const expectedValue = (state.decisionExpectedValue !== undefined && state.decisionExpectedValue !== null)
            ? state.decisionExpectedValue
            : this.calculateExpectedValue();
        if (state.finalWinnings > expectedValue) {
            state.stats.gamesWon++;
        }
        // 清理临时字段
        state.decisionExpectedValue = null;
        this.saveStats();
    },

    /**
     * 保存统计到localStorage
     */
    saveStats() {
        try {
            localStorage.setItem(STORAGE_KEYS.GAME_STATS, JSON.stringify(state.stats));
        } catch (e) {
            console.warn('无法保存统计数据:', e);
        }
    },

    /**
     * 从localStorage加载统计
     */
    loadStats() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATS);
            if (saved) {
                state.stats = { ...state.stats, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('无法加载统计数据:', e);
        }
    },

    /**
     * 获取统计数据
     */
    getStats() {
        return { ...state.stats };
    },

    /**
     * 获取当前阶段
     */
    getPhase() {
        return state.phase;
    },

    /**
     * 获取玩家箱子信息
     */
    getPlayerCase() {
        return {
            number: state.playerCaseNumber,
            value: state.playerCaseValue
        };
    },

    /**
     * 获取另一个箱子信息（Switch Case用）
     */
    getOtherCase() {
        return {
            number: state.otherCaseNumber,
            value: state.otherCaseValue
        };
    },

    /**
     * 获取游戏结果摘要
     */
    getResultSummary() {
        const expectedValue = this.calculateExpectedValue();
        const playerCaseValue = state.playerCaseValue;
        const otherCaseValue = state.otherCaseValue;

        return {
            finalWinnings: state.finalWinnings,
            playerCaseValue,
            otherCaseValue,
            expectedValue,
            decision: state.finalDecision,
            offerHistory: state.offerHistory,
            isDeal: state.finalDecision === 'deal' || state.finalDecision === 'banker-accepted',
            beatExpected: state.finalWinnings > expectedValue
        };
    }
};

// 初始化时加载统计
StateManager.loadStats();