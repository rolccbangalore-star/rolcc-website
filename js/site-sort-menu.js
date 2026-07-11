(function (global) {
  function findOptionLabel(menu, value, valueAttr) {
    if (!menu || !value) return "";
    var btn = menu.querySelector("[" + valueAttr + '="' + value + '"]');
    if (!btn) return "";
    var label = btn.querySelector(".site-sort-menu__option-label");
    return label ? label.textContent.trim() : btn.textContent.trim();
  }

  function closeSortMenu(wrap, trigger, menu) {
    if (!wrap || !trigger || !menu) return;
    wrap.classList.remove("is-open");
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function bindSiteSortMenu(config) {
    var wrap = document.querySelector(config.wrap);
    if (!wrap) return null;

    var trigger = wrap.querySelector(config.trigger);
    var menu = wrap.querySelector(config.menu);
    var valueEl = wrap.querySelector(config.valueEl);
    if (!trigger || !menu) return null;

    function updateUi(currentValue) {
      if (valueEl) {
        valueEl.textContent = findOptionLabel(menu, currentValue, config.valueAttr);
      }
      menu.querySelectorAll(".site-sort-menu__option").forEach(function (btn) {
        var active = btn.getAttribute(config.valueAttr) === currentValue;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = wrap.classList.contains("is-open");
      document.querySelectorAll(".site-sort-menu.is-open").forEach(function (other) {
        if (other === wrap) return;
        closeSortMenu(
          other,
          other.querySelector("[aria-haspopup='listbox']"),
          other.querySelector(".site-sort-menu__menu")
        );
      });
      if (open) {
        closeSortMenu(wrap, trigger, menu);
        return;
      }
      wrap.classList.add("is-open");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    });

    menu.addEventListener("click", function (event) {
      var btn = event.target.closest(".site-sort-menu__option");
      if (!btn) return;
      var value = btn.getAttribute(config.valueAttr) || config.defaultValue;
      if (typeof config.onChange === "function") config.onChange(value);
      closeSortMenu(wrap, trigger, menu);
    });

    document.addEventListener("click", function (event) {
      if (!wrap.classList.contains("is-open")) return;
      if (event.target.closest(config.wrap)) return;
      closeSortMenu(wrap, trigger, menu);
    });

    return {
      updateUi: updateUi,
      close: function () {
        closeSortMenu(wrap, trigger, menu);
      },
    };
  }

  global.bindSiteSortMenu = bindSiteSortMenu;
})(window);
