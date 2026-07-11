(function () {
  function activateYoutubePlayer(button) {
    var videoId = button.getAttribute("data-video-id");
    if (!videoId || button.getAttribute("data-gallery-youtube-active") === "true") return;

    var title = button.getAttribute("aria-label") || "YouTube video";
    var frame = document.createElement("div");
    frame.className = "gallery-youtube-card__frame";
    frame.setAttribute("data-gallery-youtube-active", "true");

    var iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?autoplay=1&rel=0";
    iframe.title = title.replace(/^Play\s+/, "");
    iframe.loading = "lazy";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allowfullscreen", "");

    frame.appendChild(iframe);
    button.replaceWith(frame);
  }

  function initPreview(button) {
    var img = button.querySelector(".gallery-youtube-card__thumb");
    var framesJson = button.getAttribute("data-preview-frames");
    if (!img || !framesJson) return;

    var frames;
    try {
      frames = JSON.parse(framesJson);
    } catch (error) {
      return;
    }
    if (!Array.isArray(frames) || frames.length < 2) return;

    var originalSrc = img.getAttribute("src") || img.src;
    var index = 0;
    var timer = null;

    function start() {
      if (timer || button.getAttribute("data-gallery-youtube-active") === "true") return;
      button.classList.add("is-previewing");
      index = 0;
      timer = window.setInterval(function () {
        index = (index + 1) % frames.length;
        img.src = frames[index];
      }, 400);
    }

    function stop() {
      button.classList.remove("is-previewing");
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      img.src = originalSrc;
    }

    button.addEventListener("mouseenter", start);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("focus", start);
    button.addEventListener("blur", stop);
  }

  document.querySelectorAll("[data-gallery-youtube-play]").forEach(function (button) {
    initPreview(button);
    button.addEventListener("click", function () {
      activateYoutubePlayer(button);
    });
  });

  var grid = document.querySelector("[data-gallery-youtube-grid]");
  var currentSort = "newest";
  var sortMenuControl =
    typeof bindSiteSortMenu === "function"
      ? bindSiteSortMenu({
          wrap: "[data-gallery-sort-wrap]",
          trigger: "[data-gallery-sort-toggle]",
          menu: "[data-gallery-sort-menu]",
          valueEl: "[data-gallery-sort-value-label]",
          valueAttr: "data-gallery-sort-value",
          defaultValue: "newest",
          onChange: function (value) {
            applySort(value);
          },
        })
      : null;

  function getCards() {
    if (!grid) return [];
    return Array.from(grid.querySelectorAll(".gallery-youtube-card"));
  }

  function compareCards(a, b, sort) {
    if (sort === "popular") {
      return Number(b.getAttribute("data-sort-views") || 0) - Number(a.getAttribute("data-sort-views") || 0);
    }
    if (sort === "alphabet") {
      return String(a.getAttribute("data-sort-title") || "").localeCompare(
        String(b.getAttribute("data-sort-title") || "")
      );
    }
    if (sort === "oldest") {
      return String(a.getAttribute("data-sort-published") || "").localeCompare(
        String(b.getAttribute("data-sort-published") || "")
      );
    }
    return String(b.getAttribute("data-sort-published") || "").localeCompare(
      String(a.getAttribute("data-sort-published") || "")
    );
  }

  function applySort(sort) {
    if (!grid) return;
    currentSort = sort || "newest";
    if (sortMenuControl) sortMenuControl.updateUi(currentSort);

    var cards = getCards().sort(function (a, b) {
      return compareCards(a, b, currentSort);
    });
    cards.forEach(function (card) {
      grid.appendChild(card);
    });
  }

  if (sortMenuControl) sortMenuControl.updateUi(currentSort);

  var instagramSection = document.querySelector("[data-gallery-instagram]");
  if (!instagramSection) return;

  var embedLoaded = false;

  function loadInstagramEmbeds() {
    if (embedLoaded) return;
    embedLoaded = true;
    var script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = function () {
      if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
        window.instgrm.Embeds.process();
      }
    };
    document.body.appendChild(script);
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadInstagramEmbeds();
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(instagramSection);
    return;
  }

  loadInstagramEmbeds();
})();
