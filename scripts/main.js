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

  // ===== Contact form =====
  // The form works without this: it posts natively to /api/contact and the
  // function redirects to /thanks.html. This just keeps people on the page.
  const contactForm = document.getElementById("contact-form");
  const contactStatus = document.getElementById("contact-status");

  if (contactForm && contactStatus && window.fetch) {
    const setStatus = function (text, kind) {
      contactStatus.textContent = text;
      contactStatus.hidden = !text;
      contactStatus.classList.toggle("contact__status_error", kind === "error");
      contactStatus.classList.toggle("contact__status_success", kind === "success");
    };

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (contactForm.classList.contains("contact__form_sending")) return;

      contactForm.classList.add("contact__form_sending");
      setStatus("Sending\u2026", null);

      fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.data.ok) {
            throw new Error(result.data.error || "Something went wrong.");
          }
          contactForm.reset();
          setStatus("Thanks \u2014 your message is on its way. I'll reply soon.", "success");
        })
        .catch(function (error) {
          setStatus(
            error.message ||
              "Couldn't send that. Email me at elvinlucero35@gmail.com instead.",
            "error"
          );
        })
        .then(function () {
          contactForm.classList.remove("contact__form_sending");
        });
    });
  }
})();
