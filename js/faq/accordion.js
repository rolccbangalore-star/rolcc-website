(function (global) {
  "use strict";

  function initAccordion(root) {
    if (!root || root.dataset.faqAccordionInit === "true") return;
    root.dataset.faqAccordionInit = "true";

    var singleOpen = root.dataset.singleOpen !== "false";
    var triggers = root.querySelectorAll(".faq-accordion__trigger");

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var expanded = trigger.getAttribute("aria-expanded") === "true";
        var panelId = trigger.getAttribute("aria-controls");
        var panel = panelId ? document.getElementById(panelId) : null;

        if (singleOpen) {
          root.querySelectorAll(".faq-accordion__trigger.is-open").forEach(function (openTrigger) {
            if (openTrigger === trigger) return;
            openTrigger.classList.remove("is-open");
            openTrigger.setAttribute("aria-expanded", "false");
            var otherPanelId = openTrigger.getAttribute("aria-controls");
            var otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
            if (otherPanel) {
              otherPanel.classList.remove("is-open");
              otherPanel.hidden = true;
            }
          });
        }

        trigger.classList.toggle("is-open", !expanded);
        trigger.setAttribute("aria-expanded", expanded ? "false" : "true");
        if (panel) {
          panel.classList.toggle("is-open", !expanded);
          panel.hidden = expanded;
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
