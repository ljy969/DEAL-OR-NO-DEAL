/**
 * 国际化（i18n）模块
 * 提供中英文翻译字典、t() 取词函数、静态 DOM 文本替换（applyStaticI18n），
 * 以及"跟随系统语言"的默认解析逻辑。
 *
 * 说明：本项目为普通脚本（classic script）加载，i18n.js 需在其它脚本之前引入，
 * 这里通过全局 const/function 暴露接口，供 ui.js / banker.js / main.js 使用。
 */

// ========================================
// 翻译字典
// 键名统一采用 "命名空间.子项" 的语义化形式；{n} / {opened} / {total} 为占位符。
// round.progress 的值内含 <b> 标签，用于重渲染时保留数字加粗样式。
// ========================================
const I18N = {
    zh: {
        'app.title': 'Deal or No Deal - 美版经典游戏',

        // 顶部控制：主题 / 语言
        'theme.label': '主题设置',
        'theme.menuAria': '选择主题',
        'theme.light': '☀️ 浅色',
        'theme.dark': '🌙 深色',
        'theme.system': '🖥️ 跟随系统',
        'lang.buttonAria': '语言',
        'lang.menuAria': '选择语言',
        'lang.zh': '🇨🇳 中文',
        'lang.en': '🇺🇸 English',
        'lang.system': '🖥️ 跟随系统',

        // 金额面板
        'panel.low.title': '低值金额',
        'panel.low.aria': '低值金额列表',
        'panel.high.title': '高值金额',
        'panel.high.aria': '高值金额列表',

        // 你的箱子
        'player.case.label': '你的箱子',

        // 轮次信息
        'round.current': '第 {n} 轮',
        'round.final': '最终轮',
        'round.toOpen': '需开启 {n} 个箱子',
        'round.progress': '已开启: <b>{opened}</b> / <b>{total}</b>',

        // 银行家报价弹窗
        'banker.title': '📞 银行家来电',
        'banker.offerLabel': '银行家报价',
        'banker.expectedLabel': '你的箱子期望值',

        // 期望值白话解释（弹窗与结算共用）
        'ev.explainer': '期望值 = 所有还没打开的箱子（包括你自己的箱子）里金额的平均值，代表“你的箱子平均大概值多少钱”。它是判断银行家报价划不划算的参考线：报价高于期望值就是赚到。',

        // 按钮
        'btn.deal.sub': '接受报价',
        'btn.noDeal.sub': '拒绝，继续游戏',
        'btn.keep': '保留原箱子',
        'btn.switch': '交换箱子',
        'btn.restart': '再来一局',

        // 交换箱子弹窗
        'switch.title': '🔄 交换箱子？',
        'switch.text': '只剩下两个箱子了。你要保留自己的箱子，还是与另一个箱子交换？',
        'switch.playerLabel': '你的箱子',
        'switch.otherLabel': '另一个箱子',

        // 结算弹窗
        'result.title': '游戏结束',
        'result.deal.label': '你接受了报价',
        'result.bankerAccepted.label': '银行家接受了报价',
        'result.keep.label': '你保留了自己的箱子',
        'result.switch.label': '你交换了箱子',
        'result.playerCaseWas': '你的箱子里其实是：',
        'result.otherWas': '另一个箱子是：',
        'result.origWas': '你原本的箱子是：',
        'result.ev.label': '你的箱子期望值（平均可能值）',
        'result.beat': '🎉 你战胜了期望值！',
        'result.below': '📉 低于期望值',

        // 选择箱子提示
        'instruction.banner': '请选择一个箱子作为你的箱子（点击任意箱子）',

        // 箱子无障碍标签
        'case.aria': '箱子 {n}',

        // 银行家评论（随机选取）
        'banker.comments.low': [
            '银行家认为你的箱子里只有零头。',
            '这个报价简直是侮辱……但也是策略。',
            '银行家在压价，别上当。',
            '典型的低球报价，试探你的底线。'
        ],
        'banker.comments.fair': [
            '银行家给出了一个还算公允的价格。',
            '这个报价接近数学期望，值得考虑。',
            '不算慷慨，但也不算吝啬。',
            '理性的报价，决策权在你手中。'
        ],
        'banker.comments.high': [
            '银行家似乎很想买走你的箱子。',
            '这个报价超出期望值，可能有诈？',
            '罕见的慷慨报价，或者是陷阱？',
            '银行家可能看好你的箱子……'
        ],
        'banker.comments.bait': [
            '连续拒绝后，银行家松口了？',
            '诱饵报价！小心别被诱惑。',
            '银行家急了，给出高价求成交。',
            '这报价太诱人了，一定有猫腻。'
        ],
        'banker.haggle.button': '🤝 讨价还价',
        'banker.haggle.sub': '还价（整局一次）',
        'banker.haggle.hint': '输入你期望的金额，银行家可能接受，也可能拒绝。整局仅此一次机会。',
        'banker.haggle.inputLabel': '你的还价金额',
        'banker.haggle.submit': '提出还价',
        'banker.haggle.cancel': '取消',
        'banker.haggle.accepted': '🤝 银行家接受了你的还价 {amount}，游戏结束！',
        'banker.haggle.rejected': '🙅 银行家拒绝了还价，交易取消，你只能继续游戏（原报价 {amount} 已作废）。',
        'banker.haggle.invalid': '请输入一个有效的金额（大于 0）。',
        'banker.haggle.used': '本局还价机会已用完',

        // 开发者选项（彩蛋：连续点击标题 5 次解锁）
        'dev.title': '🛠 开发者选项',
        'dev.hint': '仅供调试：查看本局箱子的真实金额（原本对玩家隐藏）。',
        'dev.all': '💰 查看所有箱子金额',
        'dev.remaining': '📦 查看剩余箱子金额',
        'dev.mine': '🔓 查看我的箱子金额',
        'dev.close': '关闭',
        'dev.remainingDone': '已在下方列出尚未开启的 {count} 个箱子（★ 为你的箱子）。',
        'dev.noCase': '你还没有选择自己的箱子（请先在游戏中选一个）。',
        'dev.mineResult': '你的箱子（{num} 号）里是 {value}。',
        'dev.allDone': '已在下方列出全部 26 个箱子的金额。'
    },

    en: {
        'app.title': 'Deal or No Deal - Classic US Edition',

        'theme.label': 'Theme',
        'theme.menuAria': 'Select theme',
        'theme.light': '☀️ Light',
        'theme.dark': '🌙 Dark',
        'theme.system': '🖥️ System',
        'lang.buttonAria': 'Language',
        'lang.menuAria': 'Select language',
        'lang.zh': '🇨🇳 中文',
        'lang.en': '🇺🇸 English',
        'lang.system': '🖥️ System',

        'panel.low.title': 'Low Values',
        'panel.low.aria': 'Low value amounts list',
        'panel.high.title': 'High Values',
        'panel.high.aria': 'High value amounts list',

        'player.case.label': 'Your Case',

        'round.current': 'Round {n}',
        'round.final': 'Final Round',
        'round.toOpen': 'Open {n} cases',
        'round.progress': 'Opened: <b>{opened}</b> / <b>{total}</b>',

        'banker.title': '📞 Banker Calling',
        'banker.offerLabel': "Banker's Offer",
        'banker.expectedLabel': 'Your Case EV',

        'ev.explainer': "EV = the average of all unopened cases (including your own). It represents \"about how much your case is worth on average.\" It is the reference line for judging the banker's offer: an offer above EV means you win.",

        'btn.deal.sub': 'Accept Offer',
        'btn.noDeal.sub': 'Reject & Continue',
        'btn.keep': 'Keep My Case',
        'btn.switch': 'Switch Cases',
        'btn.restart': 'Play Again',

        'switch.title': '🔄 Switch Case?',
        'switch.text': 'Only two cases remain. Keep your case, or switch with the other one?',
        'switch.playerLabel': 'Your Case',
        'switch.otherLabel': 'Other Case',

        'result.title': 'Game Over',
        'result.deal.label': 'You Accepted the Deal',
        'result.bankerAccepted.label': 'The Banker Accepted the Offer',
        'result.keep.label': 'You Kept Your Case',
        'result.switch.label': 'You Switched Cases',
        'result.playerCaseWas': 'Your case actually contained: ',
        'result.otherWas': 'The other case was: ',
        'result.origWas': 'Your original case was: ',
        'result.ev.label': 'Your Case EV (average)',
        'result.beat': '🎉 You beat the expected value!',
        'result.below': '📉 Below expected value',

        'instruction.banner': 'Pick a case to be your case (click any case)',

        'case.aria': 'Case {n}',

        'banker.comments.low': [
            'The banker thinks your case is worth pennies.',
            'This offer is an insult… but it is a strategy.',
            'The banker is lowballing you. Do not fall for it.',
            'A classic lowball offer to test your limit.'
        ],
        'banker.comments.fair': [
            'The banker gave a fairly reasonable price.',
            'This offer is close to the expected value. Worth considering.',
            'Not generous, but not stingy either.',
            'A rational offer. The decision is yours.'
        ],
        'banker.comments.high': [
            'The banker seems eager to buy your case.',
            'This offer exceeds the EV. Could be a trap?',
            'A rare generous offer, or a trap?',
            'The banker might be bullish on your case…'
        ],
        'banker.comments.bait': [
            'After repeated rejections, the banker caves?',
            'Bait offer! Careful not to be tempted.',
            'The banker is desperate, offering high to close the deal.',
            'This offer is too tempting. There must be a catch.'
        ],
        'banker.haggle.button': '🤝 Negotiate',
        'banker.haggle.sub': 'Counter (once per game)',
        'banker.haggle.hint': 'Enter the amount you want. The banker may accept or reject. You only get one chance per game.',
        'banker.haggle.inputLabel': 'Your counter amount',
        'banker.haggle.submit': 'Make Counter',
        'banker.haggle.cancel': 'Cancel',
        'banker.haggle.accepted': '🤝 The banker accepted your counter: {amount}! Game over.',
        'banker.haggle.rejected': '🙅 The banker rejected your counter. The deal is off — you must continue (offer {amount} is void).',
        'banker.haggle.invalid': 'Please enter a valid amount (greater than 0).',
        'banker.haggle.used': 'No haggle chances left this game',

        // Developer Options (easter egg: click the title 5 times)
        'dev.title': '🛠 Developer Options',
        'dev.hint': "Debug only: reveal this game's real case amounts (normally hidden from the player).",
        'dev.all': '💰 Reveal All Cases',
        'dev.remaining': '📦 Reveal Remaining Cases',
        'dev.mine': '🔓 Reveal My Case',
        'dev.close': 'Close',
        'dev.remainingDone': 'Lists the {count} still-unopened cases below (★ = your case).',
        'dev.noCase': "You haven't picked your case yet (choose one in the game first).",
        'dev.mineResult': 'Your case (#{num}) contains {value}.',
        'dev.allDone': 'All 26 cases are listed below.'
    }
};

// 语言偏好存储键
const LANG_STORAGE_KEY = 'don_lang_preference';

/**
 * 读取已保存的语言偏好（'zh' | 'en' | 'system' | null）
 */
function getStoredLangPref() {
    try {
        return localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

/**
 * 解析实际生效语言：
 * - 'zh' / 'en' 直接用；
 * - 'system' 或未设置（null）→ 跟随浏览器/系统语言（以 en 开头视为英文，其余视为中文）。
 * @param {string|null} pref
 * @returns {'zh'|'en'}
 */
function resolveLanguage(pref) {
    if (pref === 'zh' || pref === 'en') return pref;
    const nav = (navigator.language || 'zh-CN').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'zh';
}

/**
 * 获取当前实际生效语言
 * @returns {'zh'|'en'}
 */
function getLang() {
    return resolveLanguage(getStoredLangPref());
}

/**
 * 沿点号路径读取字典值
 */
/**
 * 取词函数
 * 字典采用扁平的点号键名（如 'round.current'），直接按整键取值。
 * @param {string} key - 形如 'round.current'
 * @param {object} [params] - 占位符替换，如 { n: 3 }
 * @returns {string|Array} 翻译字符串或（评论场景下的）字符串数组
 */
function t(key, params) {
    const lang = getLang();
    const dict = I18N[lang] || I18N.zh;
    let val = (key in dict) ? dict[key] : I18N.zh[key];
    if (typeof val === 'string') {
        if (params) {
            val = val.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? params[name] : m));
        }
        return val;
    }
    return val; // 数组（银行家评论）原样返回
}

/**
 * 将带有 data-i18n 的静态 DOM 文本替换为当前语言。
 * - 仅有 data-i18n：设置 textContent；
 * - 同时有 data-i18n-attr="title,aria-label"：设置对应属性。
 * 另外统一设置 document.title。
 */
function applyStaticI18n() {
    document.title = t('app.title');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr');
        const val = t(key);
        if (typeof val !== 'string') return; // 数组等不处理
        if (attr) {
            attr.split(',').forEach((a) => el.setAttribute(a.trim(), val));
        } else {
            el.textContent = val;
        }
    });
}

// 暴露到全局供其它脚本使用
window.I18N = I18N;
window.t = t;
window.getLang = getLang;
window.resolveLanguage = resolveLanguage;
window.applyStaticI18n = applyStaticI18n;
window.LANG_STORAGE_KEY = LANG_STORAGE_KEY;
