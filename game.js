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
  const BASE_SPEED = 34;
  const SPEED_STEP = 2.8;
  const PERFECT_WINDOW = 5.5;

  const svgNS = "http://www.w3.org/2000/svg";
  const $ = (sel) => document.querySelector(sel);

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
  const daysKeptEl = $("#days-kept");
  const dayFillEl = $("#day-fill");
  const clearCountEl = $("#clear-count");
  const morningsEl = $("#mornings");
  const bestEl = $("#best-value");
  const primary = $("#primary");
  const primaryLabel = $("#primary-label");
  const hint = $("#hint");
  const statusEl = $("#status");
  const roundLabel = $("#round-label");
  const feedbackEl = $("#feedback");
  const resultDialog = $("#result-dialog");
  const aboutDialog = $("#about-dialog");
  const clockEl = $("#clock");
  const soundToggle = $("#sound-toggle");
  const soundLabel = $("#sound-label");

  const sectorEls = [];
  const labelEls = [];
  const dotEls = [];
  const ledgerEls = [];
  const morningEls = [];

  const state = {
    mode: "idle",            // idle | playing | ending | done
    angle: 7,
    target: 0,
    hits: 0,
    clear: 0,
    days: 0,
    mornings: 3,
    speed: BASE_SPEED,
    lastBoundary: 0,
    lastFrame: 0,
    resultTimer: null,
    best: loadBest()
  };

  /* ------------------------------------------------------------- geometry */

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
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (className) node.setAttribute("class", className);
    return node;
  }

  function quarterColour(index) {
    return QUARTER_COLOURS[Math.floor(index / 3) % 4];
  }

  function monthFromAngle(angle) {
    const norm = ((angle % 360) + 360) % 360;
    return Math.floor(norm / 30) % 12;
  }

  /* ------------------------------------------------------------ build dial */

  function buildDial() {
    // 365 small day ticks, one for each day, as a fine engraved ring.
    for (let i = 0; i < YEAR_DAYS; i += 1) {
      const deg = (i / YEAR_DAYS) * 360;
      const major = i % 5 === 0;
      const r1 = 165;
      const r2 = major ? 173 : 170;
      const p1 = polar(320, 320, r1, deg);
      const p2 = polar(320, 320, r2, deg);
      dayTicksGroup.appendChild(el("line", {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2)
      }, major ? "day-tick major" : "day-tick"));
    }

    // 52 week ticks and 12 heavier month ticks.
    for (let i = 0; i < 52; i += 1) {
      const deg = (i / 52) * 360;
      const p1 = polar(320, 320, 258, deg);
      const p2 = polar(320, 320, 266, deg);
      weekTicksGroup.appendChild(el("line", {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2)
      }, "week-tick"));
    }

    MONTHS.forEach((month, i) => {
      const start = i * 30;
      const end = start + 30;
      const colour = quarterColour(i);

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
      sector.dataset.month = String(i);
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

    // Ledger rows.
    MONTHS.forEach((month, i) => {
      const li = document.createElement("li");
      li.className = "ledger-item";
      li.dataset.month = String(i);
      li.innerHTML = `
        <span class="li-month">${month.short}</span>
        <span class="li-bar" aria-hidden="true"><i></i></span>
        <span class="li-state">—</span>
      `;
      li.style.setProperty("--season", quarterColour(i));
      li.title = `${month.name}: ${month.days} days`;
      ledgerList.appendChild(li);
      ledgerEls.push(li);
    });

    for (let i = 0; i < 3; i += 1) {
      const sun = document.createElement("span");
      sun.className = "sun";
      sun.setAttribute("aria-hidden", "true");
      morningsEl.appendChild(sun);
      morningEls.push(sun);
    }

    renderBest();
    renderMornings();
    setTarget(0, false);
    updateCentre("idle");
    updateStats();
  }

  /* --------------------------------------------------------------- render */

  function setTarget(index, announce = true) {
    state.target = index;
    sectorEls.forEach((sector, i) => {
      sector.classList.toggle("target", i === index && state.mode === "playing");
      sector.classList.toggle("complete", Boolean(state.locked && state.locked[i]));
      sector.classList.toggle("clear", Boolean(state.clearMonths && state.clearMonths[i]));
    });
    labelEls.forEach((label, i) => {
      label.classList.toggle("target", i === index && state.mode === "playing");
      label.classList.toggle("complete", Boolean(state.locked && state.locked[i]));
    });
    dotEls.forEach((dot, i) => {
      dot.classList.toggle("target", i === index && state.mode === "playing");
      dot.classList.toggle("complete", Boolean(state.locked && state.locked[i]));
    });
    ledgerEls.forEach((li, i) => {
      li.classList.toggle("target", i === index && state.mode === "playing");
      li.classList.toggle("complete", Boolean(state.locked && state.locked[i]));
      li.classList.toggle("clear", Boolean(state.clearMonths && state.clearMonths[i]));
      const stateEl = li.querySelector(".li-state");
      if (state.locked && state.locked[i]) {
        stateEl.textContent = state.clearMonths && state.clearMonths[i] ? "Clear" : "Kept";
      } else if (i === index && state.mode === "playing") {
        stateEl.textContent = "Next";
      } else {
        stateEl.textContent = "—";
      }
    });

    if (state.mode === "playing") {
      centerEyebrow.textContent = "Lock this month";
      centerMonth.textContent = MONTHS[index].short;
      centerSub.textContent = `${MONTHS[index].days} days · next`;
      if (announce) {
        announceTo(`${MONTHS[index].name} is lit.`);
      }
    }
  }

  function updateCentre(mode) {
    if (mode === "idle") {
      centerEyebrow.textContent = "The year";
      centerMonth.textContent = "2026";
      centerSub.textContent = "365 days ahead";
    } else if (mode === "done") {
      centerEyebrow.textContent = "The year";
      centerMonth.textContent = String(state.days);
      centerSub.textContent = state.days === YEAR_DAYS ? "days kept · full circle" : "days kept";
    } else {
      centerEyebrow.textContent = "Lock this month";
      centerMonth.textContent = MONTHS[state.target].short;
      centerSub.textContent = `${MONTHS[state.target].days} days · next`;
    }
  }

  function updateStats() {
    daysKeptEl.textContent = String(state.days);
    dayFillEl.style.width = `${(state.days / YEAR_DAYS) * 100}%`;
    clearCountEl.textContent = String(state.clear);
    renderMornings();

    if (state.mode === "playing") {
      roundLabel.textContent = `${state.hits} / 12 kept`;
    } else if (state.mode === "done") {
      roundLabel.textContent = `${state.hits} / 12 kept`;
    } else {
      roundLabel.textContent = "365 days ahead";
    }
  }

  function renderMornings() {
    morningEls.forEach((sun, i) => {
      sun.classList.toggle("spent", i >= state.mornings);
    });
    morningsEl.setAttribute("aria-label", `${state.mornings} of 3 mornings left`);
  }

  function renderBest() {
    const best = state.best;
    if (best && best.days > 0) {
      bestEl.textContent = `${best.days} days · ${best.clear} clear`;
    } else {
      bestEl.textContent = "No year kept yet.";
    }
  }

  function setNeedle(angle) {
    needle.setAttribute("transform", `rotate(${angle.toFixed(2)} 320 320)`);
  }

  function announceTo(message) {
    statusEl.textContent = message;
  }

  /* --------------------------------------------------------------- actions */

  function startGame() {
    if (state.resultTimer) {
      window.clearTimeout(state.resultTimer);
      state.resultTimer = null;
    }
    if (resultDialog.open) resultDialog.close();
    if (aboutDialog.open) aboutDialog.close();

    state.mode = "playing";
    state.angle = 0;
    state.target = 0;
    state.hits = 0;
    state.clear = 0;
    state.days = 0;
    state.mornings = 3;
    state.speed = BASE_SPEED;
    state.lastBoundary = 0;
    state.lastFrame = 0;
    state.locked = Array(12).fill(false);
    state.clearMonths = Array(12).fill(false);

    primaryLabel.textContent = "Lock the month";
    primary.classList.add("is-lock");
    hint.innerHTML = "Press <kbd>Space</kbd> or tap the dial";
    updateCentre("playing");
    updateStats();
    setTarget(0, false);
    setNeedle(0);
    announceTo("The year begins. January is lit. Lock it as the hand passes.");
    if (sound.enabled) sound.tick(1);
  }

  function attemptLock() {
    if (state.mode !== "playing") return;

    const index = monthFromAngle(state.angle);
    const target = state.target;

    if (index === target) {
      const centreOfMonth = target * 30 + 15;
      const distance = Math.abs(state.angle - centreOfMonth);
      const perfect = distance <= PERFECT_WINDOW;

      state.locked[target] = true;
      if (perfect) state.clearMonths[target] = true;
      state.hits += 1;
      state.days += MONTHS[target].days;
      if (perfect) state.clear += 1;
      state.speed = BASE_SPEED + state.hits * SPEED_STEP;

      showFeedback(perfect ? `Clear · +${MONTHS[target].days}` : `+${MONTHS[target].days} days`);
      sound.lock(perfect);
      updateStats();

      if (state.hits === 12) {
        setTarget(11, false);
        sectorEls[11].classList.add("complete");
        finish(true);
        return;
      }

      state.target += 1;
      setTarget(state.target, false);
      updateCentre("playing");

      if (perfect) {
        announceTo(`${MONTHS[target].name} kept clean. ${MONTHS[state.target].name} is lit.`);
      } else {
        announceTo(`${MONTHS[target].name} kept, ${MONTHS[target].days} days. ${MONTHS[state.target].name} is lit.`);
      }
    } else {
      state.mornings -= 1;
      renderMornings();
      showFeedback("Wrong month · −1 morning");
      sound.miss();
      shake();

      if (state.mornings <= 0) {
        announceTo(`That was ${MONTHS[index].name}, not ${MONTHS[target].name}. The year got away.`);
        finish(false);
        return;
      }

      announceTo(`That was ${MONTHS[index].name}. ${MONTHS[target].name} is still lit. ${state.mornings} ${state.mornings === 1 ? "morning" : "mornings"} left.`);
    }
  }

  function finish(won) {
    state.mode = "done";
    setNeedle(state.angle);
    setTarget(state.target, false);
    centerEyebrow.textContent = won ? "Full circle" : "The year";
    centerMonth.textContent = String(state.days);
    centerSub.textContent = won ? "days kept · complete" : "days kept";

    primaryLabel.textContent = "Go again";
    primary.classList.remove("is-lock");
    hint.innerHTML = "Press <kbd>R</kbd> to start over";
    updateStats();

    const previousBest = state.best;
    const isBest = !previousBest || state.days > previousBest.days || (state.days === previousBest.days && state.clear > previousBest.clear);
    if (state.days > 0 && isBest) {
      state.best = { days: state.days, clear: state.clear, at: new Date().toISOString() };
      saveBest(state.best);
      renderBest();
    }

    const copy = resultCopy(won);
    $("#result-days").textContent = String(state.days);
    $("#result-title").textContent = copy.title;
    $("#result-copy").textContent = copy.body;
    $("#result-clear").textContent = `${state.clear} / 12`;
    $("#result-mornings").textContent = `${state.mornings} / 3`;
    $("#result-best").textContent = state.best ? `${state.best.days} days` : "—";

    if (won) sound.win();

    state.resultTimer = window.setTimeout(() => {
      state.resultTimer = null;
      if (typeof resultDialog.showModal === "function") {
        resultDialog.showModal();
      }
    }, won ? 620 : 520);
  }

  function resultCopy(won) {
    if (won && state.clear === 12) {
      return {
        title: "Nothing slipped.",
        body: "Twelve months, every one held in the middle. The hand never caught you out."
      };
    }
    if (won) {
      return {
        title: "A year, kept.",
        body: "All twelve months, all 365 days. Some arrived cleaner than others, but none of them got away."
      };
    }
    if (state.hits >= 9) {
      return {
        title: "Most of a year.",
        body: `${state.hits} months kept, ${state.days} days in hand. What is left is still yours to spend.`
      };
    }
    if (state.hits >= 5) {
      return {
        title: "Half a year, give or take.",
        body: `${state.hits} months kept. The dial does not judge, but it does keep moving.`
      };
    }
    if (state.hits >= 1) {
      return {
        title: "A few good months.",
        body: `${state.hits} months kept. A year is long. You do not have to take it all at once.`
      };
    }
    return {
      title: "The year got away.",
      body: "No months kept. The dial is patient, which is more than the calendar is."
    };
  }

  function shake() {
    dialStage.classList.remove("shake");
    void dialStage.offsetWidth;
    dialStage.classList.add("shake");
    dialStage.classList.add("flash");
    window.setTimeout(() => dialStage.classList.remove("flash"), 500);
    window.setTimeout(() => dialStage.classList.remove("shake"), 460);
  }

  function showFeedback(text) {
    feedbackEl.textContent = text;
    feedbackEl.classList.remove("show");
    void feedbackEl.offsetWidth;
    feedbackEl.classList.add("show");
    window.setTimeout(() => {
      feedbackEl.classList.remove("show");
    }, 950);
  }

  /* ----------------------------------------------------------------- best */

  function loadBest() {
    try {
      const raw = window.localStorage.getItem("twelve-best-v1");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(parsed.days) || parsed.days < 0 || parsed.days > YEAR_DAYS) return null;
      return {
        days: Math.floor(parsed.days),
        clear: Math.max(0, Math.min(12, Number(parsed.clear) || 0)),
        at: parsed.at || null
      };
    } catch (error) {
      return null;
    }
  }

  function saveBest(best) {
    try {
      window.localStorage.setItem("twelve-best-v1", JSON.stringify(best));
    } catch (error) {
      /* Private mode or storage disabled: the game still works. */
    }
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
      this.init();
      this.tone(740, 0.026, 0.018 * strength, "sine");
    },
    lock(perfect) {
      if (!this.enabled) return;
      this.init();
      this.tone(560, 0.065, 0.035, "triangle");
      this.tone(perfect ? 1040 : 880, 0.11, 0.026, "sine", 0.045);
    },
    miss() {
      if (!this.enabled) return;
      this.init();
      this.tone(150, 0.20, 0.045, "sawtooth", 0, 92);
    },
    win() {
      if (!this.enabled) return;
      this.init();
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        this.tone(freq, 0.55, 0.024, "sine", i * 0.12);
      });
    }
  };

  function loadSoundSetting() {
    try {
      const saved = window.localStorage.getItem("twelve-sound");
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
      window.localStorage.setItem("twelve-sound", sound.enabled ? "on" : "off");
    } catch (error) {
      /* ignore */
    }
    updateSoundButton();
    if (sound.enabled) sound.tick(1);
  }

  /* ----------------------------------------------------------------- loop */

  function frame(timestamp) {
    const last = state.lastFrame || timestamp;
    let dt = Math.min((timestamp - last) / 1000, 0.1);
    state.lastFrame = timestamp;

    const dialogOpen = resultDialog.open || aboutDialog.open;

    if ((state.mode === "playing" || state.mode === "ending") && !dialogOpen) {
      state.angle = (state.angle + state.speed * dt) % 360;
      setNeedle(state.angle);

      const boundary = Math.floor(state.angle / 30);
      if (boundary !== state.lastBoundary) {
        state.lastBoundary = boundary;
        if (state.mode === "playing") sound.tick();
      }
    } else if (state.mode === "idle") {
      state.angle = 7 + 4.5 * Math.sin(timestamp / 2300);
      setNeedle(state.angle);
    }

    window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- events */

  function bind() {
    primary.addEventListener("click", () => {
      if (state.mode === "idle" || state.mode === "done") {
        startGame();
      } else if (state.mode === "playing") {
        attemptLock();
      }
    });

    dialStage.addEventListener("click", () => {
      if (state.mode === "idle") {
        startGame();
      } else if (state.mode === "playing") {
        attemptLock();
      }
    });

    // Space is the game key. Native button activation is left alone so Space
    // on a focused button does not fire twice.
    document.addEventListener("keydown", (event) => {
      const dialogOpen = resultDialog.open || aboutDialog.open;
      if (dialogOpen) return;

      const tag = event.target && event.target.tagName;
      const onControl = tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA";

      if (event.code === "Space" || event.key === "Enter") {
        if (onControl) return;
        if (state.mode === "idle" || state.mode === "done") {
          event.preventDefault();
          startGame();
        } else if (state.mode === "playing") {
          event.preventDefault();
          attemptLock();
        }
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        startGame();
      }

      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        toggleSound();
      }

      if (event.key === "?" || event.key === "h" || event.key === "H") {
        event.preventDefault();
        openDialog(aboutDialog);
      }
    });

    $("#about-open").addEventListener("click", () => openDialog(aboutDialog));
    $("#how-to").addEventListener("click", () => {
      const rules = document.querySelector(".rules");
      rules.scrollIntoView({ behavior: "smooth", block: "center" });
      rules.classList.remove("flash");
      void rules.offsetWidth;
      rules.classList.add("flash");
      window.setTimeout(() => rules.classList.remove("flash"), 1300);
    });

    $("#again").addEventListener("click", startGame);
    $("#sound-toggle").addEventListener("click", toggleSound);

    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        if (dialog) dialog.close();
      });
    });

    document.querySelectorAll("[data-close-about]").forEach((button) => {
      button.addEventListener("click", () => aboutDialog.close());
    });

    [resultDialog, aboutDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        state.lastFrame = 0;
      });
    });

    $("#copy-result").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const text = `TWELVE — I kept ${state.days}/365 days and ${state.clear} clear months. ${window.location.href}`;
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

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
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
  window.requestAnimationFrame(frame);

  // Give the source link a sensible default until the public repository is live.
  const sourceLink = $("#source-link");
  if (sourceLink) sourceLink.href = "https://github.com/digantshetty0006-ship-it/twelve";
})();
