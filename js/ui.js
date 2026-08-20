/**
 * UI 模块
 * 负责 DOM 操作、渲染更新、事件绑定、动画触发
 */

// 说明：CASE_VALUES / ROUND_CONFIG / TOTAL_ROUNDS / LOW_VALUE_COUNT /
// GAME_PHASE / CASE_STATE / formatCurrency / getValueClass / getValueLabel
// 由 config.js 全局提供；StateManager 由 state.js 全局提供；
// getOfferCommentary 由 banker.js 全局提供（formatOfferForDisplay 已移除，见 banker.js）。
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
    elements.bankerCommentary = document.getElementById('banker-commentary');
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

    // 开发者选项（彩蛋）相关元素
    elements.gameTitle = document.getElementById('game-title');
    elements.devModal = document.getElementById('dev-modal');
    elements.devModalContent = elements.devModal ? elements.devModal.querySelector('.modal-content') : null;
    elements.btnDevAll = document.getElementById('btn-dev-all');
    elements.btnDevRemaining = document.getElementById('btn-dev-remaining');
    elements.btnDevMine = document.getElementById('btn-dev-mine');
    elements.btnDevClose = document.getElementById('btn-dev-close');
    elements.devResult = document.getElementById('dev-result');
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

    const lowValues = CASE_VALUES.slice(0, LOW_VALUE_COUNT);
    const highValues = CASE_VALUES.slice(LOW_VALUE_COUNT);

    // 只展示“公开奖阶”（哪些金额已被开走）；绝不标出“哪个金额是你的箱子”，
    // 否则玩家能直接看到自己箱子的真实金额，违背 README“金额整局保持隐藏”的设计。
    elements.lowMoneyList.innerHTML = lowValues.map(value => {
        const isOpened = openedValues.has(value);
        const className = `money-item ${isOpened ? 'money-item--opened' : ''}`;
        return `<li class="${className}" data-value="${value}">
            <span class="money-item__label">${getValueLabel(value)}</span>
            <span class="money-item__value">${formatCurrency(value)}</span>
        </li>`;
    }).join('');

    elements.highMoneyList.innerHTML = highValues.map(value => {
        const isOpened = openedValues.has(value);
        const className = `money-item ${isOpened ? 'money-item--opened' : ''}`;
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
        if (state.playerCaseNumber && num === state.playerCaseNumber) {
            // 玩家箱子已移到侧边面板：保留一个占位格在原编号位置，
            // 既避免网格末端出现空洞，也保证剩余箱子编号位置不漂移
            return '<div class="case case--placeholder" aria-hidden="true"></div>';
        }

        const isOpened = state.openedCases.has(num);
        const value = state.caseAssignments.get(num);
        const valueClass = getValueClass(value);

        let cssClass = 'case';
        let innerHTML = '';

        if (isOpened) {
            // 已开箱：值已揭晓，可安全展示（含高/低配色）
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
            // 未开箱：背面的金额与高/低配色都不要写进 DOM，
            // 否则玩家可用开发者工具提前看到每个箱子的真实金额（泄密）。
            // 金额仅在 animateCaseOpen 翻转那一刻由 JS 注入。
            cssClass += ' case--unopened';
            innerHTML = `
                <div class="case__inner">
                    <div class="case__front">
                        <span class="case__number">${num}</span>
                    </div>
                    <div class="case__back">
                        <span class="case__value"></span>
                    </div>
                </div>`;
        }

        const interactAttrs = isOpened
            ? `tabindex="-1" aria-hidden="true"`
            : `role="button" tabindex="0" aria-label="${t('case.aria', { n: num })}" aria-pressed="false"`;
        return `<div class="${cssClass}" data-number="${num}" ${interactAttrs}>${innerHTML}</div>`;
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
/**
 * 玩家选定箱子后统一准备"你的箱子"显示区（编号、显示区、轮次信息）。
 * 正常飞行路径与降动效降级路径共用此函数，避免两份逻辑分叉（修复 BUG-C）。
 * @param {number} caseNumber
 * @param {boolean} fillBox 是否立即把编号写入玩家箱子盒子（降级路径填；飞行路径留空等克隆体抵达）
 * @param {boolean} hideBanner 是否立即隐藏指示横幅（降级路径隐藏；飞行路径交由 animateBannerOut 平滑离场）
 */
function preparePlayerCaseDisplay(caseNumber, fillBox, hideBanner) {
    elements.playerCaseNumber.textContent = caseNumber;
    elements.playerCaseDisplay.hidden = false;
    elements.roundInfo.hidden = false;
    updateRoundInfo();
    if (hideBanner) elements.instructionBanner.hidden = true;
    if (fillBox) {
        elements.playerCaseBox.innerHTML = `<span class="player-case__number">${caseNumber}</span>`;
    }
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
        // 降级路径：直接填充编号并隐藏横幅/显示轮次信息（复用同一 helper，修复 BUG-C）
        preparePlayerCaseDisplay(caseNumber, true, true);
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
    //    preparePlayerCaseDisplay 统一处理编号/显示区/轮次信息（与降级路径共用，修复 BUG-C）；
    //    横幅的平滑离场仍交由下方 animateBannerOut() 负责，此处不立即隐藏。
    preparePlayerCaseDisplay(caseNumber, false, false);
    elements.playerCaseBox.innerHTML = '';
    elements.playerCaseBox.classList.add('player-case__box--incoming');

    // 轮次信息显示（沿用基础 slideUp 动画）—— 已由 preparePlayerCaseDisplay 内部完成

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
    if (isFinal) {
        // 最终轮进入交换阶段，不再需要“开启 N 个箱子”的提示
        elements.roundTarget.hidden = true;
    } else {
        elements.roundTarget.hidden = false;
        elements.roundTarget.textContent = t('round.toOpen', { n: roundInfo.boxesToOpen });
    }
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

    // 显示银行家评语（此前只 console.log，玩家看不到；现在写入弹窗，见 bug #5）
    if (elements.bankerCommentary) {
        elements.bankerCommentary.textContent = commentary;
        elements.bankerCommentary.classList.remove('banker-modal__commentary--show');
        void elements.bankerCommentary.offsetWidth; // 触发重排以重放淡入动画
        elements.bankerCommentary.classList.add('banker-modal__commentary--show');
    }

    // 刷新"讨价还价"按钮与输入面板的可见状态（整局仅一次）
    updateHaggleUI();

}

/**
 * 隐藏银行家报价弹窗
 */
function hideBankerOffer(keepBackdrop) {
    elements.bankerModalContent.classList.add('modal-exit');
    elements.bankerModalContent.classList.remove('modal-enter');
    if (elements.bankerCommentary) elements.bankerCommentary.textContent = '';
    elements.bankerOfferAmount.classList.remove('banker-modal__amount--animating');

    // 隐藏背景遮罩；进入交换阶段时复用当前遮罩（keepBackdrop=true），避免遮罩先隐后显的闪烁
    if (!keepBackdrop) {
        elements.modalBackdrop.classList.add('modal-backdrop-exit');
        elements.modalBackdrop.classList.remove('modal-backdrop-enter');
    }

    setTimeout(() => {
        elements.bankerModal.hidden = true;
        elements.bankerModalContent.classList.remove('modal-exit');
        if (!keepBackdrop) {
            elements.modalBackdrop.hidden = true;
            elements.modalBackdrop.classList.remove('modal-backdrop-exit');
        }
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
    // roundTarget 在新一局会被 updateRoundInfo 按阶段重新设置 hidden，这里先复位为可见
    elements.roundTarget.hidden = false;

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
    if (elements.bankerCommentary) elements.bankerCommentary.textContent = '';
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


// ========================================
// 开发者选项（彩蛋：连续点击标题 5 次解锁）
// ========================================

// 标题连续点击计数：两次点击间隔超过阈值即清零
let titleClickCount = 0;
let titleClickTimer = null;
const TITLE_CLICK_THRESHOLD = 5;      // 需连续点击的次数
const TITLE_CLICK_RESET_MS = 2000;    // 相邻两次点击的最大间隔（毫秒）

/** 处理标题栏连续点击：累计满 5 次即弹出开发者选项 */
function handleTitleClick() {
    titleClickCount++;
    if (titleClickTimer) clearTimeout(titleClickTimer);
    titleClickTimer = setTimeout(function () { titleClickCount = 0; }, TITLE_CLICK_RESET_MS);
    if (titleClickCount >= TITLE_CLICK_THRESHOLD) {
        titleClickCount = 0;
        if (titleClickTimer) clearTimeout(titleClickTimer);
        showDevOptions();
    }
}

/** 是否还有其它重要弹窗处于打开状态（避免关闭开发者选项时误关背景遮罩） */
function _anyOtherModalOpen() {
    return !elements.bankerModal.hidden ||
           !elements.switchModal.hidden ||
           !elements.resultModal.hidden;
}

/** 显示开发者选项弹窗 */
function showDevOptions() {
    if (elements.devResult) {
        elements.devResult.innerHTML = '';
        elements.devResult.hidden = true;
        elements.devResult.classList.remove('dev-modal__result--show');
    }
    elements.modalBackdrop.hidden = false;
    elements.modalBackdrop.classList.add('modal-backdrop-enter');
    elements.devModal.hidden = false;
    elements.devModalContent.classList.add('modal-enter');
}

/** 隐藏开发者选项弹窗 */
function hideDevOptions() {
    elements.devModalContent.classList.add('modal-exit');
    elements.devModalContent.classList.remove('modal-enter');
    if (!_anyOtherModalOpen()) {
        elements.modalBackdrop.classList.add('modal-backdrop-exit');
        elements.modalBackdrop.classList.remove('modal-backdrop-enter');
    }
    setTimeout(function () {
        elements.devModal.hidden = true;
        elements.devModalContent.classList.remove('modal-exit');
        if (!_anyOtherModalOpen()) {
            elements.modalBackdrop.hidden = true;
            elements.modalBackdrop.classList.remove('modal-backdrop-exit');
        }
    }, 250);
}

/** 在弹窗内渲染全部 26 个箱子的金额（玩家箱子高亮） */
function renderDevCaseList(state) {
    const result = elements.devResult;
    if (!result) return;
    result.hidden = false;

    const items = [];
    for (let num = 1; num <= 26; num++) {
        const value = state.caseAssignments.get(num);
        if (value == null) continue;
        const cls = getValueClass(value);
        const isPlayer = (state.playerCaseNumber === num);
        items.push(
            '<div class="dev-case-item dev-case-item--' + cls + (isPlayer ? ' dev-case-item--player' : '') + '">' +
                '<span class="dev-case-item__num">' + num + (isPlayer ? ' ★' : '') + '</span>' +
                '<span class="dev-case-item__value">' + formatCurrency(value) + '</span>' +
            '</div>'
        );
    }
    result.innerHTML = '<div class="dev-case-grid">' + items.join('') + '</div>';
    void result.offsetWidth;
    result.classList.add('dev-modal__result--show');
}

/** 一键查看所有箱子的金额 */
function devRevealAllCases() {
    const state = StateManager.getState();

    // 只在弹窗列表里汇总全部 26 个箱子的真实金额（玩家箱子高亮）。
    // 开发者查看是“只读”的：不改动棋盘，也不揭示侧栏「你的箱子」，
    // 否则关闭弹窗后金额会一直残留在箱子上，破坏游戏隐藏性。
    renderDevCaseList(state);
    if (elements.devResult) {
        const hint = document.createElement('p');
        hint.className = 'dev-modal__msg';
        hint.textContent = t('dev.allDone');
        elements.devResult.insertBefore(hint, elements.devResult.firstChild);
    }
}

/** 在弹窗内只渲染玩家自己的箱子（查看“我的箱子”时用，不列出全部） */
function renderDevPlayerCase(state) {
    const result = elements.devResult;
    if (!result) return;
    result.hidden = false;

    const num = state.playerCaseNumber;
    const value = state.playerCaseValue;
    const cls = getValueClass(value);
    const item =
        '<div class="dev-case-item dev-case-item--' + cls + ' dev-case-item--player">' +
            '<span class="dev-case-item__num">' + num + ' ★</span>' +
            '<span class="dev-case-item__value">' + formatCurrency(value) + '</span>' +
        '</div>';
    result.innerHTML = '<div class="dev-case-grid">' + item + '</div>';
    void result.offsetWidth;
    result.classList.add('dev-modal__result--show');
}

/** 查看自己箱子的金额（只显示自己的箱子，不显示全部） */
function devRevealPlayerCase() {
    const state = StateManager.getState();

    if (!state.playerCaseNumber || state.playerCaseValue == null) {
        if (elements.devResult) {
            elements.devResult.hidden = false;
            elements.devResult.innerHTML = '<p class="dev-modal__msg dev-modal__msg--warn">' + t('dev.noCase') + '</p>';
        }
        return;
    }

    const pv = state.playerCaseValue;

    // 开发者查看是“只读”的：只在弹窗里渲染“我的箱子”，
    // 不揭示侧栏「你的箱子」盒子，避免关闭弹窗后金额残留在箱子上。
    renderDevPlayerCase(state);
    if (elements.devResult) {
        const msg = document.createElement('p');
        msg.className = 'dev-modal__msg';
        msg.textContent = t('dev.mineResult', { num: state.playerCaseNumber, value: formatCurrency(pv) });
        elements.devResult.insertBefore(msg, elements.devResult.firstChild);
    }
}

/** 在弹窗内只渲染“尚未开启”的箱子（即还在局中、对玩家隐藏的金额）。
 *  已开箱的会被自动排除；玩家的箱子仍未开启，因此仍算“剩余”并带 ★ 高亮。 */
function renderDevRemainingList(state) {
    const result = elements.devResult;
    if (!result) return;
    result.hidden = false;

    const opened = state.openedCases; // 已开箱的编号集合
    const items = [];
    for (let num = 1; num <= 26; num++) {
        if (opened.has(num)) continue; // 已开箱：跳过
        const value = state.caseAssignments.get(num);
        if (value == null) continue;
        const cls = getValueClass(value);
        const isPlayer = (state.playerCaseNumber === num);
        items.push(
            '<div class="dev-case-item dev-case-item--' + cls + (isPlayer ? ' dev-case-item--player' : '') + '">' +
                '<span class="dev-case-item__num">' + num + (isPlayer ? ' ★' : '') + '</span>' +
                '<span class="dev-case-item__value">' + formatCurrency(value) + '</span>' +
            '</div>'
        );
    }
    result.innerHTML = '<div class="dev-case-grid">' + items.join('') + '</div>';
    void result.offsetWidth;
    result.classList.add('dev-modal__result--show');
}

/** 查看“剩余”（尚未开启）的所有箱子金额 */
function devRevealRemainingCases() {
    const state = StateManager.getState();

    // 开发者查看是“只读”的：只在弹窗里汇总剩余的箱子金额，不改动棋盘，
    // 也不揭示侧栏「你的箱子」，避免关闭弹窗后金额残留在箱子上、破坏隐藏性。
    renderDevRemainingList(state);
    if (elements.devResult) {
        const remainingCount = 26 - state.openedCases.size;
        const hint = document.createElement('p');
        hint.className = 'dev-modal__msg';
        hint.textContent = t('dev.remainingDone', { count: remainingCount });
        elements.devResult.insertBefore(hint, elements.devResult.firstChild);
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
        const allCases = Array.from(elements.casesGrid.querySelectorAll('.case:not(.case--opened):not(.case--placeholder):not([disabled])'));
        if (allCases.indexOf(currentCase) === -1) return;

        // 列数随响应式布局变化（桌面 13 列、平板/手机 7 列），动态读取避免方向键跳错
        const cols = elements.casesGrid
            ? getComputedStyle(elements.casesGrid).gridTemplateColumns.split(' ').length
            : 13;
        const rows = Math.ceil(26 / cols);
        const playerCaseNumber = StateManager.getState().playerCaseNumber;
        // 玩家箱占位格所在视觉索引；无占位（选箱阶段）时为 -1
        const placeholderCell = playerCaseNumber ? playerCaseNumber - 1 : -1;

        // 26 格网格中第 N 个箱子固定落在第 N-1 格；玩家箱占位只占其中一格，
        // 不影响其余箱子 (编号-1) 的行列映射（修复 BUG-E：此前按焦点列表下标 ±列数，
        // 在占位格处发生 1 格列偏移，导致上下/左右导航落点错位）。
        let vi = currentCase - 1;
        let row = Math.floor(vi / cols);
        let col = vi % cols;

        if (direction === 'ArrowRight') col++;
        else if (direction === 'ArrowLeft') col--;
        else if (direction === 'ArrowDown') row++;
        else if (direction === 'ArrowUp') row--;

        // 越界则忽略（不换行）
        if (col < 0 || col >= cols || row < 0 || row >= rows) return;
        let nvi = row * cols + col;
        if (nvi < 0 || nvi > 25) return;

        // 落点恰为玩家箱占位格时，沿同方向再跳一格
        if (nvi === placeholderCell) {
            if (direction === 'ArrowRight' && col + 1 < cols) nvi = row * cols + (col + 1);
            else if (direction === 'ArrowLeft' && col - 1 >= 0) nvi = row * cols + (col - 1);
            else if (direction === 'ArrowDown' && row + 1 < rows) nvi = (row + 1) * cols + col;
            else if (direction === 'ArrowUp' && row - 1 >= 0) nvi = (row - 1) * cols + col;
            else return;
        }
        if (nvi < 0 || nvi > 25) return;

        const targetCase = nvi + 1;
        const targetEl = allCases.find(el => parseInt(el.dataset.number, 10) === targetCase);
        if (targetEl) targetEl.focus();
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

    // 开发者选项（彩蛋）：连续点击标题 5 次解锁
    if (elements.gameTitle) {
        elements.gameTitle.addEventListener('click', handleTitleClick);
    }
    if (elements.btnDevAll) {
        elements.btnDevAll.addEventListener('click', () => devRevealAllCases());
    }
    if (elements.btnDevRemaining) {
        elements.btnDevRemaining.addEventListener('click', () => devRevealRemainingCases());
    }
    if (elements.btnDevMine) {
        elements.btnDevMine.addEventListener('click', () => devRevealPlayerCase());
    }
    if (elements.btnDevClose) {
        elements.btnDevClose.addEventListener('click', () => hideDevOptions());
    }

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
        // 若焦点在输入框（如"讨价还价"还价金额输入框）或内容可编辑区，
        // 不触发任何快捷键，避免输入字母 d/n 时误触 DEAL / NO DEAL
        const kt = e.target;
        if (kt && (kt.tagName === 'INPUT' || kt.tagName === 'TEXTAREA' || kt.isContentEditable)) {
            return;
        }
        // 还价面板打开时，D/N 快捷键同样失效，防止与输入还价冲突
        if (elements.bankerHagglePanel && !elements.bankerHagglePanel.hidden) {
            return;
        }

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
    // 每次展示报价时复位还价按钮的可见/可用状态：未使用 -> 显示且可用；已使用 -> 隐藏。
    // 这样即便上一局在 DEAL/NO DEAL 时已被禁用（修复 BUG-A），新一局/新一轮也会重新可用。
    elements.btnHaggle.hidden = used;
    elements.btnHaggle.disabled = used;
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
    preparePlayerCaseDisplay,
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
    showHaggleResult,
    showDevOptions,
    hideDevOptions,
    handleTitleClick,
    devRevealAllCases,
    devRevealRemainingCases,
    devRevealPlayerCase
};