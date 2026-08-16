/* ==========================================================================
   landing.js — Landing Page Logic
   --------------------------------------------------------------------------
   Handles the programme-select validation (not covered by regex rules) and
   the final submit flow: validate everything, persist the student profile
   to sessionStorage, then redirect to the quiz page.
   ========================================================================== */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("landing-form");
  const progSelect = document.getElementById("f-prog");
  const progError = document.getElementById("prog-error");
  const submitBtn = form.querySelector("button[type=submit]");

  /* The shared validation engine wires the regex-based fields (name, ID,
     email, phone). The programme dropdown uses a plain "required" check. */
  const isFormValid = window.Validate.attachForm(form);

  /* --- Programme dropdown validation (input-level feedback) --- */
  const validateProgramme = () => {
    const valid = progSelect.value !== "";
    progSelect.classList.toggle("is-valid", valid);
    progSelect.classList.toggle("is-invalid", !valid);
    progSelect.setAttribute("aria-invalid", String(!valid));
    progError.setAttribute("aria-hidden", valid ? "true" : "false");
    return valid;
  };
  progSelect.addEventListener("change", validateProgramme);

  /* --- Submit flow --- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();          /* never use native browser submission */

    const fieldsOk = isFormValid();
    const progOk = validateProgramme();
    if (!fieldsOk || !progOk) {
      /* Focus the first invalid field for keyboard/screen-reader users. */
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    /* Persist profile so quiz.html and results.html can greet the student. */
    window.Student.saveStudent({
      name: document.getElementById("f-name").value.trim(),
      studentId: document.getElementById("f-id").value.trim(),
      email: document.getElementById("f-email").value.trim().toLowerCase(),
      phone: document.getElementById("f-phone").value.trim(),
      programme: progSelect.value,
      completedAt: Date.now()
    });

    /* Small visual acknowledgement before navigating. */
    submitBtn.textContent = "Loading your quiz...";
    submitBtn.disabled = true;
    setTimeout(() => { window.location.href = "quiz.html"; }, 450);
  });
});
