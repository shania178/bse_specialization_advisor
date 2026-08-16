/* ==========================================================================
   results.js — Results Page Logic
   --------------------------------------------------------------------------
   1. Reads quiz scores from sessionStorage.
   2. Renders the profile outcome, animated score bars, narrative feedback
      and next-step recommendations.
   3. Draws a dynamic HTML5 Canvas RADAR/SPIDER chart using only the
      2D context API (no external libraries), with a requestAnimationFrame
      draw-in animation and a particle "confetti" celebration burst.
   ========================================================================== */

"use strict";

/* Mirror of the quiz categories so results render with matching colours. */
const CATEGORIES = {
  low:  { label: "Low-Level Programming", color: "#f59e0b" },
  arvr: { label: "AR / VR",                color: "#8b5cf6" },
  web:  { label: "Full-Stack Web",         color: "#0ea5e9" },
  ml:   { label: "Machine Learning",       color: "#10b981" }
};

/* Narrative content: a description + next-step suggestions per category. */
const PROFILE_COPY = {
  low: {
    desc: "You're drawn to understanding how things work underneath the hood — memory, performance and full control over the machine.",
    recs: [
      "Choose BSE modules on systems programming and computer architecture.",
      "Join the embedded-systems / IoT society on campus.",
      "Try building a small emulator or a toy operating system in your free time.",
      "Target roles: systems engineer, embedded developer, performance engineer."
    ]
  },
  arvr: {
    desc: "You're excited by immersive, interactive experiences where software meets your senses — space, motion and real-time rendering.",
    recs: [
      "Choose BSE modules in computer graphics and human-computer interaction.",
      "Build a Unity or Blender 3D side-project to grow a portfolio.",
      "Offer to create VR/AR demos for campus events and clubs.",
      "Target roles: XR engineer, 3D developer, game programmer."
    ]
  },
  web: {
    desc: "You love shipping products that real people use every day — from pixels and accessibility to databases and the cloud.",
    recs: [
      "Choose BSE modules in full-stack development and databases.",
      "Deploy a personal project portfolio so your work is live on the web.",
      "Enter hackathons to sharpen API design and teamwork skills.",
      "Target roles: full-stack developer, front-end engineer, cloud developer."
    ]
  },
  ml: {
    desc: "You're fascinated by data, patterns and systems that learn and predict — turning messy information into insight.",
    recs: [
      "Choose BSE modules in machine learning, statistics and Python.",
      "Create a Kaggle account and enter a beginner competition.",
      "Practise linear algebra and read about neural networks in your free time.",
      "Target roles: ML engineer, data scientist, AI researcher."
    ]
  }
};

/* Ranking phrasing for 1st..4th place (tells a story about each score). */
const RANK_COPY = {
  1: "Your strongest signal — this is where your instincts and interests align best.",
  2: "A very close second — a great foundation to combine with your top choice.",
  3: "Worth exploring — you showed meaningful interest here.",
  4: "Lower affinity for now — but every engineer benefits from dipping in."
};

/* --------------------------------------------------------------------------
   DATA LOADING — pull the saved quiz payload out of sessionStorage.
   -------------------------------------------------------------------------- */
function loadData() {
  try {
    return JSON.parse(sessionStorage.getItem("bse-results"));
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   DOM BUILD — render the whole results view from the stored payload.
   -------------------------------------------------------------------------- */
function buildUI(data) {
  const root = document.getElementById("results-root");

  /* Rank the four categories by score (highest first). */
  const ranking = Object.keys(CATEGORIES)
    .map((key) => ({ key, label: CATEGORIES[key].label, color: CATEGORIES[key].color, score: data.scores[key] }))
    .sort((a, b) => b.score - a.score);

  const top = ranking[0];
  const studentName = data.student ? data.student.name : "";
  const timeNote = data.timedOut
    ? "You ran out of time — answers recorded up to the final question."
    : `You finished in ${data.timeUsed}s.`;
  const maxScore = Math.max(1, ...ranking.map((r) => r.score));

  /* --- HERO --- */
  const hero = document.createElement("section");
  hero.className = "result-hero hero-glow";
  hero.innerHTML = `
    <div class="container">
      <span class="badge">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${top.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2l3 6 6 .9-4.5 4.3 1.1 6.2L12 16.6 6.4 19.4l1.1-6.2L3 8.9 9 8z"/>
        </svg>
        Your top specialisation
      </span>
      <h1 style="color:${top.color}">${top.label}</h1>
      <p class="lead">Based on your answers, <strong>${top.label}</strong> is your best-fit pathway for the BSE programme. ${timeNote}</p>
      ${studentName ? `<p class="lead" style="font-size:.95rem;">Profile: ${studentName}</p>` : ""}
    </div>`;
  root.appendChild(hero);

  /* --- SCORE BARS + NARRATIVE + CANVAS --- */
  const grid = document.createElement("section");
  grid.className = "section";
  grid.innerHTML = `<div class="container results-grid" id="results-grid"></div>`;
  root.appendChild(grid);
  const gridEl = grid.querySelector("#results-grid");

  /* Left column: animated score bars + ranked narrative. */
  const left = document.createElement("div");
  left.innerHTML = `
    <div class="card">
      <h2 style="margin-bottom:1rem;">Category breakdown</h2>
      <div class="score-list" id="score-list"></div>
    </div>
    <div class="card" style="margin-top:1.2rem;">
      <h2 style="margin-bottom:.8rem;">What this means</h2>
      <div id="narrative"></div>
    </div>`;
  gridEl.appendChild(left);

  /* Right column: the HTML5 Canvas radar chart. */
  const right = document.createElement("div");
  right.innerHTML = `
    <div class="card">
      <h2 style="margin-bottom:1rem;">Your specialisation radar</h2>
      <div class="canvas-wrap">
        <canvas id="radar" width="620" height="620" role="img"
                aria-label="Radar chart of your four specialisation scores"></canvas>
      </div>
      <p style="color:var(--muted);font-size:.85rem;margin-top:.8rem;">
        The chart is rendered with the raw HTML5 Canvas 2D API — no libraries.
      </p>
    </div>`;
  gridEl.appendChild(right);

  /* --- SCORE BARS (width + count-up animated by JS below) --- */
  const list = left.querySelector("#score-list");
  ranking.forEach((row, i) => {
    const pct = Math.round((row.score / maxScore) * 100);
    const div = document.createElement("div");
    div.className = "score-row";
    div.innerHTML = `
      <span class="name">${row.label}</span>
      <span class="track"><span class="fill" style="--c:${row.color}" data-target="${pct}"></span></span>
      <span class="val" data-target="${row.score}">0</span>`;
    list.appendChild(div);
  });

  /* --- NARRATIVE (ranked copy per category) --- */
  const narrative = left.querySelector("#narrative");
  ranking.forEach((row, i) => {
    const p = document.createElement("p");
    p.style.cssText = "border-left:4px solid " + row.color + ";padding-left:.8rem;margin-bottom:.9rem;";
    p.innerHTML = `<strong>${i + 1}. ${row.label} — ${row.score} pts</strong><br>${PROFILE_COPY[row.key].desc} ${RANK_COPY[i + 1]}`;
    narrative.appendChild(p);
  });

  /* --- RECOMMENDATIONS (top two pathways) --- */
  const recSection = document.createElement("section");
  recSection.className = "section";
  recSection.innerHTML = `<div class="container"><h2 style="margin-bottom:1.2rem;">Next-step recommendations</h2><div class="rec-list" id="rec-list"></div></div>`;
  root.appendChild(recSection);
  const recList = recSection.querySelector("#rec-list");
  ranking.slice(0, 2).forEach((row) => {
    const card = document.createElement("div");
    card.className = "card rec-card";
    card.style.setProperty("--rc", row.color);
    card.innerHTML = `
      <h3>${row.label}</h3>
      <ul>${PROFILE_COPY[row.key].recs.map((r) => "<li>" + r + "</li>").join("")}</ul>`;
    recList.appendChild(card);
  });

  /* --- ACTIONS --- */
  const actions = document.createElement("section");
  actions.className = "section";
  actions.innerHTML = `
    <div class="container" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">
      <a class="btn btn-primary" href="quiz.html">Retake the quiz</a>
      <a class="btn btn-ghost" href="contact.html">Talk to us</a>
      <a class="btn btn-ghost" href="index.html">Update my details</a>
    </div>`;
  root.appendChild(actions);

  /* Kick off the animated visuals with the computed scores. */
  animateBars();
  drawRadar(document.getElementById("radar"), ranking, maxScore);
}

/* --------------------------------------------------------------------------
   ANIMATED SCORE BARS — CSS transitions drive the width; a rAF loop
   counts the numbers up to their final value.
   -------------------------------------------------------------------------- */
function animateBars() {
  const fills = document.querySelectorAll(".score-row .fill");
  const vals = document.querySelectorAll(".score-row .val");

  /* Let the browser paint the 0-state first, then trigger width transition. */
  requestAnimationFrame(() => {
    fills.forEach((fill) => { fill.style.width = `${fill.dataset.target}%`; });
  });

  /* Count-up: animate each number from 0 to its target over ~1s. */
  vals.forEach((el) => {
    const target = Number(el.dataset.target);
    const duration = 1000;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);          /* ease-out cubic */
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* --------------------------------------------------------------------------
   CANVAS RADAR CHART
   --------------------------------------------------------------------------
   Pure Canvas 2D rendering. Steps:
   1. Configure the canvas (incl. devicePixelRatio so it stays crisp).
   2. Draw grid rings + axis spokes + labels.
   3. Fill the data polygon and stroke it, with vertex dots.
   4. requestAnimationFrame sweeps a progress value 0 -> 1 for the reveal.
   5. A particle confetti burst fires from the winning axis once drawn.
   -------------------------------------------------------------------------- */
function drawRadar(canvas, ranking, maxScore) {
  const ctx = canvas.getContext("2d");

  /* Crisp rendering on high-density displays via DPR scaling. */
  const SIZE = 620;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.scale(dpr, dpr);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 210;

  /* Map ranking entries to angular positions starting at 12 o'clock. */
  const angles = ranking.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / ranking.length);

  const pointAt = (radius, angle) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  });

  /* --- Single draw routine (rings, spokes, polygon, labels). ------------ */
  /* The `progress` argument (0..1) eases the data polygon into view so the
     same routine can drive both the reveal animation and the confetti
     backdrop. */
  function draw(progress) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    /* Concentric grid rings at 25/50/75/100% of the radius. */
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const p = pointAt(R * f, a);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#dde3ee";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    /* Axis spokes from centre to each axis tip. */
    angles.forEach((a) => {
      const p = pointAt(R, a);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "#dde3ee";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    /* Data polygon — vertex radii are eased in by the sweep progress. */
    const t = easeOutCubic(progress);
    ctx.beginPath();
    ranking.forEach((row, i) => {
      const value = row.score / maxScore;              /* 0..1 normalised */
      const p = pointAt(R * value * t, angles[i]);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();

    /* Soft gradient fill (tinted from the winning category colour). */
    const grad = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
    grad.addColorStop(0, hexToRgba(ranking[0].color, 0.5));
    grad.addColorStop(1, hexToRgba(ranking[0].color, 0.08));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = ranking[0].color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    /* Vertex dots on every data point. */
    ranking.forEach((row, i) => {
      const value = row.score / maxScore;
      const p = pointAt(R * value * t, angles[i]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = row.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    /* Category labels + scores anchored just past each axis tip. */
    ranking.forEach((row, i) => {
      const a = angles[i];
      const p = pointAt(R + 44, a);
      ctx.save();
      ctx.translate(p.x, p.y);
      /* Flip labels in the lower half so they never render upside down. */
      ctx.rotate(Math.cos(a) < 0 ? Math.PI : 0);
      ctx.textAlign = "center";
      ctx.font = "700 15px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = row.color;
      ctx.fillText(row.label, 0, 0);
      ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#5b6b82";
      ctx.fillText(`${row.score} pts`, 0, 18);
      ctx.restore();
    });
  }

  /* --- Reveal animation (sweep progress 0 -> 1, then confetti). --------- */
  const startTime = performance.now();
  const REVEAL_MS = 1200;
  requestAnimationFrame(function animate(now) {
    const p = Math.min(1, (now - startTime) / REVEAL_MS);
    draw(p);
    if (p < 1) requestAnimationFrame(animate);
    else spawnConfetti(ctx, draw, SIZE, R, angles, ranking[0]);
  });
}

/* --------------------------------------------------------------------------
   PARTICLE CONFETTI — lightweight physics loop fired from the winning axis.
   The completed chart (draw(1)) is re-rendered beneath the particles.
   -------------------------------------------------------------------------- */
function spawnConfetti(ctx, draw, SIZE, R, angles, top) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const tip = { x: cx + R * Math.cos(angles[0]), y: cy + R * Math.sin(angles[0]) };

  /* Palette: winning colour + accent white + two soft neutrals. */
  const palette = [top.color, "#ffffff", "#fde68a", "#c7d2fe"];

  /* Seed ~70 particles with randomised velocities, sizes and spin. */
  const particles = Array.from({ length: 70 }, () => ({
    x: tip.x,
    y: tip.y,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9 - 2,
    size: 4 + Math.random() * 5,
    color: palette[Math.floor(Math.random() * palette.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 1
  }));

  const GRAVITY = 0.16;               /* pixels/frame² pulled down          */
  const started = performance.now();

  function frame(now) {
    const age = (now - started) / 1000;
    ctx.clearRect(0, 0, SIZE, SIZE);
    draw(1);                           /* static chart behind the particles */

    particles.forEach((p) => {
      p.vy += GRAVITY;                 /* integrate gravity + velocity      */
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.02;                  /* fade out over time                */

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (age < 3) requestAnimationFrame(frame);   /* stop after ~3s */
  }

  frame(started);
}

/* --------------------------------------------------------------------------
   SHARED CANVAS HELPERS
   -------------------------------------------------------------------------- */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* Convert a #rrggbb colour + alpha into an rgba() string for gradients. */
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* --------------------------------------------------------------------------
   BOOT
   -------------------------------------------------------------------------- */
const data = loadData();
if (!data || !data.scores) {
  /* No results yet: guide the visitor to the quiz. */
  document.getElementById("results-root").innerHTML = `
    <section class="section"><div class="container" style="text-align:center;max-width:560px;">
      <div class="card">
        <h2>No results yet</h2>
        <p style="color:var(--muted);margin:1rem 0;">Complete the quiz first and we'll build your specialisation radar here.</p>
        <a class="btn btn-primary" href="quiz.html">Take the quiz</a>
      </div>
    </div></section>`;
} else {
  buildUI(data);
}
