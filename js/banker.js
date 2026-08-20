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
let _lastBaitApplied = false;
function calculateBankerOffer() {
    _lastBaitApplied = false;
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
            _lastBaitApplied = true;
            console.log('[Banker] 诱饵报价触发！额外加成:', (baitBonus * 100).toFixed(1) + '%');
        }
    }

    // 特殊情况：如果剩余金额全是低值，银行家可能稍微慷慨一点
    const remainingValues = state.remainingValues;
    const highValueCount = remainingValues.filter(v => v >= 1000).length;
    const totalRemaining = remainingValues.length;
    // 注：实际加成在下方“钳制之后”再叠加（见 BUG-4 修复），避免被 0.95*maxRemaining 钳制悄悄抵消

    // 如果只剩最高奖 $1,000,000 和极低值，银行家可能压价更狠
    const hasMillion = remainingValues.includes(1000000);
    const hasOnlyLowBesidesMillion = hasMillion &&
        remainingValues.filter(v => v !== 1000000).every(v => v < 1000);

    if (hasOnlyLowBesidesMillion) {
        // "百万孤注一掷"情况，银行家报价更保守
        offer *= 0.85;
    }

    // 先取整，再钳制（避免"先钳到最小值再取整"把 $0.01 这类小额归零为 $0）
    offer = roundOffer(offer);

    // 合理性保护：报价不应高于剩余最大值、也不应低于剩余最小值
    const maxRemaining = Math.max(...remainingValues);
    const minRemaining = Math.min(...remainingValues);
    if (offer > maxRemaining) {
        offer = roundOffer(maxRemaining * 0.95);
    }
    if (offer < minRemaining) {
        offer = roundOffer(minRemaining);
    }

    // 最终兜底：任何情况下报价都应为正数（至少保留到分，且不低于剩余最小值）
    if (!isFinite(offer) || offer <= 0) {
        offer = roundOffer(minRemaining);
    }

    // 全低值盘“更慷慨”加成（修复 BUG-4）：前面的钳制会把报价压到 0.95*maxRemaining，
    // 若在此之前直接 ×(1+10%~20%) 会被该钳制悄悄抵消。故在钳制结果上叠加加成，
    // 并以上限不超过剩余最大值本身为界，确保善意加成真正生效。
    if (highValueCount === 0 && totalRemaining > 0) {
        offer = Math.min(maxRemaining, roundOffer(offer * (1 + randomInRange(0.10, 0.20))));
    }

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
    if (amount < 1) {
        // 小额（含分）：保留两位小数字段，避免 $0.01 这类金额取整到 $1 时归零
        return Math.round((amount + Number.EPSILON) * 100) / 100;
    }
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

    // 评论文案取自 i18n 字典（银行家评论为字符串数组），随语言切换自动适配
    const pick = (key) => {
        const pool = t(key);
        return pool[Math.floor(Math.random() * pool.length)];
    };

    // 判断是否为诱饵报价
    const state = StateManager.getState();
    // 仅当本次报价“真的”触发了诱饵加成时才用诱饵评语，避免言行不一（bug #4）
    const isBait = _lastBaitApplied;

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
// (formatOfferForDisplay 已移除：此前未被任何调用方使用，属于死代码，见 bug #9)

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