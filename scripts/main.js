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

  // ===== Phone field =====
  // Strips anything that is not a digit and reformats as (212)555-0123 while
  // typing, so nobody has to work out the format themselves. The pattern
  // attribute is the actual gate, and it still holds without JavaScript.
  const phone = document.getElementById("contact-phone");

  if (phone) {
    const formatPhone = function (value) {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      if (digits.length === 0) return "";
      if (digits.length <= 3) return "(" + digits;
      if (digits.length <= 6) {
        return "(" + digits.slice(0, 3) + ")" + digits.slice(3);
      }
      return (
        "(" + digits.slice(0, 3) + ")" + digits.slice(3, 6) + "-" + digits.slice(6)
      );
    };

    phone.addEventListener("input", function () {
      const atEnd = phone.selectionStart === phone.value.length;
      phone.value = formatPhone(phone.value);
      // Keep the caret at the end while appending, so reformatting does not
      // bounce it backwards mid-type.
      if (atEnd) {
        phone.setSelectionRange(phone.value.length, phone.value.length);
      }
      // Clear any stale message so the field can pass once corrected
      phone.setCustomValidity("");
    });

    // The browser's default pattern message says nothing useful
    phone.addEventListener("invalid", function () {
      phone.setCustomValidity(
        "Please enter a 10-digit phone number, for example (212)555-0123."
      );
    });
  }
})();
