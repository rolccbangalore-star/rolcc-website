(function (global) {
  "use strict";

  var PANEL_TRANSITION_MS = 380;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setPanelClosed(panel, instant) {
    if (!panel) return;

    panel.classList.remove("is-open");
    panel.style.maxHeight = instant ? "0px" : panel.scrollHeight + "px";

    if (instant || prefersReducedMotion()) {
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
      panel.hidden = true;
      panel.style.removeProperty("max-height");
      panel.style.removeProperty("opacity");
      return;
    }

    window.requestAnimationFrame(function () {
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
    });

    window.setTimeout(function () {
      if (!panel.classList.contains("is-open")) {
        panel.hidden = true;
        panel.style.removeProperty("max-height");
        panel.style.removeProperty("opacity");
      }
    }, PANEL_TRANSITION_MS);
  }

  function setPanelOpen(panel, instant) {
    if (!panel) return;

    panel.hidden = false;
    panel.classList.add("is-open");

    if (instant || prefersReducedMotion()) {
      panel.style.removeProperty("max-height");
      panel.style.removeProperty("opacity");
      return;
    }

    panel.style.maxHeight = "0px";
    panel.style.opacity = "0";

    window.requestAnimationFrame(function () {
      panel.style.maxHeight = panel.scrollHeight + "px";
      panel.style.opacity = "1";
    });

    window.setTimeout(function () {
      if (panel.classList.contains("is-open")) {
        panel.style.maxHeight = "none";
      }
    }, PANEL_TRANSITION_MS);
  }

  function closeTrigger(root, trigger, instant) {
    if (!trigger) return;
    trigger.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    var panelId = trigger.getAttribute("aria-controls");
    var panel = panelId ? document.getElementById(panelId) : null;
    setPanelClosed(panel, instant);
  }

  function initAccordion(root) {
    if (!root || root.dataset.faqAccordionInit === "true") return;
    root.dataset.faqAccordionInit = "true";

    var singleOpen = root.dataset.singleOpen !== "false";
    var triggers = root.querySelectorAll(".faq-accordion__trigger");

    triggers.forEach(function (trigger) {
      var panelId = trigger.getAttribute("aria-controls");
      var panel = panelId ? document.getElementById(panelId) : null;
      if (panel && panel.hidden && !trigger.classList.contains("is-open")) {
        panel.style.maxHeight = "0px";
        panel.style.opacity = "0";
      }

      trigger.addEventListener("click", function () {
        var expanded = trigger.getAttribute("aria-expanded") === "true";
        var instant = prefersReducedMotion();

        if (singleOpen) {
          root.querySelectorAll(".faq-accordion__trigger.is-open").forEach(function (openTrigger) {
            if (openTrigger === trigger) return;
            closeTrigger(root, openTrigger, instant);
          });
        }

        if (expanded) {
          closeTrigger(root, trigger, instant);
        } else {
          trigger.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          setPanelOpen(panel, instant);
        }
      });
    });
  }

  function initAll(scope) {
    (scope || document).querySelectorAll("[data-faq-accordion]").forEach(initAccordion);
  }

  global.FAQAccordion = {
    init: initAccordion,
    initAll: initAll,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }
})(window);
