/* ==========================================================
   WanderLux – forms.js
   Client-side validation and email delivery for:
   - Appointment Request form (appointment.html)
   - General contact form (contact.html)

   Emails are sent with FormSubmit (https://formsubmit.co), a free
   form-to-email service that needs no server code. The form data is
   posted with fetch() to FormSubmit's AJAX endpoint, which forwards it
   to the agency inbox below.

   >>> SET THIS to the inbox that should receive enquiries. <<<
   The very first submission sends a one-time activation email to this
   address; click the link in it and every later message is delivered.
   ========================================================== */
"use strict";

const AGENCY_EMAIL = "your-email@example.com";
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${AGENCY_EMAIL}`;

// Validation rules, keyed by input name
const RULES = {
  name: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name (at least 2 characters)."),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address, e.g. name@example.com."),
  phone: (v) => {
    const digits = v.replace(/[\s()+-]/g, "");
    return /^\d{8,12}$/.test(digits) ? "" : "Please enter a valid phone number (8–12 digits).";
  },
  date: (v) => {
    if (!v) return "Please choose a preferred date.";
    const chosen = new Date(v + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (chosen < today) return "The date cannot be in the past.";
    if (chosen.getDay() === 0) return "We are closed on Sundays – please pick another day.";
    return "";
  },
  subject: (v) => (v ? "" : "Please choose a subject."),
  message: (v) => (v.trim().length >= 10 ? "" : "Please write a message of at least 10 characters."),
};

function validateField(input) {
  const rule = RULES[input.name];
  if (!rule) return true;
  const error = rule(input.value);
  const group = input.closest(".form-group");
  const msg = group.querySelector(".error-msg");
  group.classList.toggle("has-error", Boolean(error));
  group.classList.toggle("is-valid", !error);
  input.setAttribute("aria-invalid", error ? "true" : "false");
  if (msg) msg.textContent = error;
  return !error;
}

function setStatus(el, type, text) {
  el.className = `form-status ${type}`;
  el.textContent = text;
}

async function sendEmail(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const response = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || String(result.success) === "false") {
    throw new Error(result.message || "The message could not be sent.");
  }
  return result;
}

function initForm(form) {
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const inputs = Array.from(form.querySelectorAll("input, select, textarea")).filter((i) => RULES[i.name]);

  // Validate when a user leaves a field, then live once it has an error
  inputs.forEach((input) => {
    // (empty fields are only flagged on submit, so tabbing past them is not punished)
    input.addEventListener("blur", () => { if (input.value.trim()) validateField(input); });
    input.addEventListener("input", () => {
      if (input.closest(".form-group").classList.contains("has-error")) validateField(input);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) {
      setStatus(status, "error", "Please correct the highlighted fields and try again.");
      form.querySelector("[aria-invalid='true']").focus();
      return;
    }

    // Spam honeypot: real users never fill this hidden field
    if (form.querySelector('[name="_honey"]')?.value) return;

    if (AGENCY_EMAIL === "your-email@example.com") {
      setStatus(status, "error", "Email sending is not set up yet: set AGENCY_EMAIL in js/forms.js.");
      return;
    }

    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Sending…";
    try {
      await sendEmail(form);
      const first = form.querySelector('[name="name"]').value.trim().split(" ")[0];
      setStatus(status, "success", form.dataset.success.replace("{name}", first));
      form.reset();
      form.querySelectorAll(".form-group").forEach((g) => g.classList.remove("is-valid", "has-error"));
    } catch (err) {
      setStatus(status, "error", `Sorry, something went wrong (${err.message}). Please call us on (03) 9123 4567.`);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form[data-email-form]").forEach(initForm);

  // Prevent past dates in the date picker
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  // Pre-fill the appointment message when arriving from the calculator
  const trip = new URLSearchParams(window.location.search).get("trip");
  const message = document.getElementById("message");
  if (trip && message && document.getElementById("appointment-form")) {
    message.value = `Hi WanderLux team, I'd like to discuss this trip: ${trip}.`;
  }
});
