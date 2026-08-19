/**
 * 配置常量文件
 * 定义游戏金额、轮次配置、常量等
 * 说明：本项目改为普通脚本(classic script)加载，跨文件通过全局词法作用域共享，
 * 因此移除了 export 关键字；所有 const/function 均为全局可见。
 */

// ========================================
// 26个箱子金额（美版标准）
// ========================================
const CASE_VALUES = [
    0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
    1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000
];

// 低值/高值分界索引（前13个为低值，后13个为高值）
const LOW_VALUE_COUNT = 13;
const HIGH_VALUE_START_INDEX = 13;

// ========================================
// 轮次配置：每轮需要开启的箱子数量
// ========================================
const ROUND_CONFIG = [
    { round: 1, boxesToOpen: 6, label: '第 1 轮' },
    { round: 2, boxesToOpen: 5, label: '第 2 轮' },
    { round: 3, boxesToOpen: 4, label: '第 3 轮' },
    { round: 4, boxesToOpen: 3, label: '第 4 轮' },
    { round: 5, boxesToOpen: 2, label: '第 5 轮' },
    { round: 6, boxesToOpen: 1, label: '第 6 轮' },
    { round: 7, boxesToOpen: 1, label: '第 7 轮' },
    { round: 8, boxesToOpen: 1, label: '第 8 轮' },
    { round: 9, boxesToOpen: 1, label: '第 9 轮' }
];

// 总轮次数
const TOTAL_ROUNDS = ROUND_CONFIG.length;

// ========================================
// 银行家报价算法参数
// ========================================
const BANKER_CONFIG = {
    // 各阶段基础报价百分比范围（相对于期望值）
    // 早期轮次 (1-3): 15%-35%
    early: { min: 0.15, max: 0.35 },
    // 中期轮次 (4-6): 40%-65%
    mid: { min: 0.40, max: 0.65 },
    // 后期轮次 (7-9): 70%-92%
    late: { min: 0.70, max: 0.92 },

    // 随机波动范围 ±5%~±12%
    volatility: { min: 0.05, max: 0.12 },

    // 诱饵报价触发条件：连续拒绝次数
    baitTriggerRejects: 3,
    // 诱饵报价额外加成
    baitBonus: { min: 0.05, max: 0.15 },

    // 报价取整规则：小额(<$1000)取整到$1，大额取整到$100
    roundingThreshold: 1000,
    roundingSmall: 1,
    roundingLarge: 100
};

// ========================================
// 节奏 / 等待时间配置（毫秒）
// 集中管理"开箱 -> 银行家来电"这条链路上的所有等待，方便统一调节手感
// ========================================
const TIMING = {
    // 本轮最后一个箱子开完 -> 触发银行家来电的间隔
    roundCompleteToBankerCall: 250,

    // 银行家"思考"时间（随机区间）：保留一点悬念，但不再让玩家干等
    bankerThinkMin: 350,
    bankerThinkMax: 700,

    // 报价弹窗出现后电话铃声动画播放时长（不阻塞按钮，纯装饰）
    bankerRingDuration: 900
};

// ========================================
// 游戏阶段枚举
// ========================================
const GAME_PHASE = {
    SELECTING_PLAYER_CASE: 'selecting_player_case',  // 选择自己的箱子
    OPENING_CASES: 'opening_cases',                  // 开箱阶段
    BANKER_OFFER: 'banker_offer',                    // 银行家报价阶段
    SWITCH_CASE: 'switch_case',                      // 交换箱子阶段
    GAME_OVER: 'game_over'                           // 游戏结束
};

// ========================================
// 箱子状态枚举
// ========================================
const CASE_STATE = {
    UNOPENED: 'unopened',
    PLAYER: 'player',
    OPENED: 'opened'
};

// ========================================
// 本地存储键名
// ========================================
const STORAGE_KEYS = {
    THEME: 'don_theme_preference',
    GAME_STATS: 'don_game_stats'
};

// ========================================
// 格式化工具函数
// ========================================

/**
 * 格式化金额为美元字符串
 * @param {number} value - 金额数值
 * @returns {string} 格式化后的字符串，如 "$1,000,000" 或 "$0.01"
 */
function formatCurrency(value) {
    if (value < 1) {
        return '$' + value.toFixed(2);
    }
    return '$' + value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * 判断是否为高值金额
 * @param {number} value - 金额数值
 * @returns {boolean}
 */
function isHighValue(value) {
    return value >= 1000;
}

/**
 * 获取金额对应的CSS类名
 * @param {number} value - 金额数值
 * @returns {string} 'low' 或 'high'
 */
function getValueClass(value) {
    return isHighValue(value) ? 'high' : 'low';
}

/**
 * 打乱数组（Fisher-Yates算法）
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * 生成箱子编号数组 (1-26)
 * @returns {number[]}
 */
function generateCaseNumbers() {
    return Array.from({ length: 26 }, (_, i) => i + 1);
}



/**
 * 根据金额获取显示用的简短标签
 * @param {number} value
 * @returns {string}
 */
function getValueLabel(value) {
    if (value >= 1000000) return '$1M';
    if (value >= 1000) return '$' + (value / 1000) + 'K';
    if (value === 0.01) return '1¢';
    return '$' + value;
}
