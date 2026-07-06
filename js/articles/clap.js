(function () {
  var widget = document.querySelector("[data-article-clap]");
  if (!widget) return;

  var slug = widget.getAttribute("data-slug");
  var btn = widget.querySelector("[data-clap-button]");
  var lottieCanvas = widget.querySelector("[data-clap-lottie]");
  if (!btn || !slug) return;

  var countEl = widget.querySelector("[data-clap-count]");
  var userEl = widget.querySelector("[data-clap-user]");
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
  var LOTTIE_SRC = "/assets/clap.lottie";
  var holdStarted = false;
  var pointerActive = false;

  function formatCount(value) {
    var n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function updateUI() {
    if (countEl) countEl.textContent = formatCount(totalCount);
    if (userEl) {
      if (userClaps > 0) {
        userEl.hidden = false;
        userEl.textContent =
          userClaps === 1 ? "You appreciated this once" : "You appreciated this " + userClaps + " times";
      } else {
        userEl.hidden = true;
        userEl.textContent = "";
      }
    }
    widget.classList.toggle("is-active", userClaps > 0);
    btn.disabled = userClaps >= MAX_USER_CLAPS;
    btn.setAttribute("aria-pressed", userClaps > 0 ? "true" : "false");
    if (userClaps >= MAX_USER_CLAPS) {
      btn.setAttribute("aria-label", "Maximum appreciations reached");
    } else {
      btn.setAttribute("aria-label", "Appreciate this article. Click or press and hold for more.");
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
      btn.classList.remove("is-pulse");
      void btn.offsetWidth;
      btn.classList.add("is-pulse");
      return;
    }

    ensureDotLottie().then(function (player) {
      if (!player) {
        btn.classList.remove("is-pulse");
        void btn.offsetWidth;
        btn.classList.add("is-pulse");
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
    updateUI();
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
    if (pendingSync > 0) flushSync();
  });

  updateUI();
  ensureDotLottie();
  fetchCount();
})();
