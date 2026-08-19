# Deal or No Deal - Classic US Edition

A faithful, fully client-side recreation of the classic American TV game show
**Deal or No Deal**, built with plain HTML, CSS, and JavaScript. There is **no
build step and no dependencies** - you can open index.html directly in any
modern browser (including from the file:// protocol) and start playing.

>  **Language / 语言:** [中文](README.zh.md) | English

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How to Play](#how-to-play)
- [How to Run](#how-to-run)
- [Project Structure](#project-structure)
- [Architecture and How It Works](#architecture-and-how-it-works)
- [Theming](#theming)
- [Internationalization (i18n)](#internationalization-i18n)
- [Audio](#audio)
- [Accessibility](#accessibility)
- [Persistence](#persistence)
- [Customization](#customization)
- [Browser Support](#browser-support)
- [Debug API](#debug-api)
- [License](#License)

## Overview

In Deal or No Deal the player is presented with **26 sealed cases**, each
containing one of 26 monetary amounts from **$0.01 to $1,000,000** (the standard
US prize ladder). One case is randomly assigned to the player and kept hidden.
In each round the player opens a fixed number of the remaining cases, revealing
their amounts and removing them from play. After every round the **Banker** calls
with a cash offer to buy the player's case. The player must choose **DEAL** (sell
the case for the offer) or **NO DEAL** (keep playing). The goal is to beat the
**expected value (EV)** of the player's still-unknown case.

This project reproduces the show's tension with:

- A stage-aware, non-linear Banker AI (with "bait" offers and edge-case logic).
- A once-per-game **Haggle** counter-offer mini-mechanic.
- A live **Expected Value** read-out with a plain-language explanation.
- A polished, animated UI (3D case flips, a "fly-to-your-case" selection
  animation, phone-ring drama, sparkles, modal transitions).
- Full **Light / Dark / System** theming and **Chinese / English / System**
  localization.
- Screen-reader and keyboard support, plus prefers-reduced-motion and
  prefers-contrast handling.

## Features

- **Gameplay:** 26 cases, 9 rounds (6/5/4/3/2/1/1/1/1 cases opened per round),
  Banker offers every round, final Switch-Case decision.
- **Banker AI:** stage-based percentage of EV, triangular-random distribution,
  plus/minus 5-12% volatility, bait offers after 3 consecutive rejections,
  special handling for "all-low" and "million + only-low" boards.
- **Haggle:** one counter-offer per game; accepted only if at or below the
  Banker's hidden ceiling (EV x 0.85-1.15). Quick "+10% / +25% / +50%" buttons.
- **Expected Value:** live EV shown with a friendly explanation so casual
  players understand "is this offer good?".
- **Theming:** Light, Dark, or follow System; persisted; respects OS scheme.
- **i18n:** Chinese, English, or follow System; all UI strings, Banker
  commentary, and dynamic text localized.
- **Animations:** 3D case flip, selection fly-to-player, phone ring, offer
  count-up, result reveal, player-case glow, case swap, sparkles; auto-degrades
  on reduced-motion.
- **Audio:** synthesized sound effects (ring / open / deal) via the Web Audio
  API - no audio files needed.
- **Accessibility:** ARIA roles/labels, keyboard navigation, visible focus
  rings, reduced-motion and high-contrast support.
- **Persistence:** theme, language, and lifetime game statistics in localStorage.
- **Responsive:** fluid grid that reflows to tablet and mobile; print stylesheet.
- **Zero-dependency:** pure static files; classic script tags loaded in
  dependency order so it runs from file://.

## How to Play

1. **Pick your case.** Click any of the 26 cases to make it *your* case. Its
   value stays hidden for the rest of the game.
2. **Open cases.** Each round you open a set number of the *other* cases.
   Opened amounts disappear from the side value-boards (struck through).
3. **The Banker calls.** After each round the Banker shows an offer and the
   *Expected Value* of your case. Decide:
   - **DEAL** - take the offer and end the game.
   - **NO DEAL** - reject and continue to the next round.
   - **Haggle** (once per game) - counter with your own amount; the Banker may
     accept (game ends) or reject (your only move is then NO DEAL).
4. **Final two cases.** After all 9 rounds, only your case and one other case
   remain. You may **Keep** your case or **Switch** with the other one.
5. **Reveal.** Your case (and the other case) is flipped open. Your winnings are
   compared against the EV ("You beat the expected value!").

> **Tip:** An offer *above* the shown Expected Value is statistically a "win".
> The Banker's EV is computed over **all unopened cases, including your own**.

## How to Run

No installation or build is required.

    # Option A - just open the file
    open index.html              # macOS
    xdg-open index.html          # Linux
    start index.html             # Windows

    # Option B - serve it (any static server)
    python3 -m http.server 8000  # then visit http://localhost:8000

Because the project uses classic scripts (not ES modules), it works perfectly
when opened directly from disk via file://. A static server is optional.

## Project Structure

    Deal Or No Deal/
    ├── index.html            # All markup: top controls, game board, modals
    ├── css/
    │   ├── variables.css     # Design tokens + Light/Dark theme variables
    │   ├── base.css          # Reset, utilities, buttons, modals, haggle UI
    │   ├── layout.css        # Game board, panels, cases, modals, responsive
    │   └── animations.css    # Keyframes + motion (flips, ring, reveal, fly)
    └── js/
        ├── i18n.js           # Translation dictionary + t() + language resolve
        ├── config.js         # Constants: values, rounds, banker params, helpers
        ├── state.js          # Central game state + StateManager API
        ├── banker.js         # Offer calculation, drama delay, commentary, haggle
        ├── ui.js             # DOM rendering, animations, events, audio
        └── main.js           # GameController: orchestration and flow

Scripts are loaded **in dependency order** at the bottom of index.html:
i18n -> config -> state -> banker -> ui -> main. Cross-file communication uses
globally-scoped const/functions (no import/export), which is what makes file://
opening work.

## Architecture and How It Works

The app follows a clean **separation of concerns**:

- **config.js** - pure data and stateless helpers (no DOM, no state).
- **state.js** - the single source of truth: a plain state object plus a
  StateManager facade. UI and controller read/write only through it.
- **banker.js** - pure game logic for offers and haggling; reads StateManager.
- **ui.js** - all DOM rendering, animations, event wiring, and sound.
- **main.js** - the GameController that ties events to state to UI and drives
  the round/offer/endgame flow.

This keeps the game deterministic and easy to reason about; the only side
effects live in ui.js (DOM/audio) and state.js (localStorage stats).

### Game State Model

The state object (in state.js) tracks:

| Field | Meaning |
| --- | --- |
| phase | selecting_player_case -> opening_cases -> banker_offer -> switch_case -> game_over |
| caseAssignments | Map<caseNumber, value> - the hidden board |
| playerCaseNumber / playerCaseValue | the player's chosen (still secret) case |
| remainingCases | cases not yet opened (excludes the player's case) |
| openedCases | Map<caseNumber, value> of revealed cases |
| remainingValues | **all** unopened values **including the player's case** (used for EV) |
| currentRoundIndex | 0-based round counter |
| openedThisRound / boxesToOpenThisRound | progress within a round |
| offerHistory / currentOffer | Banker offer tracking |
| consecutiveRejects | drives bait-offer logic |
| haggleUsed | ensures the haggle is once-per-game |
| otherCaseNumber / otherCaseValue | the final-2 opponent case |
| finalDecision / finalWinnings / isGameOver | outcome |
| stats | lifetime { gamesPlayed, gamesWon, totalWinnings, bestWin } |

> **Important EV detail:** remainingValues intentionally keeps the player's case
> value until that case is actually opened. So the Expected Value is the mean of
> *all* unopened cases - a correct "what is my case worth on average right now"
> figure.

### Round / Game Flow

    SELECT CASE --> OPEN CASES (per ROUND_CONFIG) --> BANKER OFFER
                                                         |
                          +------------------------------+
                          v                              v
                      (NO DEAL)                      (DEAL)
                          |                              |
             last round? --No--> next round             +--> GAME OVER (reveal)
                          |
                         Yes
                          v
                SWITCH CASE (keep / switch) --> GAME OVER (reveal)

Rounds open **6, 5, 4, 3, 2, 1, 1, 1, 1** other cases (25 total), leaving the
player's case plus exactly one other case for the Switch-Case finale.

### Expected Value

    calculateExpectedValue() = sum(remainingValues) / remainingValues.length

The value is displayed beside every Banker offer and in the final summary,
accompanied by a plain-language explainer (key ev.explainer) so players
understand the reference line.

### Banker Offer Algorithm

Implemented in calculateBankerOffer() (banker.js):

1. Compute the **Expected Value** of all remaining cases.
2. Choose a base percentage by **stage**:
   - Early rounds (1-3): **15%-35%** of EV
   - Mid rounds (4-6): **40%-65%** of EV
   - Late rounds (7-9): **70%-92%** of EV
3. Pick the percentage via a **triangular distribution** centered on the stage
   midpoint (so "typical" offers are more likely than extremes).
4. Apply **volatility** of plus/minus 5% to 12% in a random direction.
5. **Bait offer:** after **3+ consecutive rejections**, there is a 30% chance
   the Banker adds an extra **+5% to +15%** "sweetener" to lure a DEAL.
6. **Board-aware tweaks:**
   - If only *low* values remain, the offer is bumped **+10% to +20%**.
   - If the only remaining high value is **$1,000,000** with everything else
     sub-$1,000 ("million or nothing"), the offer is discounted to **85%**.
7. **Sanity clamps:** offer is capped at 95% of the max remaining value and
   floored at the min remaining value.
8. **Rounding:** amounts below $1,000 round to the nearest $1; at or above
   $1,000 round to the nearest $100.

The offer is then delivered via generateBankerOfferWithDrama(), which inserts a
short "Banker thinking" delay (configurable in TIMING) before resolving.

### Haggle (Counter-Offer) Mechanic

Once per game the player may counter the Banker's offer:

    resolveHaggle(counter, originalOffer, expectedValue):
        ceiling = expectedValue * random(0.85, 1.15)   // Banker's hidden max
        accepted = counter <= ceiling

- **Accepted** - the counter becomes the final offer and the game ends as a DEAL.
- **Rejected** - the original offer is voided and the game force-continues as
  NO DEAL (the player does not get a second chance to haggle).

Quick-add buttons (+10% / +25% / +50% of the current offer) prefill the input.

### Switch Case Endgame

When only two cases remain, the UI shows both. The player chooses **Keep** or
**Switch**. Internally keepCase() pays the player's own value, while
switchCase() swaps the displayed values and pays the *other* case's value
(finalWinnings = otherCaseValue). The reveal then opens the player's (new) case
dramatically.

## Theming

- Toggle via the moon/sun/monitor button (top-right). Choices: **Light**,
  **Dark**, **System** (follow OS via prefers-color-scheme).
- Active preference is stored under localStorage key don_theme_preference.
- All colors are CSS custom properties in css/variables.css; switching only
  flips the data-theme attribute on the html element.

## Internationalization (i18n)

- Toggle via the 中/EN/ globe button (top-right). Choices: **Chinese**,
  **English**, **System** (uses navigator.language; anything starting with en
  becomes English, otherwise Chinese).
- Preference stored under localStorage key don_lang_preference.
- i18n.js holds flat dot-notation keys (for example round.current,
  banker.comments.low) for both languages. applyStaticI18n() swaps text on
  elements marked with data-i18n (and attributes via data-i18n-attr), while
  UI.applyI18n() refreshes dynamic regions (round info, result modal).
- The Banker's random commentary pools are localized too.

## Audio

Sound effects are **synthesized at runtime** with the Web Audio API
(ui.js -> playSound('ring' | 'open' | 'deal')); there are no audio files to
download. The AudioContext is created on the player's first interaction to
satisfy browser autoplay policies.

## Accessibility

- Cases are role="button", tabindex="0", with localized aria-label values.
- Keyboard: **Arrow keys** move focus between unopened cases; **Enter/Space**
  opens; **D** = DEAL, **N** = NO DEAL (during an offer); **Esc** dismisses the
  Banker/Switch modals (defaults to NO DEAL / Keep).
- Visible :focus-visible outlines; prefers-reduced-motion disables non-essential
  animation; prefers-contrast: high strengthens borders.
- Modals use role="dialog", aria-modal, and labelled headings.

## Persistence

| Key | Contents |
| --- | --- |
| don_theme_preference | 'light' | 'dark' | 'system' |
| don_lang_preference | 'zh' | 'en' | 'system' |
| don_game_stats | lifetime stats JSON (gamesPlayed, gamesWon, totalWinnings, bestWin) |

Stats are accumulated in StateManager.updateStats() after every game and
survive reloads.

## Customization

Almost everything tunable lives in **js/config.js**:

- **CASE_VALUES** - the 26 prize amounts. Keep it length 26 for a full board, or
  change the ladder entirely. LOW_VALUE_COUNT (13) splits the side value-boards
  into Low/High halves.
- **ROUND_CONFIG** - per-round boxesToOpen. The sum should be 25 so that exactly
  one non-player case remains for the Switch finale. TOTAL_ROUNDS derives
  automatically from this array.
- **BANKER_CONFIG** - stage percentage ranges (early/mid/late), volatility,
  baitTriggerRejects (default 3) and baitBonus, plus rounding thresholds.
- **TIMING** - pacing in ms: gap before the Banker calls, "thinking" delay
  (bankerThinkMin/Max), and the decorative ring duration.
- Helper functions formatCurrency, isHighValue, getValueClass, shuffleArray
  (Fisher-Yates), generateCaseNumbers, getValueLabel.

Theme tokens, button colors, and layout dimensions are all CSS variables in
css/variables.css and can be re-skinned without touching JS.

## Browser Support

- Modern evergreen browsers (Chrome, Edge, Firefox, Safari) that support CSS
  custom properties, aspect-ratio, backdrop-filter, and the Web Audio API.
- Works from file:// (no module/CORS issues) and from any static host.

## Debug API

For development, the page exposes a global window.DealOrNoDeal with direct
access to the core objects:

    window.DealOrNoDeal.StateManager   // state facade
    window.DealOrNoDeal.GameController // flow controller
    window.DealOrNoDeal.UI             // rendering/animation helpers

Open the browser console to inspect StateManager.getState(), force offers, or
step through the game programmatically.

## License

This project is licensed under the [MIT License](LICENSE).

## Star History

<a href="https://www.star-history.com/?repos=ljy969%2FDEAL-OR-NO-DEAL&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=ljy969/DEAL-OR-NO-DEAL&type=date&theme=dark&legend=top-left&sealed_token=wuYBrwi7UXn1fHsg9MnezI9qEsNr2V-zl8dNKc2HdFCqnZ5lL3cIdg4J-SB8O4NC1QZGv9FemJ23m9bXX_1WVYgZWA6Pyh20d66vsbuZOTVquQIXAeJGuA" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=ljy969/DEAL-OR-NO-DEAL&type=date&legend=top-left&sealed_token=wuYBrwi7UXn1fHsg9MnezI9qEsNr2V-zl8dNKc2HdFCqnZ5lL3cIdg4J-SB8O4NC1QZGv9FemJ23m9bXX_1WVYgZWA6Pyh20d66vsbuZOTVquQIXAeJGuA" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=ljy969/DEAL-OR-NO-DEAL&type=date&legend=top-left&sealed_token=wuYBrwi7UXn1fHsg9MnezI9qEsNr2V-zl8dNKc2HdFCqnZ5lL3cIdg4J-SB8O4NC1QZGv9FemJ23m9bXX_1WVYgZWA6Pyh20d66vsbuZOTVquQIXAeJGuA" />
 </picture>
</a>
