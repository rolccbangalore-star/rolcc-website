(function () {
  var slugScript = document.getElementById("article-clap-slug");
  if (!slugScript) return;

  var slug = "";
  try {
    slug = JSON.parse(slugScript.textContent || "");
  } catch (e) {
    return;
  }
  if (!slug) return;

  function getOrCreateActionDock() {
    var dock = document.getElementById("article-action-dock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "article-action-dock";
      dock.className = "article-action-dock";
      document.body.appendChild(dock);
    }
    return dock;
  }

  var dockHideVisible = new Set();
  var dockHideObserver = null;
  var dockHideObserved = typeof WeakSet !== "undefined" ? new WeakSet() : null;
  var dockHideObservedFallback = [];

  function updateDockVisibility() {
    var dock = document.getElementById("article-action-dock");
    if (!dock) return;
    dock.classList.toggle("is-hidden", dockHideVisible.size > 0);
  }

  function ensureDockHideObserver() {
    if (dockHideObserver || !("IntersectionObserver" in window)) return dockHideObserver;
    dockHideObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
            dockHideVisible.add(entry.target);
          } else {
            dockHideVisible.delete(entry.target);
          }
        });
        updateDockVisibility();
      },
      { threshold: [0, 0.12, 0.25], rootMargin: "0px 0px -6% 0px" }
    );
    return dockHideObserver;
  }

  function collectDockHideTargets() {
    var targets = [];
    var quizRoot = document.querySelector("[data-article-quiz]");
    var quizSection =
      document.getElementById("article-quiz") ||
      (quizRoot && quizRoot.closest("section")) ||
      quizRoot;
    if (quizSection) targets.push(quizSection);

    document.querySelectorAll(".article-faq").forEach(function (el) {
      targets.push(el);
    });

    var related = document.querySelector('[aria-labelledby="related-articles-heading"]');
    if (related) targets.push(related);

    var spacers = document.querySelectorAll(".serve-unveil-spacer");
    if (spacers.length) targets.push(spacers[spacers.length - 1]);

    return targets;
  }

  function observeDockHideTarget(el) {
    if (!el) return;
    if (dockHideObserved) {
      if (dockHideObserved.has(el)) return;
      dockHideObserved.add(el);
    } else if (dockHideObservedFallback.indexOf(el) !== -1) {
      return;
    } else {
      dockHideObservedFallback.push(el);
    }
    var observer = ensureDockHideObserver();
    if (!observer) return;
    observer.observe(el);
  }

  function initDockAutoHide() {
    collectDockHideTargets().forEach(observeDockHideTarget);
  }

  window.ArticleClap = {
    getActionDock: getOrCreateActionDock,
    observeDockHideTarget: observeDockHideTarget,
    initDockAutoHide: initDockAutoHide,
  };

  var dock = getOrCreateActionDock();
  var wrap = document.createElement("div");
  wrap.className = "article-clap-wrap";

  var hintEl = document.createElement("span");
  hintEl.className = "article-clap__hint";
  hintEl.setAttribute("data-clap-hint", "");
  hintEl.textContent = "Give Kudos";

  var widget = document.createElement("button");
  widget.type = "button";
  widget.className = "article-clap";
  widget.setAttribute("data-article-clap", "");
  widget.setAttribute("data-slug", slug);
  widget.setAttribute("aria-pressed", "false");
  widget.setAttribute("aria-label", "Give kudos to this article");
  widget.innerHTML =
    '<span class="article-clap__ring" aria-hidden="true"></span>' +
    '<span class="article-clap__icon" aria-hidden="true">' +
    '<canvas class="article-clap__lottie" data-clap-lottie width="128" height="128"></canvas>' +
    "</span>" +
    '<span class="article-clap__total"><span data-clap-count>0</span> Kudos</span>';

  wrap.appendChild(hintEl);
  wrap.appendChild(widget);
  dock.appendChild(wrap);

  var btn = widget;
  var iconEl = widget.querySelector(".article-clap__icon");
  var lottieCanvas = widget.querySelector("[data-clap-lottie]");
  var countEl = widget.querySelector("[data-clap-count]");
  var MAX_USER_CLAPS = 50;
  var storageKey = "rolcc-clap:" + slug;
  var userClaps = parseInt(localStorage.getItem(storageKey) || "0", 10) || 0;
  var totalCount = 0;
  var pendingSync = 0;
  var syncTimer = null;
  var holdTimer = null;
  var holdInterval = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dotLottiePlayer = null;
  var dotLottieReady = null;
  var LOTTIE_SRC = "/assets/confetti.lottie";
  var holdStarted = false;
  var pointerActive = false;
  var hintHideTimer = null;
  var personalHintActive = false;
  var HINT_VISIBLE_MS = 4000;
  var HINT_FADE_MS = 300;

  function formatCount(value) {
    var n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    if (n >= 10) return String(n);
    return String(n).padStart(2, "0");
  }

  function hidePersonalHint() {
    if (!hintEl) return;
    personalHintActive = false;
    hintEl.classList.add("is-hidden");
    hintEl.classList.remove("is-visible");
    window.setTimeout(function () {
      if (!personalHintActive) {
        hintEl.textContent = "";
        hintEl.classList.remove("is-personal");
      }
    }, HINT_FADE_MS);
  }

  function showPersonalHint() {
    if (!hintEl || userClaps <= 0) return;
    personalHintActive = true;
    hintEl.textContent = "You gave " + userClaps + "x";
    hintEl.classList.add("is-personal", "is-visible");
    hintEl.classList.remove("is-hidden");
    if (hintHideTimer) window.clearTimeout(hintHideTimer);
    hintHideTimer = window.setTimeout(function () {
      hidePersonalHint();
      hintHideTimer = null;
    }, HINT_VISIBLE_MS);
  }

  function updateHintDefault() {
    if (!hintEl || personalHintActive || hintHideTimer) return;
    if (userClaps > 0) {
      hintEl.textContent = "";
      hintEl.classList.add("is-hidden");
      hintEl.classList.remove("is-personal", "is-visible");
    } else {
      hintEl.textContent = "Give Kudos";
      hintEl.classList.remove("is-hidden", "is-personal");
      hintEl.classList.add("is-visible");
    }
  }

  function updateUI(options) {
    options = options || {};
    if (countEl) countEl.textContent = formatCount(totalCount);
    if (options.showPersonal && userClaps > 0) {
      showPersonalHint();
    } else if (!personalHintActive && !hintHideTimer) {
      updateHintDefault();
    }
    widget.classList.toggle("is-active", userClaps > 0);
    btn.disabled = userClaps >= MAX_USER_CLAPS;
    btn.setAttribute("aria-pressed", userClaps > 0 ? "true" : "false");
    if (userClaps >= MAX_USER_CLAPS) {
      btn.setAttribute("aria-label", "Maximum kudos reached. You gave " + userClaps + "x.");
    } else if (userClaps > 0) {
      btn.setAttribute(
        "aria-label",
        totalCount + " kudos total. You gave " + userClaps + "x. Tap or press and hold for more."
      );
    } else {
      btn.setAttribute("aria-label", formatCount(totalCount) + " kudos. Give kudos. Tap or press and hold for more.");
    }
  }

  function ensureDotLottie() {
    if (!lottieCanvas || reducedMotion) return Promise.resolve(null);
    if (dotLottiePlayer) return Promise.resolve(dotLottiePlayer);
    if (dotLottieReady) return dotLottieReady;

    dotLottieReady = import("https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.39.0/+esm")
      .then(function (mod) {
        if (!mod || !mod.DotLottie || !lottieCanvas) return null;
        dotLottiePlayer = new mod.DotLottie({
          canvas: lottieCanvas,
          src: LOTTIE_SRC,
          autoplay: false,
          loop: false,
        });
        if (typeof dotLottiePlayer.setFrame === "function") {
          dotLottiePlayer.setFrame(0);
        }
        return dotLottiePlayer;
      })
      .catch(function () {
        dotLottieReady = null;
        return null;
      });

    return dotLottieReady;
  }

  function playClapAnimation() {
    if (reducedMotion) {
      if (!iconEl) return;
      iconEl.classList.remove("is-pulse");
      void iconEl.offsetWidth;
      iconEl.classList.add("is-pulse");
      return;
    }

    ensureDotLottie().then(function (player) {
      if (!player) {
        if (!iconEl) return;
        iconEl.classList.remove("is-pulse");
        void iconEl.offsetWidth;
        iconEl.classList.add("is-pulse");
        return;
      }
      if (typeof player.stop === "function") player.stop();
      if (typeof player.setFrame === "function") player.setFrame(0);
      player.play();
    });
  }

  function addClaps(amount) {
    amount = amount || 1;
    var room = MAX_USER_CLAPS - userClaps;
    if (room <= 0) return 0;
    var applied = Math.min(amount, room);
    userClaps += applied;
    totalCount += applied;
    pendingSync += applied;
    localStorage.setItem(storageKey, String(userClaps));
    updateUI({ showPersonal: applied > 0 });
    playClapAnimation();
    scheduleSync();
    return applied;
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = window.setTimeout(flushSync, 450);
  }

  function flushSync() {
    syncTimer = null;
    var amount = pendingSync;
    if (amount <= 0) return;
    pendingSync = 0;

    fetch("/api/clap?slug=" + encodeURIComponent(slug), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("sync failed");
        return res.json();
      })
      .then(function (data) {
        if (typeof data.count === "number") {
          totalCount = data.count;
          updateUI();
        }
      })
      .catch(function () {
        pendingSync += amount;
        scheduleSync();
      });
  }

  function fetchCount() {
    fetch("/api/clap?slug=" + encodeURIComponent(slug))
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data.count === "number") {
          totalCount = data.count;
          updateUI();
        }
      })
      .catch(function () {
        /* offline or KV not configured */
      });
  }

  function stopHold() {
    if (holdTimer) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (holdInterval) {
      window.clearInterval(holdInterval);
      holdInterval = null;
    }
    holdStarted = false;
  }

  function startHold() {
    if (userClaps >= MAX_USER_CLAPS) return;
    stopHold();
    holdStarted = false;
    holdTimer = window.setTimeout(function () {
      holdStarted = true;
      holdInterval = window.setInterval(function () {
        if (!addClaps(1)) stopHold();
      }, 120);
    }, 280);
  }

  btn.addEventListener("pointerdown", function () {
    if (btn.disabled) return;
    pointerActive = true;
    startHold();
  });

  function onPointerEnd() {
    if (!pointerActive) return;
    var wasHold = holdStarted;
    stopHold();
    if (!wasHold) addClaps(1);
    pointerActive = false;
  }

  ["pointerup", "pointerleave", "pointercancel"].forEach(function (name) {
    btn.addEventListener(name, onPointerEnd);
  });

  window.addEventListener("pagehide", function () {
    stopHold();
    if (hintHideTimer) {
      window.clearTimeout(hintHideTimer);
      hintHideTimer = null;
    }
    personalHintActive = false;
    if (pendingSync > 0) flushSync();
  });

  updateUI();
  ensureDotLottie();
  fetchCount();
  initDockAutoHide();
})();
