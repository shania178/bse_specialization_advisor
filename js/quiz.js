/* ==========================================================================
   quiz.js — Quiz Engine (BSE Specialisation Advisor)
   --------------------------------------------------------------------------
   Responsibilities:
   1. Builds each question card dynamically (choice / hotspot / audio / video).
   2. Runs a setInterval countdown timer with full timeout handling.
   3. Scores answers per category with SPEED bonuses and STREAK multipliers.
   4. Wires the interactive media: SVG image hotspots, custom audio controls
      and a video that auto-pauses at a pre-programmed timestamp.
   5. Persists results to sessionStorage and redirects to results.html.
   ========================================================================== */

"use strict";

/* --------------------------------------------------------------------------
   CATEGORY MODEL — the four specialisation outcomes + their chart colours.
   -------------------------------------------------------------------------- */
const CATEGORIES = {
  low:  { label: "Low-Level Programming", color: "#f59e0b" },
  arvr: { label: "AR / VR",                color: "#8b5cf6" },
  web:  { label: "Full-Stack Web",         color: "#0ea5e9" },
  ml:   { label: "Machine Learning",       color: "#10b981" }
};

/* --------------------------------------------------------------------------
   QUESTIONS — 10 items. Each maps to one or more categories.
   - type "choice":  standard multiple-choice cards.
   - type "hotspot": SVG image-region selection.
   - type "audio":   HTML5 <audio> with custom play/pause/replay buttons.
   - type "video":   HTML5 <video> that auto-pauses at PAUSE_AT seconds.
   -------------------------------------------------------------------------- */
const QUESTIONS = [
  {
    type: "choice",
    tag: "Preferences",
    text: "You have a free afternoon. What would you rather be doing?",
    options: [
      { cat: "low",  label: "Taking apart an old console to see how it boots" },
      { cat: "arvr", label: "Designing a 3D scene inside a game engine" },
      { cat: "web",  label: "Polishing a responsive page until it feels perfect" },
      { cat: "ml",   label: "Feeding a dataset to a model and watching it learn" }
    ]
  },
  {
    type: "choice",
    tag: "Problem solving",
    text: "When an app you built crashes, your first instinct is to...",
    options: [
      { cat: "low",  label: "Trace memory addresses and inspect the call stack" },
      { cat: "arvr", label: "Rewind the camera and re-check the scene graph" },
      { cat: "web",  label: "Open the network tab and inspect the API calls" },
      { cat: "ml",   label: "Check the training loss curves and data quality" }
    ]
  },
  {
    type: "choice",
    tag: "Project dreams",
    text: "Pick the final-year project that excites you most:",
    options: [
      { cat: "low",  label: "A custom embedded OS running on a Raspberry Pi" },
      { cat: "arvr", label: "A gesture-controlled AR hologram for the classroom" },
      { cat: "web",  label: "A real-time collaboration app used by 1,000 students" },
      { cat: "ml",   label: "A chatbot that predicts which students might drop out" }
    ]
  },
  {
    type: "choice",
    tag: "Skills",
    text: "Which skill would you sharpen first?",
    options: [
      { cat: "low",  label: "Pointers, memory and bit-level tricks" },
      { cat: "arvr", label: "Quaternions and 3D linear algebra" },
      { cat: "web",  label: "SQL, REST APIs and cloud deployment" },
      { cat: "ml",   label: "Linear algebra, statistics and model tuning" }
    ]
  },
  {
    type: "hotspot",
    tag: "Image hotspot",
    text: "A team shows you their tech hub. Tap the piece of tech that calls to you most.",
    media: "hotspot"
  },
  {
    type: "audio",
    tag: "Listen up",
    text: "Listen to this audio clip (use the custom player below). Which developer vibe does it sound like?",
    media: "audio",
    src: "assets/audio-prompt.wav",
    options: [
      { cat: "low",  label: "Retro console boot-up — close to the metal" },
      { cat: "arvr", label: "Arcade ambience — immersive worlds" },
      { cat: "web",  label: "Office hum — shipped products and servers" },
      { cat: "ml",   label: "Data crunching — models churning numbers" }
    ]
  },
  {
    type: "video",
    tag: "Video scenario",
    text: "The startup demo is about to play. Watch closely — it will pause and ask you a decision.",
    media: "video",
    src: "assets/video-scenario.webm",
    pauseAt: 5,
    decisionText: "The prototype just froze mid-demo. What do you debug FIRST?",
    options: [
      { cat: "low",  label: "The memory handler — something is overflowing" },
      { cat: "arvr", label: "The render loop — the frame pipeline stalls" },
      { cat: "web",  label: "The network layer — the request never returns" },
      { cat: "ml",   label: "The prediction model — the output is garbage" }
    ]
  },
  {
    type: "choice",
    tag: "Toolbox",
    text: "Which toolbox would you reach for?",
    options: [
      { cat: "low",  label: "C, Assembly, Rust" },
      { cat: "arvr", label: "Unity, Blender, OpenGL" },
      { cat: "web",  label: "React, Node.js, SQL" },
      { cat: "ml",   label: "Python, TensorFlow, Pandas" }
    ]
  },
  {
    type: "choice",
    tag: "Team role",
    text: "In a group project you naturally become the person who...",
    options: [
      { cat: "low",  label: "Builds the engine nobody else wants to touch" },
      { cat: "arvr", label: "Makes the demo feel alive and interactive" },
      { cat: "web",  label: "Connects every team member's work together" },
      { cat: "ml",   label: "Turns the messy spreadsheet into insights" }
    ]
  },
  {
    type: "choice",
    tag: "Dream product",
    text: "What product do you dream of shipping one day?",
    options: [
      { cat: "low",  label: "A tiny wearable that lasts months on one charge" },
      { cat: "arvr", label: "A VR training simulation for surgeons" },
      { cat: "web",  label: "A startup platform used by millions" },
      { cat: "ml",   label: "An AI assistant that reads to you" }
    ]
  }
];

/* --------------------------------------------------------------------------
   SCORING TUNING — the constants behind speed bonus + streak multiplier.
   -------------------------------------------------------------------------- */
const QUIZ_TIME = 300;              /* total quiz duration in seconds   */
const VIDEO_PAUSE_AT = 5;           /* video timestamp (seconds) to halt */
const BASE_POINTS = 10;             /* points awarded per answered question */
const ANSWER_PAUSE = 1600;          /* ms to show the points toast before advancing */

/* --------------------------------------------------------------------------
   STATE — single mutable object shared by all functions in this file.
   -------------------------------------------------------------------------- */
const state = {
  index: 0,
  scores: { low: 0, arvr: 0, web: 0, ml: 0 },
  answers: [],            /* per-question log for the results narrative */
  streak: 0,              /* consecutive answers in the SAME category   */
  lastCat: null,
  timeLeft: QUIZ_TIME,
  timerId: null,
  qStart: 0,              /* timestamp when the current question appeared */
  answered: false,
  locked: false
};

/* Cache DOM nodes once at the top (avoids repeated lookups). */
const els = {
  card: document.getElementById("quiz-card"),
  progress: document.getElementById("progress-fill"),
  counter: document.getElementById("q-counter"),
  timerText: document.getElementById("timer-text"),
  timerBadge: document.getElementById("timer-badge"),
  greet: document.getElementById("quiz-greet"),
  lock: document.getElementById("lock-screen"),
  hotspotTemplate: document.getElementById("hotspot-scene")
};

/* --------------------------------------------------------------------------
   PROFILE GUARD — the quiz needs the landing-page profile to start.
   -------------------------------------------------------------------------- */
const student = window.Student.getStudent();
if (student) {
  els.greet.textContent = `Hi ${student.name} — you have ${Math.floor(QUIZ_TIME / 60)} minutes. Go!`;
} else {
  /* No profile: block the quiz and point the student back to the form. */
  els.greet.textContent = "";
  els.card.innerHTML =
    `<h2>Almost there!</h2>` +
    `<p style="color: var(--muted); margin-bottom: 1rem;">Please share your student details on the home page first so we can personalise your plan.</p>` +
    `<a class="btn btn-primary" href="index.html">Go to home page</a>`;
  els.progress.style.width = "0%";
  document.querySelector(".quiz-topbar").style.display = "none";
  throw new Error("Quiz blocked: no student profile found.");   /* stop the engine */
}

/* --------------------------------------------------------------------------
   HELPER — formats seconds as mm:ss for the live timer display.
   -------------------------------------------------------------------------- */
function formatTime(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/* --------------------------------------------------------------------------
   TIMER — setInterval countdown with timeout handling.
   -------------------------------------------------------------------------- */
function startTimer() {
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    els.timerText.textContent = formatTime(state.timeLeft);
    els.progress.style.width = `${(1 - state.timeLeft / QUIZ_TIME) * 100}%`;

    /* Visual warning feedback when time runs low (under 30s). */
    if (state.timeLeft <= 30) els.timerBadge.classList.add("danger");

    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);       /* stop the interval — no more ticks */
      handleTimeout();
    }
  }, 1000);
}

/* --------------------------------------------------------------------------
   TIMEOUT HANDLING — lock controls, show warning overlay, auto-submit.
   -------------------------------------------------------------------------- */
function handleTimeout() {
  state.locked = true;                     /* global lock flag               */
  els.card.classList.add("quiz-locked");   /* (CSS disables pointer events)  */
  els.lock.classList.add("show");          /* visual warning overlay         */

  /* Auto-submit: keep whatever was answered, then go to results. */
  setTimeout(finishQuiz, 1400);
}

/* --------------------------------------------------------------------------
   SCORING — records an answer and returns the points breakdown for display.
   -------------------------------------------------------------------------- */
function recordAnswer(cat) {
  const q = QUESTIONS[state.index];

  /* Speed bonus: reward answering quickly (faster => bigger bonus). */
  const elapsed = (Date.now() - state.qStart) / 1000;
  let bonus = 1;
  if (elapsed < 8) bonus = 5;
  else if (elapsed < 15) bonus = 3;

  /* Streak multiplier: consecutive picks in the same category grow a
     multiplier (cap 1.5x) to reward a strong, consistent preference. */
  state.streak = (cat === state.lastCat) ? state.streak + 1 : 1;
  state.lastCat = cat;
  const multiplier = 1 + Math.min(state.streak - 1, 5) * 0.1;

  const points = Math.round((BASE_POINTS + bonus) * multiplier);
  state.scores[cat] += points;

  /* Log the answer (used by the results narrative). */
  state.answers.push({
    question: state.index + 1,
    type: q.type,
    category: cat,
    bonus,
    multiplier,
    points
  });
  state.answered = true;

  return { points, bonus, multiplier };
}

/* --------------------------------------------------------------------------
   POINTS TOAST — briefly shows the scoring breakdown after each answer so
   the speed bonus and streak multiplier are visible to the student.
   -------------------------------------------------------------------------- */
function showToast(detail) {
  els.card.querySelector(".answer-toast")?.remove();
  clearTimeout(showToast._timer);
  const toast = document.createElement("div");
  toast.className = "answer-toast";
  toast.textContent =
    `+${detail.points} pts  •  speed bonus +${detail.bonus}  •  streak ×${detail.multiplier.toFixed(1)}`;
  els.card.appendChild(toast);
  showToast._timer = setTimeout(() => toast.remove(), 3000);
}

/* --------------------------------------------------------------------------
   RENDERING — builds each question card's DOM from its data object.
   -------------------------------------------------------------------------- */
function renderQuestion() {
  const q = QUESTIONS[state.index];
  state.answered = false;
  state.qStart = Date.now();          /* reset per-question clock for bonus */

  /* Progress bar + counter update. */
  els.counter.textContent = `Question ${state.index + 1} / ${QUESTIONS.length}`;
  els.progress.style.width = `${(state.index / QUESTIONS.length) * 100}%`;

  /* Delegate to the type-specific builder. */
  if (q.type === "choice") renderChoice(q);
  else if (q.type === "hotspot") renderHotspot(q);
  else if (q.type === "audio") renderAudio(q);
  else if (q.type === "video") renderVideo(q);
}

/* --------------------------------------------------------------------------
   Shared builder: options grid + answer handling + auto-advance.
   -------------------------------------------------------------------------- */
function renderOptions(options, onPick) {
  const wrap = document.createElement("div");
  wrap.className = "options";

  options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${opt.label}</span>`;

    btn.addEventListener("click", () => {
      if (state.answered || state.locked) return;   /* ignore double clicks */
      btn.classList.add("selected");
      const detail = recordAnswer(opt.cat);
      showToast(detail);
      onPick(opt, detail, btn);
      /* Pause lets the selection animation + points toast be read. */
      setTimeout(advance, ANSWER_PAUSE);
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

/* --- CHOICE question card --- */
function renderChoice(q) {
  const title = document.createElement("h2");
  title.textContent = q.text;
  const tag = document.createElement("span");
  tag.className = "q-tag";
  tag.textContent = q.tag;

  els.card.innerHTML = "";
  els.card.appendChild(tag);
  els.card.appendChild(title);
  els.card.appendChild(renderOptions(q.options, () => {}));
}

/* --- HOTSPOT question card (SVG image-region selection) --- */
function renderHotspot(q) {
  /* Clone the template so each question gets a fresh scene. */
  const clone = els.hotspotTemplate.content.cloneNode(true);
  const stage = clone.querySelector(".hotspot-stage");
  const confirmBtn = clone.querySelector("#hotspot-confirm");
  /* Snapshot the regions BEFORE the clone is appended to the live DOM —
     querySelectorAll on the fragment afterwards would return nothing. */
  const regions = clone.querySelectorAll(".hotspot-region");
  let pendingCat = null;

  /* Wire every clickable region inside the cloned SVG. */
  regions.forEach((region) => {
    const select = () => {
      if (state.answered || state.locked) return;
      /* Highlight only the selected region (remove .selected elsewhere). */
      regions.forEach((r) => r.classList.remove("selected"));
      region.classList.add("selected");
      pendingCat = region.getAttribute("data-cat");
      confirmBtn.disabled = false;
      confirmBtn.classList.add("show");   /* fade in the confirm button */
    };
    region.addEventListener("click", select);
    region.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } });
  });

  confirmBtn.addEventListener("click", () => {
    if (!pendingCat || state.answered || state.locked) return;
    const detail = recordAnswer(pendingCat);
    showToast(detail);
    confirmBtn.textContent = `+${detail.points} pts for ${CATEGORIES[pendingCat].label}`;
    setTimeout(advance, ANSWER_PAUSE);
  });

  /* Confirm button keeps its id so it can be styled from CSS. */
  confirmBtn.id = "hotspot-confirm";
  els.card.innerHTML = "";
  const tag = document.createElement("span");
  tag.className = "q-tag";
  tag.textContent = q.tag;
  const title = document.createElement("h2");
  title.textContent = q.text;
  els.card.appendChild(tag);
  els.card.appendChild(title);
  els.card.appendChild(clone);
}

/* --- AUDIO question card (HTML5 <audio> + custom controls) --- */
function renderAudio(q) {
  els.card.innerHTML = "";

  const tag = document.createElement("span");
  tag.className = "q-tag";
  tag.textContent = q.tag;
  const title = document.createElement("h2");
  title.textContent = q.text;

  /* Native <audio> element (no controls attr — we drive it with buttons). */
  const audio = document.createElement("audio");
  audio.src = q.src;
  audio.preload = "auto";
  audio.innerHTML = "Your browser does not support the audio element.";

  /* Custom transport bar: play/pause/replay (events below). */
  const bar = document.createElement("div");
  bar.className = "player-bar";
  const btnPlay = document.createElement("button");
  btnPlay.type = "button";
  btnPlay.className = "btn btn-primary";
  btnPlay.textContent = "Play";
  const btnReplay = document.createElement("button");
  btnReplay.type = "button";
  btnReplay.className = "btn btn-ghost";
  btnReplay.textContent = "Replay";
  bar.appendChild(btnPlay);
  bar.appendChild(btnReplay);

  /* Progress readout so the user sees playback position. */
  const status = document.createElement("small");
  status.style.cssText = "display:block;color:var(--muted);margin-top:.4rem;";
  status.textContent = "Ready to play.";
  bar.appendChild(status);

  /* Custom control events wired to the media element. */
  btnPlay.addEventListener("click", () => {
    if (audio.paused) { audio.play(); btnPlay.textContent = "Pause"; status.textContent = "Playing..."; }
    else { audio.pause(); btnPlay.textContent = "Play"; status.textContent = "Paused. You can replay or answer."; }
  });
  btnReplay.addEventListener("click", () => {
    audio.currentTime = 0;      /* rewind to the start */
    audio.play();               /* then restart playback */
    btnPlay.textContent = "Pause";
    status.textContent = "Playing from the start...";
  });
  audio.addEventListener("ended", () => {
    btnPlay.textContent = "Replay";
    status.textContent = "Finished. Choose your answer.";
  });

  els.card.appendChild(tag);
  els.card.appendChild(title);
  els.card.appendChild(audio);
  els.card.appendChild(bar);
  els.card.appendChild(renderOptions(q.options, () => {}));
}

/* --- VIDEO question card (auto-pause at a timestamp via timeupdate) --- */
function renderVideo(q) {
  els.card.innerHTML = "";

  const tag = document.createElement("span");
  tag.className = "q-tag";
  tag.textContent = q.tag;
  const title = document.createElement("h2");
  title.textContent = q.text;

  /* Native <video> with standard controls for accessibility. */
  const video = document.createElement("video");
  video.src = q.src;
  video.controls = true;
  video.preload = "auto";
  video.playsInline = true;
  video.innerHTML = "Your browser does not support the video element.";

  /* Custom transport bar on top of the native controls. */
  const bar = document.createElement("div");
  bar.className = "player-bar";
  const btnPlay = document.createElement("button");
  btnPlay.type = "button";
  btnPlay.className = "btn btn-primary";
  btnPlay.textContent = "Start demo";
  const btnReplay = document.createElement("button");
  btnReplay.type = "button";
  btnReplay.className = "btn btn-ghost";
  btnReplay.textContent = "Replay";
  bar.appendChild(btnPlay);
  bar.appendChild(btnReplay);

  /* Decision panel is hidden until the video reaches the pause point. */
  const panel = document.createElement("div");
  panel.className = "reveal-panel";
  panel.innerHTML = `<h3 style="margin-bottom:.7rem;">${q.decisionText}</h3>`;
  panel.appendChild(renderOptions(q.options, () => {}));
  let pausedForDecision = false;

  /* Start / resume control. */
  btnPlay.addEventListener("click", () => { video.play(); btnPlay.textContent = "Pause"; });
  btnReplay.addEventListener("click", () => { video.currentTime = 0; video.play(); btnPlay.textContent = "Pause"; });
  video.addEventListener("pause", () => { btnPlay.textContent = "Resume"; });
  video.addEventListener("ended", () => { btnPlay.textContent = "Start demo"; });

  /* KEY REQUIREMENT: timeupdate listener that auto-pauses at the timestamp. */
  video.addEventListener("timeupdate", () => {
    if (video.currentTime >= q.pauseAt && !pausedForDecision && !state.answered) {
      video.pause();                 /* freeze the clip at the decision point */
      pausedForDecision = true;
      btnPlay.textContent = "Resume";
      panel.classList.add("show");   /* reveal the question + options        */
    }
  });

  els.card.appendChild(tag);
  els.card.appendChild(title);
  els.card.appendChild(video);
  els.card.appendChild(bar);
  els.card.appendChild(panel);
}

/* --------------------------------------------------------------------------
   ADVANCE — move to the next question or finish the quiz.
   -------------------------------------------------------------------------- */
function advance() {
  if (state.locked) return;
  if (state.index < QUESTIONS.length - 1) {
    state.index += 1;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

/* --------------------------------------------------------------------------
   FINISH — persist results and navigate to the results page.
   -------------------------------------------------------------------------- */
function finishQuiz() {
  clearInterval(state.timerId);           /* stop the clock if still running */
  sessionStorage.setItem("bse-results", JSON.stringify({
    scores: state.scores,
    answers: state.answers,
    timeUsed: QUIZ_TIME - state.timeLeft,
    timedOut: state.timeLeft <= 0,
    completedAt: Date.now(),
    student: student
  }));
  window.location.href = "results.html";
}

/* --------------------------------------------------------------------------
   BOOT — start the quiz.
   -------------------------------------------------------------------------- */
renderQuestion();
startTimer();
