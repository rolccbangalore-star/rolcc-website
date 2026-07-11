(function () {
  function activateYoutubePlayer(button) {
    var videoId = button.getAttribute("data-video-id");
    if (!videoId || button.getAttribute("data-gallery-youtube-active") === "true") return;

    var title = button.getAttribute("aria-label") || "YouTube video";
    var frame = document.createElement("div");
    frame.className = "gallery-youtube-card__frame";
    frame.setAttribute("data-gallery-youtube-active", "true");

    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?autoplay=1&rel=0";
    iframe.title = title.replace(/^Play\s+/, "");
    iframe.loading = "lazy";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allowfullscreen", "");

    frame.appendChild(iframe);
    button.replaceWith(frame);
  }

  document.querySelectorAll("[data-gallery-youtube-play]").forEach(function (button) {
    button.addEventListener("click", function () {
      activateYoutubePlayer(button);
    });
  });

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
