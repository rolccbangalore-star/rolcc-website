(function () {
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
