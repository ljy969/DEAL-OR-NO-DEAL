/**
 * 银行家报价算法
 * 实现非线性百分比 + 随机波动 + 诱饵报价机制
 */

// 说明：BANKER_CONFIG / ROUND_CONFIG / TOTAL_ROUNDS 由 config.js 全局提供，
// StateManager 由 state.js 全局提供，此处不再使用 import。

/**
 * 计算银行家报价
 * @returns {number} 报价金额（已取整）
 */
function calculateBankerOffer() {
    const state = StateManager.getState();

    // 获取剩余金额的期望值
    const expectedValue = StateManager.calculateExpectedValue();

    // 根据当前轮次确定基础百分比范围
    const roundNumber = state.currentRoundIndex + 1; // 1-based
    let baseMinPercent, baseMaxPercent;

    if (roundNumber <= 3) {
        // 早期轮次 (1-3): 15%-35%
        baseMinPercent = BANKER_CONFIG.early.min;
        baseMaxPercent = BANKER_CONFIG.early.max;
    } else if (roundNumber <= 6) {
        // 中期轮次 (4-6): 40%-65%
        baseMinPercent = BANKER_CONFIG.mid.min;
        baseMaxPercent = BANKER_CONFIG.mid.max;
    } else {
        // 后期轮次 (7-9): 70%-92%
        baseMinPercent = BANKER_CONFIG.late.min;
        baseMaxPercent = BANKER_CONFIG.late.max;
    }

    // 在范围内随机选择基础百分比
    // 使用偏向中间的分布（三角分布）
    const basePercent = triangularRandom(baseMinPercent, baseMaxPercent, (baseMinPercent + baseMaxPercent) / 2);

    // 计算基础报价
    let offer = expectedValue * basePercent;

    // 应用随机波动 ±5%~±12%
    const volatility = randomInRange(BANKER_CONFIG.volatility.min, BANKER_CONFIG.volatility.max);
    const volatilityDirection = Math.random() < 0.5 ? -1 : 1;
    offer *= (1 + volatilityDirection * volatility);

    // 诱饵报价检查：连续拒绝多次后，有概率给出高于预期的报价
    if (state.consecutiveRejects >= BANKER_CONFIG.baitTriggerRejects) {
        const baitChance = 0.3; // 30% 概率触发诱饵
        if (Math.random() < baitChance) {
            const baitBonus = randomInRange(BANKER_CONFIG.baitBonus.min, BANKER_CONFIG.baitBonus.max);
            offer *= (1 + baitBonus);
            console.log('[Banker] 诱饵报价触发！额外加成:', (baitBonus * 100).toFixed(1) + '%');
        }
    }

    // 特殊情况：如果剩余金额全是低值，银行家可能稍微慷慨一点
    const remainingValues = state.remainingValues;
    const highValueCount = remainingValues.filter(v => v >= 1000).length;
    const totalRemaining = remainingValues.length;

    if (highValueCount === 0 && totalRemaining > 0) {
        // 全是低值时，报价比例上调 10%-20%
        offer *= 1 + randomInRange(0.10, 0.20);
    }

    // 如果只剩最高奖 $1,000,000 和极低值，银行家可能压价更狠
    const hasMillion = remainingValues.includes(1000000);
    const hasOnlyLowBesidesMillion = hasMillion &&
        remainingValues.filter(v => v !== 1000000).every(v => v < 1000);

    if (hasOnlyLowBesidesMillion) {
        // "百万孤注一掷"情况，银行家报价更保守
        offer *= 0.85;
    }

    // 确保报价不超过剩余最大值（合理性保护）
    const maxRemaining = Math.max(...remainingValues);
    if (offer > maxRemaining) {
        offer = maxRemaining * 0.95;
    }

    // 确保报价不低于剩余最小值
    const minRemaining = Math.min(...remainingValues);
    if (offer < minRemaining) {
        offer = minRemaining;
    }

    // 取整处理
    offer = roundOffer(offer);

    console.log(`[Banker] 第${roundNumber}轮报价计算:`, {
        expectedValue: expectedValue.toFixed(2),
        basePercent: (basePercent * 100).toFixed(1) + '%',
        volatility: (volatilityDirection * volatility * 100).toFixed(1) + '%',
        consecutiveRejects: state.consecutiveRejects,
        finalOffer: offer
    });

    return offer;
}

/**
 * 三角分布随机数生成（偏向众数）
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {number} mode - 众数（最可能的值）
 * @returns {number}
 */
function triangularRandom(min, max, mode) {
    const u = Math.random();
    const f = (mode - min) / (max - min);

    if (u < f) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

/**
 * 在范围内生成均匀分布随机数
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * 报价取整规则
 * - 小额 (< $1,000): 取整到 $1
 * - 大额 (>= $1,000): 取整到 $100
 * @param {number} amount
 * @returns {number}
 */
function roundOffer(amount) {
    if (amount < BANKER_CONFIG.roundingThreshold) {
        return Math.round(amount / BANKER_CONFIG.roundingSmall) * BANKER_CONFIG.roundingSmall;
    } else {
        return Math.round(amount / BANKER_CONFIG.roundingLarge) * BANKER_CONFIG.roundingLarge;
    }
}

/**
 * 模拟银行家"思考"延迟
 * 等待时长由 config.js 的 TIMING.bankerThinkMin / bankerThinkMax 控制，
 * 保留少量悬念即可，过长的空白等待会让玩家觉得游戏卡住。
 * @returns {Promise<number>} 报价金额
 */
async function generateBankerOfferWithDrama() {
    const minThink = (typeof TIMING !== 'undefined' && TIMING.bankerThinkMin != null)
        ? TIMING.bankerThinkMin : 350;
    const maxThink = (typeof TIMING !== 'undefined' && TIMING.bankerThinkMax != null)
        ? TIMING.bankerThinkMax : 700;

    const thinkTime = minThink + Math.random() * Math.max(0, maxThink - minThink);
    await new Promise(resolve => setTimeout(resolve, thinkTime));

    return calculateBankerOffer();
}

/**
 * 获取报价的文本描述（用于剧情展示）
 * @param {number} offer
 * @param {number} expectedValue
 * @returns {string}
 */
function getOfferCommentary(offer, expectedValue) {
    const ratio = offer / expectedValue;
    const roundNumber = StateManager.getState().currentRoundIndex + 1;

    // 评论文案取自 i18n 字典（银行家评论为字符串数组），随语言切换自动适配
    const pick = (key) => {
        const pool = t(key);
        return pool[Math.floor(Math.random() * pool.length)];
    };

    // 判断是否为诱饵报价
    const state = StateManager.getState();
    const isBait = state.consecutiveRejects >= BANKER_CONFIG.baitTriggerRejects &&
        offer > expectedValue * 0.9;

    if (isBait) {
        return pick('banker.comments.bait');
    }

    if (ratio < 0.4) {
        return pick('banker.comments.low');
    } else if (ratio < 0.75) {
        return pick('banker.comments.fair');
    } else {
        return pick('banker.comments.high');
    }
}

/**
 * 格式化报价用于显示（带动画用的字符串）
 * @param {number} offer
 * @returns {string}
 */
function formatOfferForDisplay(offer) {
    if (offer >= 1000000) {
        return '$' + (offer / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (offer >= 1000) {
        return '$' + (offer / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return '$' + offer.toLocaleString();
}

// 处理玩家"讨价还价"（还价）请求：银行家心里有围绕期望值浮动的最高接受价（ceiling），
// 玩家还价 <= ceiling 则接受，否则拒绝（维持原报价）。整局仅一次的限制由 StateManager.haggleUsed 控制。
function resolveHaggle(counter, originalOffer, expectedValue) {
    // 银行家心理最高价：围绕期望值波动（不同轮次/局间随机）
    const ceiling = expectedValue * randomInRange(0.85, 1.15);
    const accepted = counter <= ceiling;
    return {
        accepted,
        finalOffer: accepted ? Math.round(counter) : originalOffer,
        ceiling
    };
}