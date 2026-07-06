document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  var ministriesTrigger = document.getElementById("ministries-trigger");
  var ministriesMenu = document.getElementById("ministries-menu");
  var headerEl = document.getElementById("header");

  if (headerEl) {
    headerEl.classList.add("header-scrolled");
  }

  function setMenuOpen(open) {
    var expanded = !!open;
    if (navToggle) navToggle.setAttribute("aria-expanded", expanded);
    if (navMenu) {
      navMenu.classList.toggle("is-open", expanded);
      navMenu.classList.toggle("hidden", !expanded);
      navMenu.setAttribute("aria-hidden", !expanded);
    }
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      setMenuOpen(!navMenu.classList.contains("is-open"));
    });
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });
  }

  if (ministriesTrigger && ministriesMenu) {
    ministriesTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = ministriesMenu.classList.toggle("is-open");
      ministriesTrigger.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", function () {
      ministriesMenu.classList.remove("is-open");
      ministriesTrigger.setAttribute("aria-expanded", "false");
    });
    ministriesMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
});
