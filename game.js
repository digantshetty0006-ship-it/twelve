(() => {
  "use strict";

  const MONTHS = [
    { short: "JAN", name: "January", days: 31 },
    { short: "FEB", name: "February", days: 28 },
    { short: "MAR", name: "March", days: 31 },
    { short: "APR", name: "April", days: 30 },
    { short: "MAY", name: "May", days: 31 },
    { short: "JUN", name: "June", days: 30 },
    { short: "JUL", name: "July", days: 31 },
    { short: "AUG", name: "August", days: 31 },
    { short: "SEP", name: "September", days: 30 },
    { short: "OCT", name: "October", days: 31 },
    { short: "NOV", name: "November", days: 30 },
    { short: "DEC", name: "December", days: 31 }
  ];

  const QUARTER_COLOURS = ["#3e5a67", "#69754b", "#b3872e", "#b23a1f"];
  const YEAR_DAYS = 365;
  const BASE_PERFECT_WINDOW = 6.5;
  const CONTRACT_RING_LENGTH = 2 * Math.PI * 306;
  const PROGRESS_KEY = "twelve-progress-v2";
  const SOUND_KEY = "twelve-sound";

  const DIFFICULTIES = {
    calm: {
      label: "Calm",
      lives: 5,
      speed: 0.85,
      perfect: 1.25,
      note: "Five mornings. A slower hand and a wider perfect window."
    },
    standard: {
      label: "Standard",
      lives: 3,
      speed: 1,
      perfect: 1,
      note: "Three mornings. The year as intended."
    },
    frenzy: {
      label: "Frenzy",
      lives: 2,
      speed: 1.15,
      perfect: 0.78,
      note: "Two mornings. A faster hand and a thinner perfect window."
    }
  };

  const LEVELS = [
    { name: "First Light", targets: 3, speed: 38, order: "calendar", twists: [], note: "Learn the rhythm. Three months, in order." },
    { name: "Headwind", targets: 4, speed: 44, order: "calendar", twists: [], note: "The hand picks up pace." },
    { name: "Crosswind", targets: 4, speed: 50, order: "shuffle", twists: [], note: "The months arrive out of order." },
    { name: "Mirage", targets: 5, speed: 56, order: "shuffle", twists: ["mirage"], note: "One month is a false light. Trust the marker." },
    { name: "Flicker", targets: 5, speed: 62, order: "calendar", twists: ["blink"], note: "The lit month keeps blinking out." },
    { name: "Undertow", targets: 6, speed: 68, order: "shuffle", twists: ["reverse"], note: "The hand turns back after every lock." },
    { name: "Gust", targets: 6, speed: 74, order: "calendar", twists: ["gust"], note: "The hand speeds up and slows down." },
    { name: "Second Sun", targets: 7, speed: 80, order: "shuffle", twists: ["mirage", "blink"], note: "A decoy that flickers." },
    { name: "Backspin", targets: 8, speed: 86, order: "shuffle", twists: ["reverse", "narrow"], note: "Reverse, and the perfect window tightens." },
    { name: "Squall", targets: 9, speed: 92, order: "calendar", twists: ["gust", "mirage"], note: "Wind and a false light." },
    { name: "Whiteout", targets: 10, speed: 98, order: "shuffle", twists: ["blink", "reverse", "narrow"], note: "Everything is moving." },
    { name: "The Long Year", targets: 12, speed: 104, order: "shuffle", twists: ["mirage", "blink", "gust", "reverse", "narrow"], note: "Twelve months. Every trick at once." }
  ];

  const TWIST_LABELS = {
    mirage: "Mirage",
    blink: "Blink",
    reverse: "Reverse",
    gust: "Gust",
    narrow: "Narrow"
  };

  const svgNS = "http://www.w3.org/2000/svg";
  const $ = (sel) => document.querySelector(sel);
  const scoreFormatter = new Intl.NumberFormat("en-IN");

  const dial = $("#dial");
  const dialStage = $("#dial-stage");
  const needle = $("#needle");
  const sectorsGroup = $("#sectors");
  const labelsGroup = $("#month-labels");
  const weekTicksGroup = $("#week-ticks");
  const dayTicksGroup = $("#day-ticks");
  const ledgerList = $("#ledger-list");
  const centerMonth = $("#center-month");
  const centerEyebrow = $("#center-eyebrow");
  const centerSub = $("#center-sub");
  const contractDoneEl = $("#contract-done");
  const contractTotalEl = $("#contract-total");
  const dayFillEl = $("#day-fill");
  const scoreEl = $("#score-value");
  const perfectEl = $("#perfect-value");
  const comboEl = $("#combo-value");
  const morningsEl = $("#mornings");
  const bestEl = $("#best-value");
  const bestFootEl = $("#best-foot");
  const primary = $("#primary");
  const primaryLabel = $("#primary-label");
  const hint = $("#hint");
  const statusEl = $("#status");
  const levelLabel = $("#level-label");
  const roundLabel = $("#round-label");
  const feedbackEl = $("#feedback");
  const resultDialog = $("#result-dialog");
  const aboutDialog = $("#about-dialog");
  const levelsDialog = $("#levels-dialog");
  const clockEl = $("#clock");
  const soundToggle = $("#sound-toggle");
  const soundLabel = $("#sound-label");
  const levelRail = $("#level-rail");
  const contractChips = $("#contract-chips");
  const twistRow = $("#twist-row");
  const contractRing = $("#contract-ring");
  const burstEl = $("#burst");
  const difficultyNote = $("#difficulty-note");
  const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
  const resultKicker = $("#result-kicker");
  const resultScore = $("#result-score");
  const resultLabel = $("#result-label");
  const resultTitle = $("#result-title");
  const resultCopyEl = $("#result-copy");
  const resultContract = $("#result-contract");
  const resultPerfect = $("#result-perfect");
  const resultCombo = $("#result-combo");
  const resultPrimary = $("#result-primary");
  const resultPrimaryLabel = $("#result-primary-label");
  const levelGrid = $("#level-grid");

  const sectorEls = [];
  const labelEls = [];
  const dotEls = [];
  const ledgerEls = [];

  const progress = loadProgress();

  const state = {
    mode: "idle",              // idle | countdown | playing | levelclear | failed
    level: 0,
    selectedLevel: 0,
    difficulty: progress.difficulty,
    angle: -18,
    dir: 1,
    baseSpeed: 38,
    speed: 38,
    target: -1,
    contract: [],
    queue: [],
    locked: Array(12).fill(false),
    clearMonths: Array(12).fill(false),
    twists: new Set(),
    mirage: -1,
    lives: 3,
    maxLives: 3,
    hits: 0,
    perfects: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    gustPhase: 0,
    lastGust: null,
    countdown: 0,
    lastCount: 0,
    lastFrame: 0,
    lastBoundary: 0,
    resultTimer: null,
    feedbackTimer: null
  };

  /* ------------------------------------------------------------- helpers */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalize(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatScore(value) {
    return scoreFormatter.format(Math.max(0, Math.round(value)));
  }

  function comboMultiplier(combo = state.combo) {
    return 1 + Math.min(combo, 10) * 0.1;
  }

  function angleDistance(a, b) {
    const diff = Math.abs(normalize(a) - normalize(b));
    return Math.min(diff, 360 - diff);
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function polar(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function sectorPath(cx, cy, inner, outer, start, end) {
    const o1 = polar(cx, cy, outer, start);
    const o2 = polar(cx, cy, outer, end);
    const i2 = polar(cx, cy, inner, end);
    const i1 = polar(cx, cy, inner, start);
    const large = end - start > 180 ? 1 : 0;
    return [
      `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
      `A ${outer} ${outer} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
      `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
      `A ${inner} ${inner} 0 ${large} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
      "Z"
    ].join(" ");
  }

  function el(tag, attrs = {}, className = "") {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (className) node.setAttribute("class", className);
    return node;
  }

  function quarterColour(index) {
    return QUARTER_COLOURS[Math.floor(index / 3) % 4];
  }

  function monthFromAngle(angle) {
    return Math.floor(normalize(angle) / 30) % 12;
  }

  function defaultProgress() {
    return { unlocked: 1, completed: false, best: {}, difficulty: "standard" };
  }

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (!raw) return defaultProgress();
      const parsed = JSON.parse(raw);
      const next = defaultProgress();
      if (Number.isInteger(parsed.unlocked)) next.unlocked = clamp(parsed.unlocked, 1, 12);
      next.completed = Boolean(parsed.completed);
      if (parsed.best && typeof parsed.best === "object") {
        Object.entries(parsed.best).forEach(([key, value]) => {
          const index = Number(key);
          if (Number.isInteger(index) && index >= 0 && index < 12 && Number.isFinite(value) && value >= 0) {
            next.best[index] = Math.floor(value);
          }
        });
      }
      if (DIFFICULTIES[parsed.difficulty]) next.difficulty = parsed.difficulty;
      return next;
    } catch (error) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
      /* Private mode or storage disabled: the game still works. */
    }
  }

  /* ------------------------------------------------------------ build dial */

  function buildDial() {
    for (let i = 0; i < YEAR_DAYS; i += 1) {
      const deg = (i / YEAR_DAYS) * 360;
      const major = i % 5 === 0;
      const p1 = polar(320, 320, 165, deg);
      const p2 = polar(320, 320, major ? 173 : 170, deg);
      dayTicksGroup.appendChild(el("line", {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2)
      }, major ? "day-tick major" : "day-tick"));
    }

    for (let i = 0; i < 52; i += 1) {
      const deg = (i / 52) * 360;
      const p1 = polar(320, 320, 258, deg);
      const p2 = polar(320, 320, 266, deg);
      weekTicksGroup.appendChild(el("line", {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2)
      }, "week-tick"));
    }

    MONTHS.forEach((month, index) => {
      const start = index * 30;
      const end = start + 30;
      const colour = quarterColour(index);

      const monthTick1 = polar(320, 320, 252, start);
      const monthTick2 = polar(320, 320, 270, start);
      weekTicksGroup.appendChild(el("line", {
        x1: monthTick1.x.toFixed(2), y1: monthTick1.y.toFixed(2),
        x2: monthTick2.x.toFixed(2), y2: monthTick2.y.toFixed(2)
      }, "week-tick month-tick"));

      const sector = el("path", {
        d: sectorPath(320, 320, 198, 250, start + 1.1, end - 1.1)
      }, "sector");
      sector.style.setProperty("--season", colour);
      sector.dataset.month = String(index);
      sectorsGroup.appendChild(sector);
      sectorEls.push(sector);

      const labelPos = polar(320, 320, 284, start + 15);
      const label = el("text", {
        x: labelPos.x.toFixed(2),
        y: labelPos.y.toFixed(2),
        "text-anchor": "middle",
        "dominant-baseline": "middle"
      }, "month-label");
      label.textContent = month.short;
      labelsGroup.appendChild(label);
      labelEls.push(label);

      const dotPos = polar(320, 320, 272, start + 15);
      const dot = el("circle", {
        cx: dotPos.x.toFixed(2),
        cy: dotPos.y.toFixed(2),
        r: "2"
      }, "month-dot");
      labelsGroup.appendChild(dot);
      dotEls.push(dot);
    });

    MONTHS.forEach((month, index) => {
      const item = document.createElement("li");
      item.className = "ledger-item";
      item.dataset.month = String(index);
      item.innerHTML = `
        <span class="li-month">${month.short}</span>
        <span class="li-bar" aria-hidden="true"><i></i></span>
        <span class="li-state">—</span>
      `;
      item.style.setProperty("--season", quarterColour(index));
      item.title = `${month.name}: ${month.days} days`;
      ledgerList.appendChild(item);
      ledgerEls.push(item);
    });
  }

  /* --------------------------------------------------------------- render */

  function renderAll() {
    renderLevelHeader();
    renderLevelRail();
    renderContract();
    renderTwistTags();
    renderDialStates();
    renderLedger();
    renderStats();
    renderProgressSlip();
    renderDifficulty();
    renderContractRing();
    updateCentre();
    updatePrimary();
  }

  function renderLevelHeader() {
    const level = LEVELS[state.level];
    levelLabel.textContent = `Level ${pad2(state.level + 1)} / 12 · ${level.name}`;
    if (state.mode === "playing") {
      roundLabel.textContent = `${state.queue.length} ${state.queue.length === 1 ? "month" : "months"} left`;
    } else if (state.mode === "countdown") {
      roundLabel.textContent = "Get ready";
    } else if (state.mode === "levelclear") {
      roundLabel.textContent = "Contract kept";
    } else if (state.mode === "failed") {
      roundLabel.textContent = "Contract lost";
    } else {
      roundLabel.textContent = `${level.targets} months to keep`;
    }
  }

  function renderLevelRail() {
    levelRail.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const unlocked = index < progress.unlocked || progress.completed;
      const cleared = progress.best[index] !== undefined;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-pip";
      button.textContent = pad2(index + 1);
      button.classList.toggle("unlocked", unlocked);
      button.classList.toggle("cleared", cleared);
      button.classList.toggle("current", index === state.level);
      button.classList.toggle("locked", !unlocked);
      button.disabled = !unlocked || state.mode === "countdown" || state.mode === "playing";
      button.title = `Level ${index + 1}: ${level.name}${cleared ? " · cleared" : ""}${unlocked ? "" : " · locked"}`;
      button.setAttribute("aria-label", `Level ${index + 1}, ${level.name}${cleared ? ", cleared" : ""}${unlocked ? "" : ", locked"}`);
      button.addEventListener("click", () => selectLevel(index));
      levelRail.appendChild(button);
    });
  }

  function renderContract() {
    contractChips.innerHTML = "";
    const current = state.queue[0];
    const showCurrent = state.mode === "idle" || state.mode === "countdown" || state.mode === "playing";
    state.contract.forEach((monthIndex, index) => {
      const chip = document.createElement("span");
      const done = Boolean(state.locked[monthIndex]);
      const isCurrent = !done && showCurrent && monthIndex === current;
      chip.className = "contract-chip";
      chip.classList.toggle("done", done);
      chip.classList.toggle("current", isCurrent);
      chip.innerHTML = `<span class="chip-index">${pad2(index + 1)}</span>${MONTHS[monthIndex].short}`;
      chip.title = `${MONTHS[monthIndex].name}${done ? " · kept" : ""}`;
      contractChips.appendChild(chip);
    });
  }

  function renderTwistTags() {
    twistRow.innerHTML = "";
    state.lastGust = null;
    const twists = LEVELS[state.level].twists;
    if (!twists.length) {
      const tag = document.createElement("span");
      tag.className = "twist-tag";
      tag.textContent = "No modifiers";
      twistRow.appendChild(tag);
      return;
    }
    twists.forEach((twist) => {
      const tag = document.createElement("span");
      tag.className = "twist-tag hot";
      if (state.mode === "playing") tag.classList.add("live");
      tag.dataset.twist = twist;
      if (twist === "reverse") {
        tag.textContent = state.dir === 1 ? "Reverse ↻" : "Reverse ↺";
      } else {
        tag.textContent = TWIST_LABELS[twist];
      }
      twistRow.appendChild(tag);
    });
  }

  function renderDialStates() {
    const target = state.mode === "playing" ? state.queue[0] : -1;
    const previewMode = state.mode === "idle" || state.mode === "countdown";
    const previewSet = new Set(state.contract);
    const first = state.contract[0];
    const mirage = state.mode === "playing" ? state.mirage : -1;
    const blink = state.mode === "playing" && state.twists.has("blink");

    sectorEls.forEach((sector, index) => {
      sector.classList.toggle("target", index === target);
      sector.classList.toggle("complete", Boolean(state.locked[index]));
      sector.classList.toggle("clear", Boolean(state.clearMonths[index]));
      sector.classList.toggle("mirage", index === mirage);
      sector.classList.toggle("blink", index === target && blink);
      sector.classList.toggle("preview", previewMode && previewSet.has(index));
      sector.classList.toggle("preview-first", previewMode && index === first);
    });

    labelEls.forEach((label, index) => {
      label.classList.toggle("target", index === target);
      label.classList.toggle("complete", Boolean(state.locked[index]));
      label.classList.toggle("mirage", index === mirage);
      label.classList.toggle("preview", previewMode && previewSet.has(index));
      label.classList.toggle("preview-first", previewMode && index === first);
    });

    dotEls.forEach((dot, index) => {
      dot.classList.toggle("target", index === target);
      dot.classList.toggle("complete", Boolean(state.locked[index]));
      dot.classList.toggle("mirage", index === mirage);
      dot.classList.toggle("preview", previewMode && previewSet.has(index));
      dot.classList.toggle("preview-first", previewMode && index === first);
    });
  }

  function renderLedger() {
    const current = state.queue[0];
    const showNext = state.mode === "idle" || state.mode === "countdown";
    ledgerEls.forEach((item, index) => {
      const done = Boolean(state.locked[index]);
      const inContract = state.contract.includes(index);
      const isCurrent = (state.mode === "playing" && index === current) || (showNext && index === state.contract[0]);
      item.classList.toggle("target", isCurrent);
      item.classList.toggle("complete", done);
      item.classList.toggle("clear", Boolean(state.clearMonths[index]));
      item.classList.toggle("queued", inContract && !done && !isCurrent);
      const stateEl = item.querySelector(".li-state");
      if (done) {
        stateEl.textContent = state.clearMonths[index] ? "Clear" : "Kept";
      } else if (isCurrent) {
        stateEl.textContent = "Next";
      } else if (inContract) {
        stateEl.textContent = "Queued";
      } else {
        stateEl.textContent = "—";
      }
    });
  }

  function renderStats() {
    const total = state.contract.length || LEVELS[state.level].targets;
    contractDoneEl.textContent = String(state.hits);
    contractTotalEl.textContent = String(total);
    dayFillEl.style.width = `${(state.hits / Math.max(1, total)) * 100}%`;
    scoreEl.textContent = formatScore(state.score);
    perfectEl.textContent = String(state.perfects);
    comboEl.textContent = `×${comboMultiplier().toFixed(1)}`;
    renderMornings();
  }

  function renderMornings() {
    morningsEl.innerHTML = "";
    for (let i = 0; i < state.maxLives; i += 1) {
      const sun = document.createElement("span");
      sun.className = i >= state.lives ? "sun spent" : "sun";
      sun.setAttribute("aria-hidden", "true");
      morningsEl.appendChild(sun);
    }
    morningsEl.setAttribute("aria-label", `${state.lives} of ${state.maxLives} mornings left`);
  }

  function renderProgressSlip() {
    const bestScores = Object.values(progress.best);
    const best = bestScores.length ? Math.max(...bestScores) : 0;
    if (progress.completed) {
      bestEl.textContent = "The long year, kept.";
      bestFootEl.textContent = `Best level score ${formatScore(best)} · Stored on this device.`;
    } else if (progress.unlocked > 1) {
      const next = LEVELS[progress.unlocked - 1];
      bestEl.textContent = `Level ${pad2(progress.unlocked)} · ${next.name}`;
      bestFootEl.textContent = `${progress.unlocked - 1} of 12 cleared · Best ${formatScore(best)}`;
    } else {
      bestEl.textContent = "Level 01 · First Light";
      bestFootEl.textContent = "No level cleared yet. Stored on this device.";
    }
  }

  function renderDifficulty() {
    const busy = state.mode === "countdown" || state.mode === "playing";
    difficultyButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.difficulty === state.difficulty));
      button.disabled = busy;
    });
    difficultyNote.textContent = DIFFICULTIES[state.difficulty].note;
  }

  function renderContractRing() {
    const total = state.contract.length || 1;
    const done = state.hits / total;
    contractRing.style.strokeDasharray = `${(done * CONTRACT_RING_LENGTH).toFixed(1)} ${CONTRACT_RING_LENGTH.toFixed(1)}`;
  }

  function updateCentre() {
    const level = LEVELS[state.level];
    if (state.mode === "idle") {
      centerEyebrow.textContent = "Level";
      centerMonth.textContent = pad2(state.level + 1);
      centerSub.textContent = `${level.name} · ${level.targets} months`;
    } else if (state.mode === "countdown") {
      centerEyebrow.textContent = `Level ${pad2(state.level + 1)}`;
      centerMonth.textContent = String(state.lastCount || 3);
      centerSub.textContent = level.name;
    } else if (state.mode === "playing") {
      const target = state.queue[0];
      centerEyebrow.textContent = "Lock this month";
      centerMonth.textContent = MONTHS[target].short;
      centerSub.textContent = `${MONTHS[target].days} days · ${state.queue.length} left`;
    } else if (state.mode === "levelclear") {
      centerEyebrow.textContent = "Level clear";
      centerMonth.textContent = pad2(state.level + 1);
      centerSub.textContent = "contract kept";
    } else {
      centerEyebrow.textContent = "Level lost";
      centerMonth.textContent = pad2(state.level + 1);
      centerSub.textContent = "try again";
    }
  }

  function updatePrimary() {
    if (state.mode === "idle") {
      const cleared = progress.best[state.level] !== undefined;
      if (progress.completed && state.level === 0) {
        primaryLabel.textContent = "Play again";
      } else if (cleared) {
        primaryLabel.textContent = `Replay level ${pad2(state.level + 1)}`;
      } else {
        primaryLabel.textContent = `Start level ${pad2(state.level + 1)}`;
      }
      primary.classList.remove("is-lock");
      hint.innerHTML = "Press <kbd>Space</kbd> or tap the dial";
    } else if (state.mode === "countdown") {
      primaryLabel.textContent = "Get ready";
      primary.classList.remove("is-lock");
      hint.innerHTML = "The hand starts in a moment";
    } else if (state.mode === "playing") {
      primaryLabel.textContent = "Lock the month";
      primary.classList.add("is-lock");
      hint.innerHTML = "Press <kbd>Space</kbd> or tap the dial";
    } else if (state.mode === "levelclear") {
      primaryLabel.textContent = state.level < 11 ? "Next level" : "Play again";
      primary.classList.remove("is-lock");
      hint.innerHTML = "Press <kbd>Space</kbd> to continue";
    } else {
      primaryLabel.textContent = "Retry level";
      primary.classList.remove("is-lock");
      hint.innerHTML = "Press <kbd>Space</kbd> to retry";
    }
  }

  function setNeedle(angle) {
    needle.setAttribute("transform", `rotate(${angle.toFixed(2)} 320 320)`);
  }

  function announceTo(message) {
    statusEl.textContent = message;
  }

  function showFeedback(text, tone = "") {
    feedbackEl.textContent = text;
    feedbackEl.className = `dial-feedback${tone ? ` ${tone}` : ""}`;
    void feedbackEl.offsetWidth;
    feedbackEl.classList.add("show");
    if (state.feedbackTimer) window.clearTimeout(state.feedbackTimer);
    state.feedbackTimer = window.setTimeout(() => {
      feedbackEl.classList.remove("show");
    }, 950);
  }

  function shake() {
    dialStage.classList.remove("shake");
    void dialStage.offsetWidth;
    dialStage.classList.add("shake", "flash");
    window.setTimeout(() => dialStage.classList.remove("flash"), 500);
    window.setTimeout(() => dialStage.classList.remove("shake"), 460);
  }

  function burst() {
    const colours = ["#B23A1F", "#B3872E", "#69754B", "#3E5A67", "#D8A08F"];
    const count = 22;
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("span");
      dot.className = "burst-dot";
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 90 + Math.random() * 135;
      dot.style.setProperty("--dx", `${(Math.cos(angle) * distance).toFixed(1)}px`);
      dot.style.setProperty("--dy", `${(Math.sin(angle) * distance).toFixed(1)}px`);
      dot.style.background = colours[i % colours.length];
      dot.style.animationDelay = `${Math.floor(Math.random() * 80)}ms`;
      burstEl.appendChild(dot);
      window.setTimeout(() => dot.remove(), 1300);
    }
  }

  function updateGustReadout() {
    if (state.mode !== "playing" || !state.twists.has("gust")) return;
    const tag = twistRow.querySelector('[data-twist="gust"]');
    if (!tag) return;
    const multiplier = state.speed / state.baseSpeed;
    const rounded = multiplier.toFixed(2);
    if (rounded === state.lastGust) return;
    state.lastGust = rounded;
    tag.textContent = `Gust ×${rounded}`;
  }

  /* --------------------------------------------------------------- actions */

  function buildContract(level) {
    if (level.order === "calendar") {
      return Array.from({ length: level.targets }, (_, index) => index % 12);
    }
    const firstPool = [2, 3, 4, 5];
    const first = firstPool[Math.floor(Math.random() * firstPool.length)];
    const rest = shuffle(Array.from({ length: 12 }, (_, index) => index).filter((month) => month !== first));
    return [first, ...rest].slice(0, level.targets);
  }

  function pickMirage() {
    const current = state.queue[0];
    const future = new Set(state.queue.slice(1));
    const nonContract = [];
    for (let month = 0; month < 12; month += 1) {
      if (month === current || state.locked[month] || future.has(month)) continue;
      nonContract.push(month);
    }
    const pool = nonContract.length
      ? nonContract
      : Array.from({ length: 12 }, (_, month) => month).filter((month) => month !== current && !state.locked[month]);
    if (!pool.length) return -1;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function prepareLevel(index, freshContract) {
    state.level = clamp(index, 0, 11);
    state.selectedLevel = state.level;
    const level = LEVELS[state.level];
    state.twists = new Set(level.twists);
    if (freshContract || !state.contract.length) {
      state.contract = buildContract(level);
    }
    state.queue = state.contract.slice();
    state.locked = Array(12).fill(false);
    state.clearMonths = Array(12).fill(false);
    state.target = state.queue[0] ?? -1;
    state.mirage = -1;
    state.hits = 0;
    state.perfects = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.score = 0;
    state.dir = 1;
    state.gustPhase = 0;
    state.lastGust = null;
    state.baseSpeed = level.speed * DIFFICULTIES[state.difficulty].speed;
    state.speed = state.baseSpeed;
    state.lives = DIFFICULTIES[state.difficulty].lives;
    state.maxLives = state.lives;
    state.angle = -18;
    state.lastBoundary = Math.floor(normalize(state.angle) / 30);
    state.countdown = 0;
    state.lastCount = 0;
    setNeedle(state.angle);
  }

  function startLevel(index, { fresh = true } = {}) {
    if (state.resultTimer) {
      window.clearTimeout(state.resultTimer);
      state.resultTimer = null;
    }
    if (resultDialog.open) resultDialog.close();
    if (aboutDialog.open) aboutDialog.close();
    if (levelsDialog.open) levelsDialog.close();

    const needsFresh = fresh || state.level !== index || !state.contract.length;
    prepareLevel(index, needsFresh);
    state.mode = "countdown";
    state.countdown = 2.1;
    state.lastCount = 3;
    state.lastFrame = 0;
    state.target = state.queue[0];
    setNeedle(state.angle);
    announceTo(`Level ${pad2(state.level + 1)}: ${LEVELS[state.level].name}. Get ready.`);
    renderAll();
    if (sound.enabled) sound.count(3);
  }

  function beginPlay() {
    state.mode = "playing";
    state.countdown = 0;
    state.target = state.queue[0];
    state.mirage = state.twists.has("mirage") ? pickMirage() : -1;
    state.lastBoundary = Math.floor(normalize(state.angle) / 30);
    announceTo(`${MONTHS[state.target].name} is lit. Lock it as the hand passes.`);
    renderAll();
    if (sound.enabled) sound.tick(1);
  }

  function selectLevel(index) {
    if (state.mode === "countdown" || state.mode === "playing") return;
    if (index >= progress.unlocked && !progress.completed) return;
    startLevel(index, { fresh: true });
  }

  function selectDifficulty(key) {
    if (!DIFFICULTIES[key] || key === state.difficulty) return;
    if (state.mode === "countdown" || state.mode === "playing") return;
    state.difficulty = key;
    progress.difficulty = key;
    saveProgress();
    if (state.mode === "idle") {
      state.baseSpeed = LEVELS[state.level].speed * DIFFICULTIES[key].speed;
      state.speed = state.baseSpeed;
      state.lives = DIFFICULTIES[key].lives;
      state.maxLives = state.lives;
    }
    renderAll();
    announceTo(`${DIFFICULTIES[key].label} difficulty selected. ${DIFFICULTIES[key].note}`);
  }

  function attemptLock() {
    if (state.mode !== "playing") return;
    const target = state.queue[0];
    if (target === undefined) return;
    const index = monthFromAngle(state.angle);

    if (index === target) {
      const centre = target * 30 + 15;
      const distance = angleDistance(state.angle, centre);
      const narrow = state.twists.has("narrow") ? 0.55 : 1;
      const perfectWindow = BASE_PERFECT_WINDOW * DIFFICULTIES[state.difficulty].perfect * narrow;
      const perfect = distance <= perfectWindow;

      state.locked[target] = true;
      state.clearMonths[target] = perfect;
      state.hits += 1;
      state.perfects += perfect ? 1 : 0;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);

      const base = 100 + state.level * 15;
      const gain = Math.round(base * comboMultiplier()) + (perfect ? 75 : 0);
      state.score += gain;

      let regained = false;
      if (perfect && state.perfects % 4 === 0 && state.lives < state.maxLives) {
        state.lives += 1;
        regained = true;
      }

      showFeedback(`Perfect · +${formatScore(gain)}${regained ? " · +1 morning" : ""}`, perfect ? "perfect" : "");
      sound.lock(perfect, state.combo);
      state.queue.shift();

      if (state.queue.length === 0) {
        finishLevel(true);
        return;
      }

      state.target = state.queue[0];
      if (state.twists.has("reverse")) {
        state.dir *= -1;
        announceTo(`${MONTHS[target].name} kept. The hand turns back. ${MONTHS[state.target].name} is next.`);
      } else {
        announceTo(`${MONTHS[target].name} kept. ${MONTHS[state.target].name} is next.`);
      }
      if (state.twists.has("mirage")) state.mirage = pickMirage();
      renderAll();
      updateGustReadout();
      return;
    }

    state.combo = 0;
    state.lives -= 1;
    showFeedback(state.mirage === index ? "Mirage · −1 morning" : "Wrong month · −1 morning", "miss");
    sound.miss();
    shake();

    if (state.lives <= 0) {
      announceTo(`That was ${MONTHS[index].name}. The level got away.`);
      finishLevel(false);
      return;
    }

    announceTo(`That was ${MONTHS[index].name}, not ${MONTHS[target].name}. ${state.lives} ${state.lives === 1 ? "morning" : "mornings"} left.`);
    renderAll();
  }

  function finishLevel(won) {
    state.mode = won ? "levelclear" : "failed";
    state.countdown = 0;
    state.mirage = -1;
    state.dir = 1;
    setNeedle(state.angle);

    if (won) {
      progress.best[state.level] = Math.max(progress.best[state.level] || 0, state.score);
      progress.unlocked = Math.max(progress.unlocked, Math.min(12, state.level + 2));
      if (state.level === 11) progress.completed = true;
      saveProgress();
      sound.clear();
      burst();
      dialStage.classList.add("celebrate");
      window.setTimeout(() => dialStage.classList.remove("celebrate"), 1000);
      showFeedback("Contract kept", "perfect");
    } else {
      sound.fail();
      showFeedback("Level lost", "miss");
      shake();
    }

    renderAll();
    populateResult(won);

    state.resultTimer = window.setTimeout(() => {
      state.resultTimer = null;
      openDialog(resultDialog);
      resultPrimary.focus();
    }, won ? 620 : 520);
  }

  function populateResult(won) {
    const level = LEVELS[state.level];
    resultKicker.textContent = `Level ${pad2(state.level + 1)} / 12 · ${level.name}`;
    resultScore.textContent = formatScore(state.score);
    resultLabel.textContent = won
      ? `points · level ${pad2(state.level + 1)} cleared`
      : `points · level ${pad2(state.level + 1)} lost`;
    const copy = resultCopy(won);
    resultTitle.textContent = copy.title;
    resultCopyEl.textContent = copy.body;
    resultContract.textContent = `${state.hits} / ${level.targets}`;
    resultPerfect.textContent = String(state.perfects);
    resultCombo.textContent = `×${comboMultiplier(state.bestCombo).toFixed(1)}`;
    resultPrimaryLabel.textContent = won
      ? (state.level < 11 ? "Next level" : "Play again")
      : "Retry level";
  }

  function resultCopy(won) {
    const level = LEVELS[state.level];
    if (won && state.level === 11) {
      return {
        title: "The long year, kept.",
        body: "Twelve levels, every rule, and the hand never caught you out. The year is yours."
      };
    }
    if (won) {
      return {
        title: `${level.name}, kept.`,
        body: `Contract cleared with ${state.lives} ${state.lives === 1 ? "morning" : "mornings"} to spare. Level ${pad2(state.level + 2)} is unlocked.`
      };
    }
    if (state.hits >= level.targets - 1) {
      return {
        title: "One month short.",
        body: `${state.hits} of ${level.targets} kept. The hand got away with the last one.`
      };
    }
    if (state.hits >= Math.ceil(level.targets / 2)) {
      return {
        title: "Half the contract.",
        body: `${state.hits} of ${level.targets} kept. The rest is still out there.`
      };
    }
    return {
      title: "The hand got away.",
      body: `You kept ${state.hits} of ${level.targets} months. Try the level again and learn the rhythm.`
    };
  }

  function handlePrimary() {
    if (state.mode === "idle") {
      startLevel(state.level, { fresh: false });
    } else if (state.mode === "playing") {
      attemptLock();
    } else if (state.mode === "levelclear") {
      if (state.level < 11) {
        startLevel(state.level + 1, { fresh: true });
      } else {
        startLevel(0, { fresh: true });
      }
    } else if (state.mode === "failed") {
      startLevel(state.level, { fresh: true });
    }
  }

  function openLevels() {
    if (resultDialog.open) resultDialog.close();
    renderLevelGrid();
    openDialog(levelsDialog);
  }

  function renderLevelGrid() {
    levelGrid.innerHTML = "";
    LEVELS.forEach((level, index) => {
      const unlocked = index < progress.unlocked || progress.completed;
      const cleared = progress.best[index] !== undefined;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      card.classList.toggle("locked", !unlocked);
      card.classList.toggle("cleared", cleared);
      card.classList.toggle("current", index === state.level);
      card.disabled = !unlocked;
      card.dataset.level = String(index);
      const twists = level.twists.length
        ? level.twists.map((twist) => `<span>${TWIST_LABELS[twist]}</span>`).join("")
        : "<span>No modifiers</span>";
      const best = cleared
        ? `Best ${formatScore(progress.best[index])}`
        : (unlocked ? "Not cleared" : "Locked");
      card.innerHTML = `
        <span class="level-card-top">
          <span class="level-card-no">${pad2(index + 1)}</span>
          <span class="level-card-state">${cleared ? "Cleared" : unlocked ? "Open" : "Locked"}</span>
        </span>
        <span class="level-card-name">${level.name}</span>
        <span class="level-card-meta">${level.targets} months · ${Math.round(level.speed * DIFFICULTIES[state.difficulty].speed)}°/s</span>
        <span class="level-card-twists">${twists}</span>
        <span class="level-card-best">${best}</span>
      `;
      card.setAttribute("aria-label", `Level ${index + 1}, ${level.name}. ${cleared ? "Cleared" : unlocked ? "Open" : "Locked"}. ${level.targets} months.`);
      card.addEventListener("click", () => {
        if (!unlocked) return;
        levelsDialog.close();
        startLevel(index, { fresh: true });
      });
      levelGrid.appendChild(card);
    });
  }

  function resetProgress() {
    if (!window.confirm("Reset all level progress and best scores?")) return;
    progress.unlocked = 1;
    progress.completed = false;
    progress.best = {};
    progress.difficulty = "standard";
    saveProgress();
    state.difficulty = "standard";
    state.mode = "idle";
    state.selectedLevel = 0;
    prepareLevel(0, true);
    renderAll();
    if (levelsDialog.open) levelsDialog.close();
    announceTo("Progress reset. Level 01 is waiting.");
  }

  /* ---------------------------------------------------------------- sound */

  const sound = {
    ctx: null,
    enabled: true,
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    },
    tone(freq, duration, gainValue, type = "sine", when = 0, glide = null) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (glide) osc.frequency.exponentialRampToValueAtTime(glide, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    tick(strength = 0.45) {
      if (!this.enabled) return;
      this.tone(740, 0.026, 0.018 * strength, "sine");
    },
    lock(perfect, combo = 1) {
      if (!this.enabled) return;
      const base = 540 + Math.min(combo, 8) * 24;
      this.tone(base, 0.065, 0.035, "triangle");
      this.tone(perfect ? base + 480 : base + 320, 0.11, 0.026, "sine", 0.045);
    },
    miss() {
      if (!this.enabled) return;
      this.tone(150, 0.20, 0.045, "sawtooth", 0, 92);
    },
    clear() {
      if (!this.enabled) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        this.tone(freq, 0.55, 0.024, "sine", index * 0.11);
      });
    },
    fail() {
      if (!this.enabled) return;
      this.tone(180, 0.28, 0.04, "sawtooth", 0, 90);
      this.tone(120, 0.4, 0.03, "triangle", 0.12, 70);
    },
    count(number) {
      if (!this.enabled) return;
      this.tone(350 + number * 95, 0.08, 0.03, "sine");
    }
  };

  function loadSoundSetting() {
    try {
      const saved = window.localStorage.getItem(SOUND_KEY);
      if (saved === "off") sound.enabled = false;
    } catch (error) {
      /* keep sound on by default */
    }
    updateSoundButton();
  }

  function updateSoundButton() {
    soundToggle.setAttribute("aria-pressed", String(sound.enabled));
    soundToggle.setAttribute("aria-label", sound.enabled ? "Turn sound off" : "Turn sound on");
    soundLabel.textContent = sound.enabled ? "Sound on" : "Sound off";
  }

  function toggleSound() {
    sound.enabled = !sound.enabled;
    try {
      window.localStorage.setItem(SOUND_KEY, sound.enabled ? "on" : "off");
    } catch (error) {
      /* ignore */
    }
    updateSoundButton();
    if (sound.enabled) sound.tick(1);
  }

  /* ------------------------------------------------------------------ loop */

  function frame(timestamp) {
    const last = state.lastFrame || timestamp;
    const dt = Math.min((timestamp - last) / 1000, 0.1);
    state.lastFrame = timestamp;
    const dialogOpen = resultDialog.open || aboutDialog.open || levelsDialog.open;

    if (state.mode === "countdown" && !dialogOpen) {
      state.countdown -= dt;
      const number = Math.max(1, Math.ceil(state.countdown / 0.7));
      if (number !== state.lastCount) {
        state.lastCount = number;
        updateCentre();
        if (sound.enabled) sound.count(number);
      }
      if (state.countdown <= 0) beginPlay();
    } else if (state.mode === "playing" && !dialogOpen) {
      let speed = state.baseSpeed;
      if (state.twists.has("gust")) {
        state.gustPhase += dt * 1.9;
        speed *= 1 + 0.35 * Math.sin(state.gustPhase);
      }
      state.speed = speed;
      state.angle = normalize(state.angle + speed * state.dir * dt);
      setNeedle(state.angle);

      const boundary = Math.floor(state.angle / 30);
      if (boundary !== state.lastBoundary) {
        state.lastBoundary = boundary;
        if (sound.enabled) sound.tick();
      }
      updateGustReadout();
    } else if (state.mode === "idle") {
      state.angle = 7 + 4.5 * Math.sin(timestamp / 2300);
      setNeedle(state.angle);
    }

    window.requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- events */

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function bind() {
    primary.addEventListener("click", handlePrimary);

    dialStage.addEventListener("click", () => {
      if (state.mode === "countdown") return;
      handlePrimary();
    });

    difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
    });

    document.addEventListener("keydown", (event) => {
      const dialogOpen = resultDialog.open || aboutDialog.open || levelsDialog.open;
      if (dialogOpen) return;

      const tag = event.target && event.target.tagName;
      const onControl = tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA";

      if (event.code === "Space" || event.key === "Enter") {
        if (onControl) return;
        event.preventDefault();
        if (state.mode === "countdown") return;
        handlePrimary();
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        startLevel(state.level, { fresh: true });
        return;
      }

      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        toggleSound();
        return;
      }

      if (event.key === "l" || event.key === "L") {
        event.preventDefault();
        openLevels();
        return;
      }

      if (event.key === "?" || event.key === "h" || event.key === "H") {
        event.preventDefault();
        openDialog(aboutDialog);
      }
    });

    $("#levels-open").addEventListener("click", openLevels);
    $("#about-open").addEventListener("click", () => openDialog(aboutDialog));

    $("#how-to").addEventListener("click", () => {
      const rules = document.querySelector(".rules");
      if (!rules) return;
      rules.scrollIntoView({ behavior: "smooth", block: "center" });
      rules.classList.remove("flash");
      void rules.offsetWidth;
      rules.classList.add("flash");
      window.setTimeout(() => rules.classList.remove("flash"), 1300);
    });

    resultPrimary.addEventListener("click", () => {
      resultDialog.close();
      handlePrimary();
    });

    $("#result-levels").addEventListener("click", () => {
      resultDialog.close();
      openLevels();
    });

    $("#reset-progress").addEventListener("click", resetProgress);
    soundToggle.addEventListener("click", toggleSound);

    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        if (dialog) dialog.close();
      });
    });

    document.querySelectorAll("[data-close-about]").forEach((button) => {
      button.addEventListener("click", () => aboutDialog.close());
    });

    [resultDialog, aboutDialog, levelsDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        state.lastFrame = 0;
      });
    });

    $("#copy-result").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const level = LEVELS[state.level];
      const won = state.mode === "levelclear";
      const text = won
        ? `TWELVE — cleared level ${pad2(state.level + 1)} (${level.name}) with ${formatScore(state.score)} points and ${state.perfects} perfect. ${window.location.href}`
        : `TWELVE — level ${pad2(state.level + 1)} (${level.name}) got away with ${state.hits}/${level.targets} months kept. ${window.location.href}`;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        window.setTimeout(() => { button.textContent = "Copy result"; }, 1800);
      } catch (error) {
        button.textContent = "Couldn't copy";
        window.setTimeout(() => { button.textContent = "Copy result"; }, 1800);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) state.lastFrame = 0;
    });
  }

  function updateClock() {
    try {
      const time = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata"
      }).format(new Date());
      clockEl.textContent = time;
    } catch (error) {
      clockEl.textContent = "--:--";
    }
  }

  /* ------------------------------------------------------------------ init */

  buildDial();
  bind();
  loadSoundSetting();
  updateClock();
  window.setInterval(updateClock, 30000);

  const startIndex = progress.completed ? 0 : Math.min(progress.unlocked - 1, 11);
  state.mode = "idle";
  prepareLevel(startIndex, true);
  renderAll();
  window.requestAnimationFrame(frame);

  const sourceLink = $("#source-link");
  if (sourceLink) sourceLink.href = "https://github.com/digantshetty0006-ship-it/twelve";

  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__twelve = {
      state,
      progress,
      LEVELS,
      DIFFICULTIES,
      startLevel,
      prepareLevel,
      beginPlay,
      attemptLock,
      finishLevel,
      renderAll,
      lockNow() {
        if (state.mode !== "playing") return false;
        const target = state.queue[0];
        if (target === undefined) return false;
        state.angle = target * 30 + 15;
        setNeedle(state.angle);
        attemptLock();
        return true;
      },
      setAngle(angle) {
        state.angle = normalize(angle);
        setNeedle(state.angle);
      },
      setMode(mode) {
        state.mode = mode;
        renderAll();
      }
    };
  }
})();
