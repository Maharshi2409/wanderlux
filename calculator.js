/* ==========================================================
   WanderLux – calculator.js
   Trip Cost Calculator.

   Formula
   -------
   rooms          = ceil(travellers / 2)            (twin share)
   daily costs    = dailyRate   × travellers × days  (meals, transport, activities)
   accommodation  = roomRate    × rooms      × days
   subtotal       = (daily costs + accommodation) × style multiplier
   extras         = sum of selected add-ons × travellers
   total          = subtotal + extras

   Example: Bali, 2 travellers, 5 days, Standard
   (150×2×5) + (190×1×5) = 1,500 + 950 = 2,450 × 1.0 = $2,450
   ========================================================== */
"use strict";

// Preset rates in Australian dollars
const DESTINATIONS = {
  bali:        { name: "Bali",                 daily: 150, room: 190 },
  paris:       { name: "Paris",                daily: 260, room: 320 },
  tokyo:       { name: "Tokyo",                daily: 230, room: 280 },
  santorini:   { name: "Santorini",            daily: 240, room: 340 },
  reef:        { name: "the Great Barrier Reef", daily: 180, room: 220 },
  queenstown:  { name: "Queenstown",           daily: 200, room: 250 },
};

const STYLES = {
  budget:   { label: "Budget",   multiplier: 0.7 },
  standard: { label: "Standard", multiplier: 1.0 },
  luxury:   { label: "Luxury",   multiplier: 1.8 },
};

// Optional extras, charged per traveller (not affected by the style multiplier)
const EXTRAS = {
  transfers: { label: "Airport transfers", price: 60 },
  insurance: { label: "Travel insurance",  price: 45 },
  tours:     { label: "Guided day tour",   price: 120 },
};

const money = new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 0,
});

/** Pure function: returns a cost breakdown object. Kept separate from the
 *  DOM so the maths is easy to read and test. */
function calculateTrip({ destination, travellers, days, style, extras }) {
  const d = DESTINATIONS[destination];
  const s = STYLES[style];
  const rooms = Math.ceil(travellers / 2);
  const dailyCost = d.daily * travellers * days;
  const accommodation = d.room * rooms * days;
  const styled = (dailyCost + accommodation) * s.multiplier;
  const extrasCost = extras.reduce((sum, key) => sum + EXTRAS[key].price * travellers, 0);
  const total = Math.round(styled + extrasCost);
  return { d, s, rooms, dailyCost, accommodation, styled, extrasCost, total, perPerson: Math.round(total / travellers) };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("calc-form");
  if (!form) return;

  const fields = {
    destination: form.querySelector("#destination"),
    travellers: form.querySelector("#travellers"),
    days: form.querySelector("#days"),
  };
  const daysOut = form.querySelector("#days-out");
  const resultCard = document.getElementById("result-card");
  let hasCalculated = false;

  // Keep the visible day count in sync with the slider
  fields.days.addEventListener("input", () => {
    daysOut.textContent = `${fields.days.value} day${fields.days.value === "1" ? "" : "s"}`;
  });

  function showError(input, message) {
    const group = input.closest(".form-group");
    const msg = group.querySelector(".error-msg");
    group.classList.toggle("has-error", Boolean(message));
    group.classList.toggle("is-valid", !message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    msg.textContent = message || "";
  }

  function validate() {
    let ok = true;
    if (!fields.destination.value) {
      showError(fields.destination, "Please choose a destination.");
      ok = false;
    } else showError(fields.destination, "");

    const t = Number(fields.travellers.value);
    if (!Number.isInteger(t) || t < 1 || t > 20) {
      showError(fields.travellers, "Enter a whole number of travellers between 1 and 20.");
      ok = false;
    } else showError(fields.travellers, "");

    const d = Number(fields.days.value);
    if (!Number.isInteger(d) || d < 1 || d > 30) {
      showError(fields.days, "Trip length must be between 1 and 30 days.");
      ok = false;
    } else showError(fields.days, "");
    return ok;
  }

  function readInputs() {
    return {
      destination: fields.destination.value,
      travellers: Number(fields.travellers.value),
      days: Number(fields.days.value),
      style: form.querySelector('input[name="style"]:checked').value,
      extras: Array.from(form.querySelectorAll('input[name="extras"]:checked')).map((c) => c.value),
    };
  }

  function render(input, r) {
    const tWord = input.travellers === 1 ? "traveller" : "travellers";
    const dWord = input.days === 1 ? "day" : "days";
    const extrasRows = input.extras
      .map((k) => `<tr><th scope="row">${EXTRAS[k].label} (×${input.travellers})</th><td>${money.format(EXTRAS[k].price * input.travellers)}</td></tr>`)
      .join("");

    const query = new URLSearchParams({
      trip: `${r.d.name} – ${input.travellers} ${tWord}, ${input.days} ${dWord}, ${r.s.label} (est. ${money.format(r.total)})`,
    });

    resultCard.innerHTML = `
      <h2>Your estimate</h2>
      <p class="result-total">${money.format(r.total)}</p>
      <p class="result-note" id="result-sentence">Estimated cost for ${input.travellers} ${tWord} to ${r.d.name} for ${input.days} ${dWord}: ${money.format(r.total)} – ${r.s.label} Travel Package.</p>
      <table class="breakdown">
        <caption class="visually-hidden">Cost breakdown</caption>
        <tr><th scope="row">Daily costs (${money.format(r.d.daily)} × ${input.travellers} × ${input.days})</th><td>${money.format(r.dailyCost)}</td></tr>
        <tr><th scope="row">Accommodation (${r.rooms} room${r.rooms > 1 ? "s" : ""} × ${input.days} nights)</th><td>${money.format(r.accommodation)}</td></tr>
        <tr><th scope="row">${r.s.label} multiplier (×${r.s.multiplier})</th><td>${money.format(r.styled)}</td></tr>
        ${extrasRows}
        <tr><th scope="row"><strong>Per person</strong></th><td><strong>${money.format(r.perPerson)}</strong></td></tr>
      </table>
      <a class="btn btn--gold" href="appointment.html?${query}">Book a consultation for this trip</a>`;

    resultCard.classList.remove("pulse");
    void resultCard.offsetWidth; // restart the CSS animation
    resultCard.classList.add("pulse");
  }

  function run() {
    if (!validate()) return false;
    const input = readInputs();
    render(input, calculateTrip(input));
    return true;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (run()) {
      hasCalculated = true;
      if (window.innerWidth < 1024) resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      form.querySelector("[aria-invalid='true']")?.focus();
    }
  });

  // After the first calculation, update the estimate live as inputs change
  form.addEventListener("input", () => { if (hasCalculated) run(); });
  form.addEventListener("change", () => { if (hasCalculated) run(); });

  form.addEventListener("reset", () => {
    hasCalculated = false;
    setTimeout(() => {
      daysOut.textContent = `${fields.days.value} days`;
      form.querySelectorAll(".form-group").forEach((g) => g.classList.remove("has-error", "is-valid"));
      form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
      resultCard.innerHTML = `<h2>Your estimate</h2><p class="placeholder">Fill in your preferences and press <strong>Calculate</strong> to see an estimated cost and breakdown.</p>`;
    });
  });
});
