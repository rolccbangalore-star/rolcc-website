/**
 * Personal Caring page motion (GSAP + ScrollTrigger).
 * Honors prefers-reduced-motion. Animates transform/opacity only.
 */
(function () {
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initSectionRail() {
    var nav = document.querySelector(".pcare-section-rail");
    if (!nav) return;

    var links = Array.prototype.slice.call(
      nav.querySelectorAll('a[href^="#"]')
    );
    if (!links.length) return;

    var sections = links
      .map(function (link) {
        var id = link.getAttribute("href").slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (link) {
        var match = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-active", match);
        if (match) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }

    if ("IntersectionObserver" in window && sections.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          var visible = entries
            .filter(function (e) {
              return e.isIntersecting;
            })
            .sort(function (a, b) {
              return b.intersectionRatio - a.intersectionRatio;
            });
          if (visible[0] && visible[0].target.id) {
            setActive(visible[0].target.id);
          }
        },
        { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
      );
      sections.forEach(function (section) {
        observer.observe(section);
      });
    }

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        var id = link.getAttribute("href").slice(1);
        if (id) setActive(id);
      });
    });
  }

  /* FAQ accordion: use shared js/faq/accordion.js (data-faq-accordion) */

  function revealStatic() {
    document.querySelectorAll(".pcare-reveal, .pcare-step, .pcare-hero__content, .pcare-hero__visual, .pcare-hero__media").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  function initGsap() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      revealStatic();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var heroContent = document.querySelector(".pcare-hero__content");
    var heroVisual = document.querySelector(
      ".pcare-hero__media, .pcare-hero__visual"
    );
    if (heroContent) {
      gsap.from(heroContent.children, {
        opacity: 0,
        y: 28,
        duration: 0.85,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "transform",
      });
    }
    if (heroVisual) {
      gsap.from(heroVisual, {
        opacity: 0,
        scale: 1.04,
        duration: 1.1,
        ease: "power2.out",
        clearProps: "transform",
      });
    }

    gsap.utils.toArray(".pcare-reveal").forEach(function (el) {
      gsap.from(el, {
        opacity: 0,
        y: 32,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        clearProps: "transform",
      });
    });

    var steps = gsap.utils.toArray(".pcare-step");
    if (steps.length) {
      gsap.from(steps, {
        opacity: 0,
        y: 40,
        duration: 0.65,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".pcare-steps",
          start: "top 75%",
          toggleActions: "play none none none",
        },
        clearProps: "transform",
      });
    }

    var prayer = document.querySelector(".pcare-prayer");
    if (prayer) {
      gsap.from(prayer, {
        opacity: 0,
        y: 36,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: prayer,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        clearProps: "transform",
      });
    }
  }

  function init() {
    initSectionRail();
    if (reduce) {
      revealStatic();
      return;
    }
    initGsap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
