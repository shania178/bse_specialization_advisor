/* ==========================================================================
   contact.js — Contact & Feedback Page Logic
   --------------------------------------------------------------------------
   1. Reuses the shared regex validation engine for name / email / subject.
   2. Adds an interactive star rating (hover preview + click to select).
   3. Handles form submit: validates everything, then shows an inline
      success banner (no native alert, no server round-trip).
   ========================================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const starsWrap = document.getElementById("stars");
  const ratingError = document.getElementById("c-rating-error");
  const success = document.getElementById("contact-success");
  const submitBtn = form.querySelector("button[type=submit]");

  let rating = 0;                    /* stores the user's selected star count */

  /* The shared engine wires the regex fields; this returns a validator. */
  const isFormValid = window.Validate.attachForm(form);

  /* ----------------------------------------------------------------------
     STAR RATING — build 5 star buttons with hover preview + selection.
     ---------------------------------------------------------------------- */
  function buildStars() {
    for (let i = 1; i <= 5; i += 1) {
      const star = document.createElement("button");
      star.type = "button";
      star.setAttribute("role", "radio");
      star.setAttribute("aria-label", `Rate ${i} out of 5`);
      star.innerHTML = "&#9733;";          /* filled star glyph */

      /* Hover preview: temporarily light stars up to the hovered index. */
      star.addEventListener("mouseenter", () => paintStars(i));
      star.addEventListener("mouseleave", () => paintStars(rating));

      /* Click to select + clear the rating error. */
      star.addEventListener("click", () => {
        rating = i;
        paintStars(rating);
        ratingError.setAttribute("aria-hidden", "true");
      });

      starsWrap.appendChild(star);
    }
  }

  /* Toggle the .on class (amber fill) for indices 1..n. */
  function paintStars(n) {
    Array.from(starsWrap.children).forEach((s, idx) => {
      s.classList.toggle("on", idx < n);
    });
  }

  /* Keyboard support: Left/Right arrows move the selection. */
  function handleRatingKeys(e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      rating = e.key === "ArrowRight" ? Math.min(5, rating + 1) : Math.max(0, rating - 1);
      paintStars(rating);
      if (rating > 0) ratingError.setAttribute("aria-hidden", "true");
    }
  }

  buildStars();
  starsWrap.addEventListener("keydown", handleRatingKeys);

  /* ----------------------------------------------------------------------
     SUBMIT — validate fields + rating, then show the success banner.
     ---------------------------------------------------------------------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();               /* no native submission */

    const fieldsOk = isFormValid();
    const ratingOk = rating > 0;
    ratingError.setAttribute("aria-hidden", ratingOk ? "true" : "false");

    if (!fieldsOk || !ratingOk) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    /* Re-render the banner (in case it was shown and dismissed before). */
    success.classList.remove("show");
    void success.offsetWidth;             /* restart the fade-in animation */
    success.classList.add("show");
    submitBtn.textContent = "Feedback sent!";
    submitBtn.disabled = true;
  });
});
