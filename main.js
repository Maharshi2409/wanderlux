/* ==========================================================
   WanderLux – main.js
   Shared behaviour used on every page:
   - mobile navigation toggle
   - sticky header shadow + back-to-top button
   - scroll-triggered reveal animations (IntersectionObserver)
   - animated statistic counters
   - hero banner slider (Home page only)
   - package filter (Destinations page only)
   ========================================================== */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initHeaderAndBackToTop();
  initScrollReveal();
  initCounters();
  initSlider();
  initFilter();
  setFooterYear();
});

/* ---------- Mobile navigation ---------- */
function initNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    menu.classList.toggle("open", !isOpen);
  });

  // Close the menu with the Escape key (keyboard accessibility)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) {
      toggle.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
      toggle.focus();
    }
  });
}

/* ---------- Header shadow and back-to-top ---------- */
function initHeaderAndBackToTop() {
  const header = document.querySelector(".site-header");
  const topBtn = document.querySelector(".back-to-top");

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (topBtn) topBtn.classList.toggle("show", y > 500);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (topBtn) {
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

/* ---------- Scroll-triggered animations ----------
   Elements with the class "reveal" start hidden (see style.css).
   When 15% of an element enters the viewport we add "is-visible",
   which triggers a CSS transition. Each element animates once. */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => observer.observe(el));
}

/* ---------- Count-up statistics (About page) ---------- */
function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length || !("IntersectionObserver" in window)) return;

  const animate = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(target * eased).toLocaleString("en-AU") + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => observer.observe(c));
}

/* ---------- Rotating hero banner (Home) ---------- */
function initSlider() {
  const slider = document.querySelector(".hero");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".slide"));
  const dotsWrap = slider.querySelector(".slider-dots");
  const prevBtn = slider.querySelector(".slider-prev");
  const nextBtn = slider.querySelector(".slider-next");
  const pauseBtn = slider.querySelector(".slider-pause");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let timer = null;
  let paused = reducedMotion;

  // Build one dot button per slide
  const dots = slides.map((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Show slide ${i + 1}: ${slide.dataset.title}`);
    dot.addEventListener("click", () => { goTo(i); restart(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(index) {
    slides[current].classList.remove("active");
    slides[current].setAttribute("aria-hidden", "true");
    dots[current].setAttribute("aria-selected", "false");
    current = (index + slides.length) % slides.length;
    slides[current].classList.add("active");
    slides[current].setAttribute("aria-hidden", "false");
    dots[current].setAttribute("aria-selected", "true");
  }

  function restart() {
    clearInterval(timer);
    if (!paused) timer = setInterval(() => goTo(current + 1), 6000);
  }

  prevBtn.addEventListener("click", () => { goTo(current - 1); restart(); });
  nextBtn.addEventListener("click", () => { goTo(current + 1); restart(); });
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "▶" : "❚❚";
    pauseBtn.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
    restart();
  });
  if (paused) { pauseBtn.textContent = "▶"; pauseBtn.setAttribute("aria-label", "Play slideshow"); }

  // Pause while the user hovers or focuses inside the banner
  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", restart);

  // Swipe support for touch devices
  let touchX = null;
  slider.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { goTo(current + (dx < 0 ? 1 : -1)); restart(); }
    touchX = null;
  });

  goTo(0);
  restart();
}

/* ---------- Package filter (Destinations) ---------- */
function initFilter() {
  const buttons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll("[data-category]");
  const status = document.getElementById("filter-status");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      let shown = 0;
      cards.forEach((card) => {
        const match = filter === "all" || card.dataset.category.split(" ").includes(filter);
        card.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (status) status.textContent = `Showing ${shown} package${shown === 1 ? "" : "s"}.`;
    });
  });
}

function setFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}
