/**
 * UI 模块
 * 负责 DOM 操作、渲染更新、事件绑定、动画触发
 */

// 说明：CASE_VALUES / ROUND_CONFIG / TOTAL_ROUNDS / LOW_VALUE_COUNT /
// GAME_PHASE / CASE_STATE / formatCurrency / getValueClass / getValueLabel
// 由 config.js 全局提供；StateManager 由 state.js 全局提供；
// formatOfferForDisplay / getOfferCommentary 由 banker.js 全局提供。
// 本项目使用普通脚本加载，此处不再使用 import。

// ========================================
// DOM 元素缓存
// ========================================
const elements = {};

// 缓存常用 DOM 元素
function cacheElements() {
    elements.themeToggle = document.getElementById('theme-toggle');
    elements.themeMenu = document.getElementById('theme-menu');
    elements.themeCurrentIcon = document.getElementById('theme-current-icon');
    elements.lowMoneyList = document.getElementById('low-money-list');
    elements.highMoneyList = document.getElementById('high-money-list');
    elements.casesGrid = document.getElementById('cases-grid');
    elements.playerCaseDisplay = document.getElementById('player-case-display');
    elements.playerCaseNumber = document.getElementById('player-case-number');
    elements.playerCaseBox = document.getElementById('player-case-box');
    elements.roundInfo = document.getElementById('round-info');
    elements.roundCurrent = document.getElementById('round-current');
    elements.roundTarget = document.getElementById('round-target');
    elements.roundProgress = document.getElementById('round-progress');
    elements.bankerModal = document.getElementById('banker-modal');
    elements.bankerOfferAmount = document.getElementById('banker-offer-amount');
    elements.bankerExpected = document.getElementById('banker-expected');
    elements.bankerExpectedValue = document.getElementById('banker-expected-value');
    elements.btnDeal = document.getElementById('btn-deal');
    elements.btnNoDeal = document.getElementById('btn-no-deal');
    // 讨价还价（还价）相关元素
    elements.btnHaggle = document.getElementById('btn-haggle');
    elements.bankerHaggle = document.getElementById('banker-haggle');
    elements.bankerHagglePanel = document.getElementById('banker-haggle-panel');
    elements.bankerHaggleInput = document.getElementById('banker-haggle-input');
    elements.btnHaggleSubmit = document.getElementById('btn-haggle-submit');
    elements.btnHaggleCancel = document.getElementById('btn-haggle-cancel');
    elements.bankerHaggleResult = document.getElementById('banker-haggle-result');
    elements.switchModal = document.getElementById('switch-modal');
    elements.switchPlayerCaseNum = document.getElementById('switch-player-case-num');
    elements.switchOtherCaseNum = document.getElementById('switch-other-case-num');
    elements.btnKeep = document.getElementById('btn-keep');
    elements.btnSwitch = document.getElementById('btn-switch');
    elements.resultModal = document.getElementById('result-modal');
    elements.resultSummary = document.getElementById('result-summary');
    elements.resultDetails = document.getElementById('result-details');
    // 缓存各弹窗的内容层（真正居中定位、加动画的元素）
    elements.bankerModalContent = elements.bankerModal ? elements.bankerModal.querySelector('.modal-content') : null;
    elements.switchModalContent = elements.switchModal ? elements.switchModal.querySelector('.modal-content') : null;
    elements.resultModalContent = elements.resultModal ? elements.resultModal.querySelector('.modal-content') : null;
    elements.btnRestart = document.getElementById('btn-restart');
    elements.instructionBanner = document.getElementById('instruction-banner');
    elements.modalBackdrop = document.getElementById('modal-backdrop');

    // 语言切换相关元素
    elements.langToggle = document.getElementById('lang-toggle');
    elements.langMenu = document.getElementById('lang-menu');
    elements.langCurrentIcon = document.getElementById('lang-current-icon');
}

// 期望值白话解释统一通过 i18n 的 'ev.explainer' 取词（见 buildResultContent 与 index.html 的 data-i18n）

// ========================================
// 渲染函数
// ========================================

/**
 * 渲染金额面板（左右两侧）
 */
function renderMoneyPanels() {
    const state = StateManager.getState();
    const openedValues = new Set(Array.from(state.openedCases.values()));
    const playerValue = state.playerCaseValue;

    // 低值金额 (前13个)
    const lowValues = CASE_VALUES.slice(0, LOW_VALUE_COUNT);
    // 高值金额 (后13个)
    const highValues = CASE_VALUES.slice(LOW_VALUE_COUNT);

    elements.lowMoneyList.innerHTML = lowValues.map(value => {
        const isOpened = openedValues.has(value);
        const isPlayer = value === playerValue;
        const className = `money-item ${isOpened ? 'money-item--opened' : ''} ${isPlayer ? 'money-item--player' : ''}`;
        return `<li class="${className}" data-value="${value}">
            <span class="money-item__label">${getValueLabel(value)}</span>
            <span class="money-item__value">${formatCurrency(value)}</span>
        </li>`;
    }).join('');

    elements.highMoneyList.innerHTML = highValues.map(value => {
        const isOpened = openedValues.has(value);
        const isPlayer = value === playerValue;
        const className = `money-item ${isOpened ? 'money-item--opened' : ''} ${isPlayer ? 'money-item--player' : ''}`;
        return `<li class="${className}" data-value="${value}">
            <span class="money-item__label">${getValueLabel(value)}</span>
            <span class="money-item__value">${formatCurrency(value)}</span>
        </li>`;
    }).join('');
}

/**
 * 高亮特定金额（开箱时调用）
 * @param {number} value - 要高亮的金额
 */
function highlightMoneyValue(value) {
    const selector = `.money-item[data-value="${value}"]`;
    const item = document.querySelector(selector);
    if (item) {
        item.classList.add('money-item--animating');
        // 动画结束后移除高亮类，添加已开启类
        setTimeout(() => {
            item.classList.remove('money-item--animating');
            item.classList.add('money-item--opened');
        }, 1200);
    }
}

/**
 * 渲染 26 个箱子网格
 */
function renderCasesGrid() {
    const state = StateManager.getState();
    const numbers = Array.from({ length: 26 }, (_, i) => i + 1);

    elements.casesGrid.innerHTML = numbers.map(num => {
        // 玩家选定自己的箱子后，该箱子已从中央选择区"取出"，
        // 只在专属的"你的箱子"区域展示，因此不再渲染在中央网格里，
        // 避免它仍可被点击/被当成待开启箱子留在选择区域。
        if (state.playerCaseNumber && num === state.playerCaseNumber) {
            return '';
        }

        const isOpened = state.openedCases.has(num);
        const value = state.caseAssignments.get(num);
        const valueClass = getValueClass(value);

        let cssClass = 'case';
        let innerHTML = '';

        if (isOpened) {
            cssClass += ` case--opened case--${valueClass}`;
            innerHTML = `
                <div class="case__inner">
                    <div class="case__front">
                        <span class="case__number">${num}</span>
                    </div>
                    <div class="case__back case--${valueClass}">
                        <span class="case__value">${formatCurrency(value)}</span>
                    </div>
                </div>`;
        } else {
            cssClass += ' case--unopened';
            innerHTML = `
                <div class="case__inner">
                    <div class="case__front">
                        <span class="case__number">${num}</span>
                    </div>
                    <div class="case__back case--${valueClass}">
                        <span class="case__value">${formatCurrency(value)}</span>
                    </div>
                </div>`;
        }

        return `<div class="${cssClass}" data-number="${num}" data-value="${value}" role="button" tabindex="0" aria-label="${t('case.aria', { n: num })}" aria-pressed="false">${innerHTML}</div>`;
    }).join('');
}

/**
 * 触发箱子翻转动画
 * @param {number} caseNumber - 箱子编号
 * @param {number} value - 箱子金额
 * @returns {Promise} 动画完成 Promise
 */
function animateCaseOpen(caseNumber, value) {
    return new Promise(resolve => {
        const caseEl = document.querySelector(`.case[data-number="${caseNumber}"]`);
        if (!caseEl) { resolve(); return; }

        // 添加翻转类
        caseEl.classList.add('case--flipping');
        caseEl.classList.remove('case--unopened');

        // 更新金额显示
        const valueEl = caseEl.querySelector('.case__value');
        if (valueEl) {
            valueEl.textContent = formatCurrency(value);
            valueEl.className = `case__value case--${getValueClass(value)}`;
        }

        // 动画结束后更新类
        setTimeout(() => {
            caseEl.classList.remove('case--flipping');
            caseEl.classList.add('case--opened', `case--${getValueClass(value)}`);
            caseEl.removeAttribute('role');
            caseEl.removeAttribute('tabindex');
            caseEl.style.cursor = 'default';
            resolve();
        }, 800); // 与 CSS 动画时长一致
    });
}

/**
 * 显示玩家选择的箱子
 * @param {number} caseNumber
 * @param {number} value
 */
function showPlayerCase(caseNumber, value) {
    elements.playerCaseNumber.textContent = caseNumber;
    elements.playerCaseDisplay.hidden = false;
    elements.playerCaseBox.innerHTML = `<span class="player-case__number">${caseNumber}</span>`;

    // 隐藏指示横幅
    elements.instructionBanner.hidden = true;

    // 显示轮次信息
    elements.roundInfo.hidden = false;
    updateRoundInfo();
}

/**
 * 玩家选定箱子时的飞行动画与选择区过渡
 * - 被点中的箱子以克隆体从网格"飞"到"你的箱子"区域
 * - 指示横幅平滑离场
 * - 剩余箱子轻柔落位
 * @param {number} caseNumber
 * @param {number} value
 * @returns {Promise} 动画完成 Promise
 */
async function animatePlayerCaseSelection(caseNumber, value) {
    const prefersReduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sourceEl = elements.casesGrid.querySelector(`.case[data-number="${caseNumber}"]`);

    // 降级：无来源元素或用户偏好减少动画时，直接显示，不做飞行
    if (prefersReduced || !sourceEl) {
        renderCasesGrid(); // 仍需重渲染，将玩家箱子移出中央网格
        showPlayerCase(caseNumber, value);
        return;
    }

    // 1) 记录起点位置
    const sourceRect = sourceEl.getBoundingClientRect();

    // 2) 创建飞行克隆体，覆盖在原点（样式与箱子正面一致）
    const flying = document.createElement('div');
    flying.className = 'case-fly';
    flying.innerHTML = `
        <div class="case__inner">
            <div class="case__front">
                <span class="case__number">${caseNumber}</span>
            </div>
        </div>`;
    Object.assign(flying.style, {
        left: sourceRect.left + 'px',
        top: sourceRect.top + 'px',
        width: sourceRect.width + 'px',
        height: sourceRect.height + 'px',
        margin: '0'
    });
    document.body.appendChild(flying);

    // 3) 立即重渲染网格（玩家箱子被移除）；克隆体覆盖原位，视觉无缝
    renderCasesGrid();

    // 4) 准备"你的箱子"区域，但先留空占位，等待克隆体抵达
    elements.playerCaseNumber.textContent = caseNumber;
    elements.playerCaseDisplay.hidden = false;
    elements.playerCaseBox.innerHTML = '';
    elements.playerCaseBox.classList.add('player-case__box--incoming');

    // 轮次信息显示（沿用基础 slideUp 动画）
    elements.roundInfo.hidden = false;
    updateRoundInfo();

    // 指示横幅平滑离场
    animateBannerOut();

    // 网格其余箱子轻柔落位
    elements.casesGrid.classList.add('is-settling');

    // 5) 计算目标位置（"你的箱子"盒子），仅透明度动画不影响布局定位
    void elements.playerCaseBox.offsetWidth; // 强制布局
    const targetRect = elements.playerCaseBox.getBoundingClientRect();

    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const scale = targetRect.width / sourceRect.width;

    // 6) 触发飞行（下一帧再设置 transform，确保过渡生效）
    requestAnimationFrame(() => {
        flying.style.transformOrigin = 'top left';
        flying.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });

    // 7) 飞行结束后揭示真实盒子并移除克隆体
    await new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            flying.removeEventListener('transitionend', finish);

            elements.playerCaseBox.innerHTML = `<span class="player-case__number">${caseNumber}</span>`;
            elements.playerCaseBox.classList.remove('player-case__box--incoming');
            elements.playerCaseBox.classList.add('player-case__box--arrived');

            if (flying.parentNode) flying.parentNode.removeChild(flying);

            // 清理临时类，恢复基础发光/落位动画
            setTimeout(() => {
                elements.playerCaseBox.classList.remove('player-case__box--arrived');
                elements.casesGrid.classList.remove('is-settling');
            }, 550);

            resolve();
        };
        flying.addEventListener('transitionend', finish);
        setTimeout(finish, 800); // 兜底，避免 transitionend 未触发
    });
}

/**
 * 指示横幅平滑离场（动画结束后隐藏，避免生硬跳变）
 */
function animateBannerOut() {
    const b = elements.instructionBanner;
    b.classList.add('instruction-banner--leaving');
    const onEnd = () => {
        b.removeEventListener('animationend', onEnd);
        b.hidden = true;
        b.classList.remove('instruction-banner--leaving');
    };
    b.addEventListener('animationend', onEnd);
    setTimeout(onEnd, 600); // 兜底
}

/**
 * 更新轮次信息显示
 */
function updateRoundInfo() {
    const state = StateManager.getState();
    const roundInfo = StateManager.getCurrentRoundInfo();
    const isFinal = state.currentRoundIndex >= TOTAL_ROUNDS;

    elements.roundCurrent.textContent = isFinal
        ? t('round.final')
        : t('round.current', { n: roundInfo.round });
    elements.roundTarget.textContent = t('round.toOpen', { n: roundInfo.boxesToOpen });
    // 进度：使用 innerHTML 保留数字加粗样式（round.progress 内含 <b> 标签）
    elements.roundProgress.innerHTML = t('round.progress', {
        opened: state.openedThisRound,
        total: state.boxesToOpenThisRound
    });
}

/**
 * 显示银行家报价弹窗
 * @param {number} offer - 报价金额
 */
async function showBankerOffer(offer) {
    const state = StateManager.getState();
    const expectedValue = StateManager.calculateExpectedValue();
    const commentary = getOfferCommentary(offer, expectedValue);

    // 更新金额显示（带动画）
    elements.bankerOfferAmount.textContent = formatCurrency(offer);
    elements.bankerOfferAmount.classList.add('banker-modal__amount--animating');

    // 同步展示“你的箱子期望值”并附白话解释，让普通玩家看懂这是什么
    if (elements.bankerExpectedValue) {
        elements.bankerExpectedValue.textContent = formatCurrency(expectedValue);
    }

    // 显示背景遮罩
    elements.modalBackdrop.hidden = false;
    elements.modalBackdrop.classList.add('modal-backdrop-enter');

    // 显示弹窗（动画加在真正居中的内容层上）
    elements.bankerModal.hidden = false;
    elements.bankerModalContent.classList.add('modal-enter');

    // 电话铃声动画：仅作装饰，不再阻塞流程
    // （此前这里 await 1500ms，导致弹窗已经出现却迟迟不能决策）
    const phoneIcon = elements.bankerModal.querySelector('.banker-modal__phone');
    if (phoneIcon) {
        phoneIcon.classList.add('banker-modal__phone--ringing');
        const ringDuration = (typeof TIMING !== 'undefined' && TIMING.bankerRingDuration != null)
            ? TIMING.bankerRingDuration : 900;
        setTimeout(() => phoneIcon.classList.remove('banker-modal__phone--ringing'), ringDuration);
    }

    // 播放铃声音效（可选）
    playSound('ring');

    // 显示报价评论（可选：添加到弹窗中）
    console.log('[Banker] ', commentary);

    // 刷新"讨价还价"按钮与输入面板的可见状态（整局仅一次）
    updateHaggleUI();

}

/**
 * 隐藏银行家报价弹窗
 */
function hideBankerOffer() {
    elements.bankerModalContent.classList.add('modal-exit');
    elements.bankerModalContent.classList.remove('modal-enter');
    elements.bankerOfferAmount.classList.remove('banker-modal__amount--animating');

    // 隐藏背景遮罩
    elements.modalBackdrop.classList.add('modal-backdrop-exit');
    elements.modalBackdrop.classList.remove('modal-backdrop-enter');

    setTimeout(() => {
        elements.bankerModal.hidden = true;
        elements.bankerModalContent.classList.remove('modal-exit');
        elements.modalBackdrop.hidden = true;
        elements.modalBackdrop.classList.remove('modal-backdrop-exit');
    }, 250);
}

/**
 * 显示 Switch Case 交换弹窗
 */
function showSwitchCase() {
    const state = StateManager.getState();
    const playerCase = StateManager.getPlayerCase();
    const otherCase = StateManager.getOtherCase();

    elements.switchPlayerCaseNum.textContent = playerCase.number;
    elements.switchOtherCaseNum.textContent = otherCase.number;

    // 显示背景遮罩
    elements.modalBackdrop.hidden = false;
    elements.modalBackdrop.classList.add('modal-backdrop-enter');

    elements.switchModal.hidden = false;
    elements.switchModalContent.classList.add('modal-enter');
}

/**
 * 隐藏 Switch Case 弹窗
 */
function hideSwitchCase() {
    elements.switchModalContent.classList.add('modal-exit');
    elements.switchModalContent.classList.remove('modal-enter');

    // 隐藏背景遮罩
    elements.modalBackdrop.classList.add('modal-backdrop-exit');
    elements.modalBackdrop.classList.remove('modal-backdrop-enter');

    setTimeout(() => {
        elements.switchModal.hidden = true;
        elements.switchModalContent.classList.remove('modal-exit');
        elements.modalBackdrop.hidden = true;
        elements.modalBackdrop.classList.remove('modal-backdrop-exit');
    }, 250);
}

/**
 * 显示游戏结果弹窗
 */
function showResult() {
    const summary = StateManager.getResultSummary();

    // 构建结果摘要
    let summaryHTML = '';
    let detailsHTML = '';

    // 给普通玩家看的“期望值”说明（白话解释 + 数值）
    const evLine = `
        <p class="result-ev">
            <span class="result-ev__label">${t('result.ev.label')}</span>
            <span class="result-ev__value">${formatCurrency(summary.expectedValue)}</span>
        </p>
        <p class="result-ev__hint">${t('ev.explainer')}</p>
    `;

    if (summary.isDeal) {
        summaryHTML = `
            <div class="result-deal">
                <span class="result-label">${t('result.deal.label')}</span>
                <span class="result-amount highlight">${formatCurrency(summary.finalWinnings)}</span>
            </div>`;
        detailsHTML = `
            <p>${t('result.playerCaseWas')}<span class="highlight">${formatCurrency(summary.playerCaseValue)}</span></p>
            ${evLine}
            <p>${summary.beatExpected ? t('result.beat') : t('result.below')}</p>
        `;
    } else if (summary.decision === 'keep') {
        summaryHTML = `
            <div class="result-keep">
                <span class="result-label">${t('result.keep.label')}</span>
                <span class="result-amount highlight">${formatCurrency(summary.finalWinnings)}</span>
            </div>`;
        detailsHTML = `
            <p>${t('result.otherWas')}<span class="highlight">${formatCurrency(summary.otherCaseValue)}</span></p>
            ${evLine}
            <p>${summary.beatExpected ? t('result.beat') : t('result.below')}</p>
        `;
    } else if (summary.decision === 'switch') {
        summaryHTML = `
            <div class="result-switch">
                <span class="result-label">${t('result.switch.label')}</span>
                <span class="result-amount highlight">${formatCurrency(summary.finalWinnings)}</span>
            </div>`;
        detailsHTML = `
            <p>${t('result.origWas')}<span class="highlight">${formatCurrency(summary.otherCaseValue)}</span></p>
            ${evLine}
            <p>${summary.beatExpected ? t('result.beat') : t('result.below')}</p>
        `;
    }

    elements.resultSummary.innerHTML = summaryHTML;
    elements.resultDetails.innerHTML = detailsHTML;

    // 显示背景遮罩
    elements.modalBackdrop.hidden = false;
    elements.modalBackdrop.classList.add('modal-backdrop-enter');

    elements.resultModal.hidden = false;
    elements.resultModalContent.classList.add('modal-enter');

    // 触发揭示动画
    setTimeout(() => {
        elements.resultSummary.classList.add('result-modal__summary--reveal');
        elements.resultDetails.classList.add('result-modal__details--reveal');
        elements.btnRestart.classList.add('btn--restart--reveal');
    }, 100);

    // 揭示玩家箱子实际金额（若流程中尚未以翻转动画打开，则在此兜底揭示）
    if (!elements.playerCaseBox.classList.contains('case--opened')) {
        revealPlayerCaseValue(summary.playerCaseValue);
    }
}

/**
 * 隐藏结果弹窗
 */
function hideResult() {
    elements.resultModalContent.classList.add('modal-exit');
    elements.resultModalContent.classList.remove('modal-enter');
    elements.resultSummary.classList.remove('result-modal__summary--reveal');
    elements.resultDetails.classList.remove('result-modal__details--reveal');
    elements.btnRestart.classList.remove('btn--restart--reveal');

    // 隐藏背景遮罩
    elements.modalBackdrop.classList.add('modal-backdrop-exit');
    elements.modalBackdrop.classList.remove('modal-backdrop-enter');

    setTimeout(() => {
        elements.resultModal.hidden = true;
        elements.resultModalContent.classList.remove('modal-exit');
        elements.modalBackdrop.hidden = true;
        elements.modalBackdrop.classList.remove('modal-backdrop-exit');
    }, 250);
}

/**
 * 揭示玩家箱子中的实际金额
 * @param {number} value
 */
function revealPlayerCaseValue(value) {
    elements.playerCaseBox.innerHTML = `
        <span class="player-case__value">${formatCurrency(value)}</span>
    `;
    elements.playerCaseBox.classList.add('case--opened', `case--${getValueClass(value)}`);
}

/**
 * 打开（翻转揭示）玩家自己的箱子，展示其中真实金额。
 * 用于：接受银行家报价(DEAL)后、保留/交换箱子后等"揭晓"场景，
 * 作为游戏结束前的戏剧性后续。
 * @param {number} value - 箱子真实金额
 * @returns {Promise} 动画完成 Promise
 */
function animatePlayerCaseOpen(value) {
    return new Promise(resolve => {
        const box = elements.playerCaseBox;
        if (!box) { resolve(); return; }

        const num = StateManager.getPlayerCase().number;
        const valueClass = getValueClass(value);

        // 重置为"正面朝前、仅显示编号"的未开启状态（同时带好金额配色类，使背面颜色在翻转中即正确）
        box.classList.remove('case--opened', 'case--flipping');
        box.classList.add(`case--${valueClass}`);
        box.innerHTML = `
            <div class="case__inner">
                <div class="case__front">
                    <span class="case__number">${num}</span>
                </div>
                <div class="case__back case--${valueClass}">
                    <span class="case__value">${formatCurrency(value)}</span>
                </div>
            </div>`;

        // 强制重排，确保从正面(rotateY 0)开始过渡，从而触发翻转
        void box.offsetWidth;

        // 触发翻转动画
        box.classList.add('case--flipping');

        // 动画结束后定格为已开启状态
        setTimeout(() => {
            box.classList.remove('case--flipping');
            box.classList.add('case--opened', `case--${valueClass}`);
            resolve();
        }, 800); // 与 CSS 翻转过渡时长一致
    });
}

/**
 * 重置 UI 到初始状态
 */
function resetUI() {
    // 重新渲染金额面板
    renderMoneyPanels();

    // 重新渲染箱子网格
    renderCasesGrid();

    // 隐藏玩家箱子显示
    elements.playerCaseDisplay.hidden = true;
    elements.playerCaseBox.classList.remove('player-case__box--incoming', 'player-case__box--arrived');
    elements.playerCaseBox.classList.remove('case--opened', 'case--flipping', 'case--low', 'case--high');

    // 隐藏轮次信息
    elements.roundInfo.hidden = true;

    // 隐藏所有弹窗
    elements.bankerModal.hidden = true;
    elements.switchModal.hidden = true;
    elements.resultModal.hidden = true;

    // 隐藏背景遮罩
    elements.modalBackdrop.hidden = true;

    // 显示指示横幅
    elements.instructionBanner.hidden = false;
    elements.instructionBanner.classList.remove('instruction-banner--leaving');

    // 清理可能的动画残留类
    elements.casesGrid.classList.remove('is-settling');
    elements.playerCaseDisplay.classList.remove('player-case-display--fade');

    // 移除所有动画类
    if (elements.bankerModalContent) elements.bankerModalContent.classList.remove('modal-enter', 'modal-exit');
    if (elements.switchModalContent) elements.switchModalContent.classList.remove('modal-enter', 'modal-exit');
    if (elements.resultModalContent) elements.resultModalContent.classList.remove('modal-enter', 'modal-exit');
    elements.resultSummary.classList.remove('result-modal__summary--reveal');
    elements.resultDetails.classList.remove('result-modal__details--reveal');
    elements.btnRestart.classList.remove('btn--restart--reveal');
    elements.modalBackdrop.classList.remove('modal-backdrop-enter', 'modal-backdrop-exit');
}

/**
 * 更新主题切换按钮图标
 * @param {string} theme - 'light' | 'dark'
 */
function updateThemeIcon(theme) {
    // 通过 CSS[data-theme] 自动处理，这里只需确保属性正确
    document.documentElement.setAttribute('data-theme', theme);
}

// ========================================
// 音频上下文管理（解决自动播放策略问题）
// ========================================
let audioContext = null;
let audioInitialized = false;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function initAudioOnUserInteraction() {
    if (audioInitialized) return;
    audioInitialized = true;
    // 创建音频上下文（这会在用户首次交互时解锁）
    getAudioContext();
    // 如果上下文被暂停，恢复它
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    // 移除监听器
    document.removeEventListener('click', initAudioOnUserInteraction);
    document.removeEventListener('keydown', initAudioOnUserInteraction);
    document.removeEventListener('touchstart', initAudioOnUserInteraction);
}

// 监听首次用户交互以初始化音频
document.addEventListener('click', initAudioOnUserInteraction);
document.addEventListener('keydown', initAudioOnUserInteraction);
document.addEventListener('touchstart', initAudioOnUserInteraction);

/**
 * 简单音效播放（使用 Web Audio API 生成基础音调）
 * @param {string} type - 'ring' | 'open' | 'deal' | 'win' | 'lose'
 */
function playSound(type) {
    // 可选：实现简单音效
    // 由于不依赖外部资源，这里用 Web Audio API 合成简单音调
    try {
        const ctx = getAudioContext();
        // 确保音频上下文处于运行状态
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'ring':
                oscillator.frequency.setValueAtTime(440, ctx.currentTime);
                oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 1);
                break;
            case 'open':
                oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;
            case 'deal':
                oscillator.frequency.setValueAtTime(523, ctx.currentTime);
                oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
                oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.6);
                break;
        }
    } catch (e) {
        // 忽略音频错误（用户可能未交互、浏览器策略等）
    }
}

/**
 * 绑定全局事件监听器
 * @param {object} handlers - 事件处理函数对象
 */
function bindEvents(handlers) {
    // 确保元素已缓存
    ensureElementsCached();

    // 防御性检查
    if (!elements.casesGrid || !elements.themeToggle) {
        console.error('[UI] 关键 DOM 元素未找到，事件绑定失败');
        return;
    }

    // 箱子点击事件（事件委托）
    elements.casesGrid.addEventListener('click', (e) => {
        const caseEl = e.target.closest('.case');
        if (!caseEl) return;
        const caseNumber = parseInt(caseEl.dataset.number, 10);
        handlers.onCaseClick(caseNumber);
    });

    // 箱子键盘事件（无障碍支持）
    elements.casesGrid.addEventListener('keydown', (e) => {
        const caseEl = e.target.closest('.case');
        if (!caseEl) return;

        const caseNumber = parseInt(caseEl.dataset.number, 10);

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlers.onCaseClick(caseNumber);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
                   e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // 方向键导航
            e.preventDefault();
            navigateCases(caseEl, e.key);
        }
    });

    // 方向键导航函数
    function navigateCases(currentCase, direction) {
        const allCases = Array.from(elements.casesGrid.querySelectorAll('.case:not(.case--opened):not([disabled])'));
        const currentIndex = allCases.indexOf(currentCase);
        if (currentIndex === -1) return;

        const cols = 13; // 网格列数
        let targetIndex = currentIndex;

        switch (direction) {
            case 'ArrowRight':
                targetIndex = currentIndex + 1;
                break;
            case 'ArrowLeft':
                targetIndex = currentIndex - 1;
                break;
            case 'ArrowDown':
                targetIndex = currentIndex + cols;
                break;
            case 'ArrowUp':
                targetIndex = currentIndex - cols;
                break;
        }

        // 边界检查
        if (targetIndex >= 0 && targetIndex < allCases.length) {
            allCases[targetIndex].focus();
        }
    }

    // Deal / No Deal 按钮
    elements.btnDeal.addEventListener('click', () => handlers.onDeal());
    elements.btnNoDeal.addEventListener('click', () => handlers.onNoDeal());

    // haggle events
    if (elements.btnHaggle) {
        elements.btnHaggle.addEventListener('click', () => { if (handlers.onHaggle) handlers.onHaggle(); });
    }
    if (elements.btnHaggleSubmit) {
        elements.btnHaggleSubmit.addEventListener('click', () => { if (handlers.onHaggleSubmit) handlers.onHaggleSubmit(); });
    }
    if (elements.btnHaggleCancel) {
        elements.btnHaggleCancel.addEventListener('click', () => { if (handlers.onHaggleCancel) handlers.onHaggleCancel(); });
    }
    if (elements.bankerHagglePanel) {
        elements.bankerHagglePanel.querySelectorAll('[data-add]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const add = parseFloat(btn.getAttribute('data-add'));
                if (isNaN(add)) return;
                const base = StateManager.getState().currentOffer;
                if (elements.bankerHaggleInput) {
                    elements.bankerHaggleInput.value = Math.round(base * (1 + add));
                }
            });
        });
    }

    // Switch Case 按钮
    elements.btnKeep.addEventListener('click', () => handlers.onKeep());
    elements.btnSwitch.addEventListener('click', () => handlers.onSwitch());

    // 重新开始按钮
    elements.btnRestart.addEventListener('click', () => handlers.onRestart());

    // 主题切换：点击按钮展开/收起菜单
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (handlers.onThemeToggle) handlers.onThemeToggle();
        });
    }
    // 主题菜单项选择（浅色 / 深色 / 跟随系统）
    if (elements.themeMenu) {
        elements.themeMenu.querySelectorAll('[data-theme-value]').forEach((li) => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                if (handlers.onThemeSelect) handlers.onThemeSelect(li.getAttribute('data-theme-value'));
            });
        });
    }
    // 语言切换：点击按钮展开/收起菜单
    if (elements.langToggle) {
        elements.langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (handlers.onLangToggle) handlers.onLangToggle();
        });
    }
    // 语言菜单项选择（中文 / English / 跟随系统）
    if (elements.langMenu) {
        elements.langMenu.querySelectorAll('[data-lang-value]').forEach((li) => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                if (handlers.onLangSelect) handlers.onLangSelect(li.getAttribute('data-lang-value'));
            });
        });
    }
    // 点击空白处关闭菜单
    document.addEventListener('click', () => {
        if (handlers.onThemeClose) handlers.onThemeClose();
        if (handlers.onLangClose) handlers.onLangClose();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // ESC 关闭弹窗
        if (e.key === 'Escape') {
            if (!elements.bankerModal.hidden) handlers.onNoDeal();
            if (!elements.switchModal.hidden) handlers.onKeep();
        }
        // D 键 = Deal
        if (e.key === 'd' || e.key === 'D') {
            if (!elements.bankerModal.hidden && !elements.btnDeal.disabled) handlers.onDeal();
        }
        // N 键 = No Deal
        if (e.key === 'n' || e.key === 'N') {
            if (!elements.bankerModal.hidden && !elements.btnNoDeal.disabled) handlers.onNoDeal();
        }
    });
}

/**
 * 设置按钮启用/禁用状态
 * @param {string} buttonId - 按钮 ID
 * @param {boolean} disabled - 是否禁用
 */
function setButtonDisabled(buttonId, disabled) {
    const btn = document.getElementById(buttonId);
    if (btn) btn.disabled = disabled;
}

// 不在模块加载时缓存元素，改为延迟缓存
function ensureElementsCached() {
    if (!elements.themeToggle) {
        cacheElements();
    }
}

// 导出确保元素已缓存的函数
function ensureElementsReady() {
    ensureElementsCached();
}

/**
 * 切换语言时刷新"动态"文案（静态文案由全局 applyStaticI18n() 负责）。
 * - 轮次信息（若可见）
 * - 结算弹窗（若可见，按当前语言重建文本与揭示动画）
 */
function applyI18n() {
    if (elements.roundInfo && !elements.roundInfo.hidden) {
        updateRoundInfo();
    }
    if (elements.resultModal && !elements.resultModal.hidden) {
        showResult();
    }
}

// ========================================
// 讨价还价（还价）相关 UI
// ========================================

// 根据是否已用过还价，刷新"讨价还价"按钮与输入面板的可见状态
function updateHaggleUI() {
    if (!elements.btnHaggle) return;
    const used = StateManager.getState().haggleUsed;
    elements.btnHaggle.hidden = used;
    if (elements.bankerHagglePanel) elements.bankerHagglePanel.hidden = true;
    if (elements.bankerHaggleResult) {
        elements.bankerHaggleResult.hidden = true;
        elements.bankerHaggleResult.textContent = '';
        elements.bankerHaggleResult.classList.remove('banker-modal__haggle-result--accepted', 'banker-modal__haggle-result--rejected');
    }
    if (!used && elements.bankerHaggleInput) {
        const offer = StateManager.getState().currentOffer;
        elements.bankerHaggleInput.value = Math.round(offer);
    }
}

// 展开还价输入面板
function showHagglePanel() {
    if (elements.bankerHagglePanel) elements.bankerHagglePanel.hidden = false;
    if (elements.bankerHaggleInput) elements.bankerHaggleInput.focus();
}

// 收起还价输入面板
function hideHagglePanel() {
    if (elements.bankerHagglePanel) elements.bankerHagglePanel.hidden = true;
}

// 读取玩家输入的还价金额（字符串）
function getHaggleInputValue() {
    return elements.bankerHaggleInput ? elements.bankerHaggleInput.value : '';
}

// 更新报价金额显示（还价被接受时刷新）
function setOfferDisplay(offer) {
    if (!elements.bankerOfferAmount) return;
    elements.bankerOfferAmount.textContent = formatCurrency(offer);
    elements.bankerOfferAmount.classList.add('banker-modal__amount--animating');
    setTimeout(() => {
        if (elements.bankerOfferAmount) elements.bankerOfferAmount.classList.remove('banker-modal__amount--animating');
    }, 600);
}

// 显示银行家对还价的回应
function showHaggleResult(message, accepted) {
    if (!elements.bankerHaggleResult) return;
    elements.bankerHaggleResult.hidden = false;
    elements.bankerHaggleResult.textContent = message;
    elements.bankerHaggleResult.classList.toggle('banker-modal__haggle-result--accepted', !!accepted);
    elements.bankerHaggleResult.classList.toggle('banker-modal__haggle-result--rejected', !accepted);
}

const UI = {
    renderMoneyPanels,
    highlightMoneyValue,
    renderCasesGrid,
    animateCaseOpen,
    showPlayerCase,
    animatePlayerCaseSelection,
    updateRoundInfo,
    showBankerOffer,
    hideBankerOffer,
    showSwitchCase,
    hideSwitchCase,
    showResult,
    hideResult,
    revealPlayerCaseValue,
    animatePlayerCaseOpen,
    resetUI,
    applyI18n,
    updateThemeIcon,
    bindEvents,
    setButtonDisabled,
    playSound,
    updateHaggleUI,
    showHagglePanel,
    hideHagglePanel,
    getHaggleInputValue,
    setOfferDisplay,
    showHaggleResult
};