// Progressive enhancement — the site is fully functional without JS.
(function () {
  "use strict";

  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.querySelectorAll(".nav__link");

  // Add a border/background to the sticky header once the page scrolls.
  const onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Close the mobile menu after tapping a link.
  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (navToggle) navToggle.checked = false;
    });
  });

  // Close the mobile menu with the Escape key.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && navToggle) navToggle.checked = false;
  });

  // Reveal sections on scroll (respect reduced-motion via CSS + guard here).
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const revealTargets = document.querySelectorAll(
    ".hero, .section-heading, .skills__list, .project"
  );

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  revealTargets.forEach(function (el) {
    el.classList.add("reveal");
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealTargets.forEach(function (el) {
    observer.observe(el);
  });
})();
