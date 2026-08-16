/* ==========================================================================
   shared.js — Validation Engine + Global UI Helpers
   --------------------------------------------------------------------------
   1.  Real-time inline form validation using custom regex patterns.
   2.  Visual state toggling (.is-valid / .is-invalid) on input/blur.
   3.  Student profile persistence (sessionStorage) shared across pages.
   4.  Responsive navigation toggle + active-link highlighting.
   ========================================================================== */

"use strict";

/* --------------------------------------------------------------------------
   VALIDATION ENGINE
   --------------------------------------------------------------------------
   Design:
   - A central `RULES` object maps a field name to a test function + message.
   - Regex patterns are kept in one place so they are easy to audit.
   - `attachForm(form)` wires every element that carries a `data-validate`
     attribute with both `input` (live) and `blur` (on-leave) listeners.
   - `renderState(field, valid, message)` is the single DOM-update routine:
     it toggles the .is-valid/.is-invalid classes and shows/hides an
     adjacent <small class="error-message"> element. No alert() popups.
   -------------------------------------------------------------------------- */

/* Every institutional/custom regex lives here (one source of truth). */
const RULES = {
  /* Name: letters (incl. accents), spaces, apostrophes and hyphens only.
     The negative lookahead prevents leading/trailing separators and
     double separators (e.g. "John--Doe" or " John"). */
  name: {
    regex: /^(?!.*[' -]{2})[A-Za-z\u00C0-\u017F]+(?:[' -][A-Za-z\u00C0-\u017F]+)*$/,
    length: { min: 2, max: 50 },
    message: "Use 2-50 letters only (spaces, apostrophes and hyphens allowed, no numbers or symbols)."
  },

  /* Student ID: starts with BSE followed by 4-6 digits, e.g. BSE25013. */
  studentId: {
    regex: /^BSE\d{4,6}$/i,
    message: "Student ID must match the BSE pattern, e.g. BSE25013."
  },

  /* Institutional email: local part is alphanumeric + . _ - separators,
     domain must be bse.ac.mu (student.id@bse.ac.mu format). */
  email: {
    regex: /^[a-z0-9]+(?:[._-][a-z0-9]+)*@bse\.ac\.mu$/i,
    message: "Use your institutional address, e.g. student.id@bse.ac.mu."
  },

  /* Phone: optional +230 (or 230) country code + 8 local digits.
     Local number must start 2-9 (no leading 0), e.g. +23058123456. */
  phone: {
    regex: /^(?:\+?230)?[2-9]\d{7}$/,
    message: "Enter a valid Mauritian number, e.g. +23058123456 or 58123456."
  },

  /* Free-text message used on the contact page (length-based rule). */
  message: {
    length: { min: 20, max: 1000 },
    message: "Your message must be 20-1000 characters long."
  },

  /* Optional fields accept anything (kept for API symmetry). */
  subject: {
    any: true,
    message: ""
  }
};

/* --------------------------------------------------------------------------
   Field evaluation: returns { valid: boolean, message: string }
   -------------------------------------------------------------------------- */
function evaluateField(name, rawValue) {
  const rule = RULES[name];
  if (!rule) return { valid: true, message: "" };
  const value = String(rawValue).trim();

  /* Length-bound rule (message field) — test min/max directly. */
  if (rule.length && !rule.any) {
    if (value.length < rule.length.min || value.length > rule.length.max) {
      return { valid: false, message: rule.message };
    }
  }

  /* Regex rule (plus optional extra length bound for the name field). */
  if (rule.regex) {
    if (rule.length && (value.length < rule.length.min || value.length > rule.length.max)) {
      return { valid: false, message: rule.message };
    }
    if (!rule.regex.test(value)) {
      return { valid: false, message: rule.message };
    }
  }

  if (rule.any) return { valid: value.length > 0, message: "" };
  return { valid: value.length > 0, message: rule.message || "This field is required." };
}

/* --------------------------------------------------------------------------
   DOM update: toggle visual classes + render inline error/valid hint.
   -------------------------------------------------------------------------- */
function renderState(field, valid, message) {
  field.classList.toggle("is-valid", valid);
  field.classList.toggle("is-invalid", !valid);
  field.setAttribute("aria-invalid", String(!valid));

  /* Locate the sibling <small> elements inside the same .field wrapper. */
  const wrapper = field.closest(".field");
  if (!wrapper) return;
  const errorEl = wrapper.querySelector(".error-message");
  const hintEl = wrapper.querySelector(".valid-hint");

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.setAttribute("aria-hidden", valid ? "true" : "false");
  }
  if (hintEl) {
    hintEl.setAttribute("aria-hidden", valid ? "false" : "true");
  }
}

/* --------------------------------------------------------------------------
   Validation runner for a single field (exposed so pages can re-check).
   -------------------------------------------------------------------------- */
function validateField(field) {
  const name = field.getAttribute("data-validate");
  const result = evaluateField(name, field.value);
  renderState(field, result.valid, result.message);
  return result.valid;
}

/* --------------------------------------------------------------------------
   Attach live validation to every [data-validate] field inside a form.
   Returns a function that reports whether the whole form is valid.
   -------------------------------------------------------------------------- */
function attachForm(form) {
  const fields = Array.from(form.querySelectorAll("[data-validate]"));
  fields.forEach((field) => {
    /* Validate live on input, and again when the user leaves the field. */
    field.addEventListener("input", () => validateField(field));
    field.addEventListener("blur", () => validateField(field));
  });

  /* Validate every field and return the overall pass/fail. */
  return () => {
    let allValid = true;
    fields.forEach((field) => {
      if (!validateField(field)) allValid = false;
    });
    return allValid;
  };
}

/* --------------------------------------------------------------------------
   STUDENT PROFILE PERSISTENCE (sessionStorage)
   --------------------------------------------------------------------------
   The landing page writes the student object; the quiz and results pages
   read it. sessionStorage is chosen over localStorage so a fresh browser
   session always starts from the landing page.
   -------------------------------------------------------------------------- */
function saveStudent(profile) {
  sessionStorage.setItem("bse-student", JSON.stringify(profile));
}

function getStudent() {
  try {
    return JSON.parse(sessionStorage.getItem("bse-student")) || null;
  } catch {
    return null;   // corrupt or missing data => fall back gracefully
  }
}

/* --------------------------------------------------------------------------
   NAVIGATION HELPERS
   --------------------------------------------------------------------------
   - Highlights the link matching the current page's <body data-page>.
   - Toggles the mobile hamburger menu.
   -------------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const currentPage = document.body.getAttribute("data-page");

  /* Highlight the active page link in the header. */
  if (currentPage && links) {
    links.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("data-page") === currentPage) {
        link.classList.add("active");
      }
    });
  }

  /* Hamburger toggle (touch-friendly). */
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    /* Close the menu after any navigation choice on mobile. */
    links.addEventListener("click", () => links.classList.remove("open"));
  }
}

/* --------------------------------------------------------------------------
   BOOTSTRAP  — runs once per page (guarded against double execution).
   -------------------------------------------------------------------------- */
if (!window.__sharedBooted) {
  window.__sharedBooted = true;
  document.addEventListener("DOMContentLoaded", initNav);
}

/* Expose helpers to other scripts (they run after this file in HTML). */
window.Validate = { evaluateField, validateField, attachForm, renderState };
window.Student = { saveStudent, getStudent };
