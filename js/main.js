var ANNOUNCE_BANNER_KEY = "rolcc-announce-banner-hidden";

document.addEventListener("DOMContentLoaded", function () {
  const navToggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  const scrollTopBtn = document.getElementById("scroll-top-btn");
  const yearSpan = document.getElementById("year");
  const announceBanner = document.getElementById("announce-banner");
  const announceBannerClose = document.getElementById("announce-banner-close");

  // Announcement banner: only visible on Sunday before 12 noon or Friday 11 AM–1:30 PM (IST)
  if (announceBanner && announceBannerClose) {
    var now = new Date();
    var istOffset = 5.5 * 60;
    var utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    var istMinutes = utcMinutes + istOffset;
    var istHour = Math.floor(istMinutes / 60) % 24;
    var istMin = istMinutes % 60;
    var istDay = new Date(now.getTime() + istOffset * 60000).getUTCDay();

    var showBanner = false;
    var liveLink = "#";
    var bannerText = "Join with us Online";

    if (istDay === 0 && istHour < 12) {
      showBanner = true;
      liveLink = "https://www.youtube.com/@rolccindia/live";
      bannerText = "Join with us Online \u00B7 Sunday English Service";
    } else if (istDay === 5 && (istHour > 11 || (istHour === 11 && istMin >= 0)) && (istHour < 13 || (istHour === 13 && istMin <= 30))) {
      showBanner = true;
      liveLink = "https://www.youtube.com/@riveroflifechristianchurch3694/streams";
      bannerText = "Join with us Online \u00B7 Friday Tamil Service";
    }

    if (!showBanner || localStorage.getItem(ANNOUNCE_BANNER_KEY) === "true") {
      announceBanner.setAttribute("data-hidden", "true");
    } else {
      var watchLink = document.getElementById("announce-watch-live");
      var bannerTitle = announceBanner.querySelector(".announce-banner__title");
      if (watchLink) {
        watchLink.href = liveLink;
        watchLink.target = "_blank";
        watchLink.rel = "noopener noreferrer";
      }
      if (bannerTitle) {
        bannerTitle.firstChild.textContent = bannerText + " ";
      }
    }

    announceBannerClose.addEventListener("click", function () {
      localStorage.setItem(ANNOUNCE_BANNER_KEY, "true");
      announceBanner.setAttribute("data-hidden", "true");
    });
  }

  function setMenuOpen(open) {
    const expanded = !!open;
    if (navToggle) navToggle.setAttribute("aria-expanded", expanded);
    if (navMenu) {
      navMenu.classList.toggle("is-open", expanded);
      navMenu.classList.toggle("hidden", !expanded);
      navMenu.setAttribute("aria-hidden", !expanded);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      setMenuOpen(!navMenu.classList.contains("is-open"));
    });
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  // Ministries dropdown: toggle on click, close on outside click
  var ministriesTrigger = document.getElementById("ministries-trigger");
  var ministriesMenu = document.getElementById("ministries-menu");
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

  // Header + announcement: same subtle bar when over hero; adaptive menu text; solid patch after scroll
  var headerEl = document.getElementById("header");
  var heroBannerEl = document.getElementById("hero-banner");
  var givingHeroEl = document.getElementById("giving-hero");
  var arcHeroEl = document.getElementById("arc-hero");
  var marqueeHeroEl = document.getElementById("marquee-hero");
  var heroEl = heroBannerEl || givingHeroEl || arcHeroEl || marqueeHeroEl;
  var announceEl = document.getElementById("announce-banner");
  function updateHeaderScrolled() {
    if (!headerEl) return;
    headerEl.classList.remove("header-over-hero--light", "header-over-hero--dark", "header-over-hero--arc");
    if (announceEl) {
      announceEl.classList.remove("announce-banner--over-dark", "announce-banner--over-light");
    }
    if (!heroEl) {
      headerEl.classList.add("header-scrolled");
      return;
    }
    var heroRect = heroEl.getBoundingClientRect();
    var heroBottom = heroRect.bottom;
    if (heroBottom < 0) {
      headerEl.classList.add("header-scrolled");
    } else {
      headerEl.classList.remove("header-scrolled");
      var isDarkHero = heroBannerEl && heroBannerEl.classList.contains("hero-theme-dark");
      var isLightHero = heroBannerEl && heroBannerEl.classList.contains("hero-theme-light");
      if (marqueeHeroEl && heroEl === marqueeHeroEl) {
        headerEl.classList.add("header-over-hero--arc");
        if (announceEl) announceEl.classList.add("announce-banner--over-light");
      } else if (arcHeroEl && heroEl === arcHeroEl) {
        headerEl.classList.add("header-over-hero--arc");
        if (announceEl) announceEl.classList.add("announce-banner--over-light");
      } else if (givingHeroEl && heroEl === givingHeroEl) {
        headerEl.classList.add("header-over-hero--dark");
        if (announceEl) announceEl.classList.add("announce-banner--over-dark");
      } else if (isDarkHero) {
        headerEl.classList.add("header-over-hero--dark");
        if (announceEl) announceEl.classList.add("announce-banner--over-dark");
      } else if (isLightHero) {
        headerEl.classList.add("header-over-hero--light");
        if (announceEl) announceEl.classList.add("announce-banner--over-light");
      } else {
        headerEl.classList.add("header-over-hero--dark");
        if (announceEl) announceEl.classList.add("announce-banner--over-dark");
      }
    }
  }
  window.addEventListener("scroll", updateHeaderScrolled, { passive: true });
  window.addEventListener("resize", updateHeaderScrolled);
  updateHeaderScrolled();
  window.updateHeaderScrolled = updateHeaderScrolled;

  // Set active nav link from current page (desktop + mobile + ministries dropdown)
  var navLinks = document.querySelectorAll(".header-top__link[data-nav], .header-top__menu-link[data-nav], .header-top__dropdown-link[data-nav]");
  var currentPage = (function () {
    var path = window.location.pathname || "";
    var name = path.split("/").pop() || "index.html";
    return name.replace(/\.html$/, "") || "index";
  })();
  navLinks.forEach(function (link) {
    var page = link.getAttribute("data-nav");
    if (page === currentPage) link.classList.add("text-accent", "font-semibold");
    else link.classList.remove("text-accent", "font-semibold");
  });

  // New Here: testimonial carousel
  var newHereCarousel = document.querySelector(".new-here-carousel");
  if (newHereCarousel) {
    var newHereSlides = newHereCarousel.querySelectorAll(".new-here-carousel__slide");
    var newHereDots = newHereCarousel.querySelectorAll(".new-here-carousel__dot");
    var newHereIndex = 0;
    var newHereTimer;
    function setNewHereSlide(i) {
      newHereIndex = (i + newHereSlides.length) % newHereSlides.length;
      newHereSlides.forEach(function (s, idx) {
        s.classList.toggle("active", idx === newHereIndex);
      });
      newHereDots.forEach(function (d, idx) {
        d.classList.toggle("active", idx === newHereIndex);
      });
    }
    newHereDots.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        setNewHereSlide(i);
        clearInterval(newHereTimer);
        newHereTimer = setInterval(function () {
          setNewHereSlide(newHereIndex + 1);
        }, 5000);
      });
    });
    newHereTimer = setInterval(function () {
      setNewHereSlide(newHereIndex + 1);
    }, 5000);
    // Touch/swipe support
    var newHereTrack = newHereCarousel.querySelector(".new-here-carousel__track");
    if (newHereTrack) {
      var nhTouchStartX = 0, nhTouchEndX = 0;
      newHereTrack.addEventListener("touchstart", function (e) {
        nhTouchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      newHereTrack.addEventListener("touchend", function (e) {
        nhTouchEndX = e.changedTouches[0].screenX;
        var diff = nhTouchStartX - nhTouchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) setNewHereSlide(newHereIndex + 1);
          else setNewHereSlide(newHereIndex - 1);
          clearInterval(newHereTimer);
          newHereTimer = setInterval(function () {
            setNewHereSlide(newHereIndex + 1);
          }, 5000);
        }
      }, { passive: true });
    }
  }

  // Scroll to top button logic
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 200) {
        scrollTopBtn.classList.remove("hidden");
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
        scrollTopBtn.classList.add("hidden");
      }
    });

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Footer: fixed at bottom; Serve section unveils it on scroll (footer-reveal in BG, Serve scrolls up to reveal)
  // When user scrolls to bottom, raise footer z-index so nav links are clickable (main otherwise covers footer)
  (function footerInView() {
    var footerSection = document.getElementById("footer-section");
    if (!footerSection) return;
    var threshold = 80;
    function update() {
      var nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - threshold;
      document.body.classList.toggle("footer-in-view", nearBottom);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  // New Here: big para darkens line-by-line on scroll (grey → dark)
  var newHereSection = document.getElementById("new-here");
  if (newHereSection) {
    function updateNewHereReveal() {
      var rect = newHereSection.getBoundingClientRect();
      var viewHeight = window.innerHeight;
      var range = viewHeight * 0.85;
      var progress = 1 - rect.top / range;
      progress = Math.max(0, Math.min(1, progress));
      newHereSection.style.setProperty("--new-here-reveal", progress);
    }
    window.addEventListener("scroll", updateNewHereReveal, { passive: true });
    window.addEventListener("resize", updateNewHereReveal);
    updateNewHereReveal();
  }

  // Set current year in footer if element exists
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Hero carousel + dynamic text theme from current slide background
  var heroBanner = document.getElementById("hero-banner");
  const carousel = document.querySelector(".hero-carousel");
  if (carousel && heroBanner) {
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dots = carousel.querySelectorAll(".carousel-dots button");
    let current = 0;
    let timer;

    // Adaptive contrast: average image dark → white text; average image light → black text
    function setHeroThemeFromImage(imageUrl) {
      heroBanner.classList.remove("hero-theme-light", "hero-theme-dark");
      if (!imageUrl) {
        heroBanner.classList.add("hero-theme-dark");
        if (window.updateHeaderScrolled) window.updateHeaderScrolled();
        return;
      }
      var img = new Image();
      // Do not set crossOrigin so same-origin (and file) loads don't taint the canvas
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          var ctx = canvas.getContext("2d");
          var w = img.naturalWidth;
          var h = img.naturalHeight;
          if (!w || !h) {
            heroBanner.classList.add("hero-theme-dark");
            if (window.updateHeaderScrolled) window.updateHeaderScrolled();
            return;
          }
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0);
          // Sample a large central area (60%) so bright accents don't dominate; dark overall → white text
          var size = Math.max(20, Math.floor(Math.min(w, h) * 0.6) / 2);
          var x0 = Math.max(0, Math.floor(w / 2) - size);
          var y0 = Math.max(0, Math.floor(h / 2) - size);
          var sw = Math.min(size * 2, w - x0);
          var sh = Math.min(size * 2, h - y0);
          var data = ctx.getImageData(x0, y0, sw, sh);
          var pixels = data.data;
          var r = 0, g = 0, b = 0, n = 0;
          for (var i = 0; i < pixels.length; i += 4) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            n++;
          }
          if (n) {
            r /= n; g /= n; b /= n;
            var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            // Threshold 0.45: mostly dark images (e.g. dark blue + gold accents) still get white text
            heroBanner.classList.add(luminance > 0.45 ? "hero-theme-light" : "hero-theme-dark");
          } else {
            heroBanner.classList.add("hero-theme-dark");
          }
        } catch (e) {
          heroBanner.classList.add("hero-theme-dark");
        }
        if (window.updateHeaderScrolled) window.updateHeaderScrolled();
      };
      img.onerror = function () {
        heroBanner.classList.remove("hero-theme-light", "hero-theme-dark");
        heroBanner.classList.add("hero-theme-dark");
        if (window.updateHeaderScrolled) window.updateHeaderScrolled();
      };
      img.src = imageUrl;
    }

    function goToSlide(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("active", i === current));
      dots.forEach((d, i) => d.classList.toggle("active", i === current));
      var activeSlide = slides[current];
      var bgImage = activeSlide ? activeSlide.getAttribute("data-bg-image") : null;
      setHeroThemeFromImage(bgImage);
    }

    function next() {
      goToSlide(current + 1);
    }

    dots.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        goToSlide(i);
        resetTimer();
      });
    });

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(next, 6000);
    }
    timer = setInterval(next, 6000);

    // Touch/swipe support for hero carousel
    var trackEl = carousel.querySelector(".carousel-track");
    if (trackEl) {
      var touchStartX = 0, touchEndX = 0;
      trackEl.addEventListener("touchstart", function (e) {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      trackEl.addEventListener("touchend", function (e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) goToSlide(current + 1);
          else goToSlide(current - 1);
          resetTimer();
        }
      }, { passive: true });
    }

    // Initial theme from first slide
    var initialSlide = carousel.querySelector(".carousel-slide.active");
    var initialBg = initialSlide ? initialSlide.getAttribute("data-bg-image") : null;
    setHeroThemeFromImage(initialBg);
  } else if (heroBanner) {
    heroBanner.classList.add("hero-theme-light");
    if (window.updateHeaderScrolled) window.updateHeaderScrolled();
  }

  // Arc Gallery Hero (About page)
  var arcRing = document.getElementById("arc-ring");
  if (arcRing) {
    // About hero arc images (local ROLCC assets)
    var arcImages = [
      "assets/worship-leader-arc.webp",
      "assets/group-photo-arc.webp",
      "assets/prayer-arc.webp",
      "assets/family-arc.webp",
      "assets/youth-arc.webp",
      "assets/riverkids-arc.webp",
      "assets/riverkids-kids-arc.webp",
      "assets/kid-arc.webp",
      "assets/sports-day-river-kids-arc.webp",
      "assets/pr-raj-arc.webp",
      "assets/selviraj-prayer-arc.webp",
      "assets/thunderstorm-arc.webp"
    ];
    var arcStartAngle = 20, arcEndAngle = 160;

    function arcBuild() {
      var w = window.innerWidth;
      var radius, cardSize;
      if (w < 640) { radius = 240; cardSize = 70; }
      else if (w < 1024) { radius = 340; cardSize = 95; }
      else { radius = 460; cardSize = 115; }

      arcRing.innerHTML = "";
      arcRing.style.height = (radius * 1.4) + "px";

      var pivot = document.createElement("div");
      pivot.style.cssText = "position:absolute;left:50%;bottom:0;transform:translateX(-50%)";
      arcRing.appendChild(pivot);

      var count = Math.max(arcImages.length, 2);
      var step = (arcEndAngle - arcStartAngle) / (count - 1);

      arcImages.forEach(function (src, i) {
        var angle = arcStartAngle + step * i;
        var rad = (angle * Math.PI) / 180;
        var x = Math.cos(rad) * radius;
        var y = Math.sin(rad) * radius;

        var card = document.createElement("div");
        card.className = "arc-hero__card";
        card.style.width = cardSize + "px";
        card.style.height = cardSize + "px";
        card.style.left = "calc(50% + " + x + "px)";
        card.style.bottom = y + "px";
        card.style.transform = "translate(-50%, 50%)";
        card.style.animationDelay = (i * 80) + "ms";
        card.style.zIndex = count - i;

        var inner = document.createElement("div");
        inner.className = "arc-hero__card-inner";
        inner.style.transform = "rotate(" + (angle / 4) + "deg)";

        var img = document.createElement("img");
        img.src = src;
        img.alt = "Church life " + (i + 1);
        img.draggable = false;
        img.loading = "eager";
        img.onerror = function () {
          this.src = "https://placehold.co/400x400/e2e8f0/94a3b8?text=ROLCC";
        };

        inner.appendChild(img);
        card.appendChild(inner);
        pivot.appendChild(card);
      });
    }

    arcBuild();
    var arcResizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(arcResizeTimer);
      arcResizeTimer = setTimeout(arcBuild, 200);
    });
  }

  // Latest Sermon carousel: seamless infinite – no gap; after 6th, 1st appears from the right
  var latestSermonSection = document.getElementById("latest-sermon");
  if (latestSermonSection) {
    var track = latestSermonSection.querySelector(".latest-sermon-track");
    var arrows = latestSermonSection.querySelectorAll(".latest-sermon-arrow");
    var originalCards = latestSermonSection.querySelectorAll(".latest-sermon-card");
    var totalOriginal = originalCards.length;

    if (track && totalOriginal > 0) {
      for (var i = 0; i < totalOriginal; i++) {
        var clone = originalCards[i].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }
    }

    var cards = latestSermonSection.querySelectorAll(".latest-sermon-card");
    var total = cards.length;
    var currentIndex = 0;
    var transitionCss = "transform 0.3s ease-out";

    function getStepPx() {
      if (!cards[0]) return 360;
      var w = cards[0].offsetWidth;
      if (total < 2) return w + 20;
      var gap = cards[1].offsetLeft - cards[0].offsetLeft - w;
      return w + gap;
    }

    function updateTrack(instant) {
      if (!track || total === 0) return;
      var step = getStepPx();
      var offset = -(currentIndex * step);
      if (instant) {
        track.style.transition = "none";
        track.style.transform = "translate3d(" + offset + "px, 0, 0)";
        void track.offsetHeight;
        requestAnimationFrame(function () {
          track.style.transition = transitionCss;
        });
      } else {
        track.style.transition = transitionCss;
        track.style.transform = "translate3d(" + offset + "px, 0, 0)";
      }
    }

    function onTransitionEnd() {
      if (currentIndex === total - 1) {
        currentIndex = totalOriginal - 1;
        updateTrack(true);
      } else if (currentIndex === 0) {
        currentIndex = totalOriginal;
        updateTrack(true);
      }
    }

    if (track) {
      track.addEventListener("transitionend", function (e) {
        if (e.target === track && e.propertyName === "transform") onTransitionEnd();
      });
    }

    arrows.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dir = btn.getAttribute("data-direction");
        if (dir === "next") {
          if (currentIndex === total - 1) {
            currentIndex = totalOriginal - 1;
            updateTrack(true);
          } else {
            currentIndex++;
            updateTrack(false);
          }
        } else {
          if (currentIndex === 0) {
            currentIndex = totalOriginal;
            updateTrack(true);
          } else {
            currentIndex--;
            updateTrack(false);
          }
        }
      });
    });

    window.addEventListener("resize", function () {
      updateTrack(false);
    });
    updateTrack(false);

    // Touch/swipe support for latest sermon carousel
    var viewport = latestSermonSection.querySelector(".latest-sermon-viewport");
    if (viewport) {
      var touchStartX = 0, touchEndX = 0;
      viewport.addEventListener("touchstart", function (e) {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      viewport.addEventListener("touchend", function (e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            if (currentIndex === total - 1) {
              currentIndex = totalOriginal - 1;
              updateTrack(true);
            } else {
              currentIndex++;
              updateTrack(false);
            }
          } else {
            if (currentIndex === 0) {
              currentIndex = totalOriginal;
              updateTrack(true);
            } else {
              currentIndex--;
              updateTrack(false);
            }
          }
        }
      }, { passive: true });
    }
  }

  // Testimonials carousel: dots + scroll-to on mobile
  var testimonialsCarousel = document.querySelector(".testimonials-carousel");
  if (testimonialsCarousel) {
    var tcViewport = testimonialsCarousel.querySelector(".testimonials-carousel__viewport");
    var tcSlides = testimonialsCarousel.querySelectorAll(".testimonials-carousel__slide");
    var tcDots = testimonialsCarousel.querySelectorAll(".testimonials-dot");
    function updateTestimonialDots() {
      if (!tcViewport || tcSlides.length === 0) return;
      var scrollLeft = tcViewport.scrollLeft;
      var viewportCenter = scrollLeft + tcViewport.offsetWidth / 2;
      var bestIndex = 0;
      var bestDist = Infinity;
      for (var i = 0; i < tcSlides.length; i++) {
        var slideCenter = tcSlides[i].offsetLeft + tcSlides[i].offsetWidth / 2;
        var dist = Math.abs(viewportCenter - slideCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      tcDots.forEach(function (d, i) {
        d.classList.toggle("active", i === bestIndex);
      });
    }
    if (tcViewport) {
      tcViewport.addEventListener("scroll", updateTestimonialDots, { passive: true });
    }
    tcDots.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        if (tcSlides[i]) {
          tcSlides[i].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }
      });
    });
  }

  // Countup animation on scroll (Meet Our Leaders metrics)
  var countupEls = document.querySelectorAll(".countup");
  if (countupEls.length > 0 && "IntersectionObserver" in window) {
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animateCount(el) {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      var end = parseFloat(el.dataset.end) || 0;
      var suffix = el.dataset.suffix || "";
      var prefix = el.dataset.prefix || "";
      var decimals = (el.dataset.end.indexOf(".") !== -1) ? el.dataset.end.split(".")[1].length : 0;
      var duration = 1400;

      if (prefersReduced) {
        el.textContent = prefix + end.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        return;
      }

      var start = 0;
      var startTime = null;
      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = start + (end - start) * eased;
        el.textContent = prefix + current.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) animateCount(entry.target);
      });
    }, { threshold: 0.3 });
    countupEls.forEach(function (el) { countObserver.observe(el); });
  }

  // Feature Steps auto-play (Core Pillars, About page)
  var fsSection = document.querySelector(".feature-steps");
  if (fsSection) {
    var fsSteps = fsSection.querySelectorAll(".feature-step");
    var fsImgWrap = fsSection.querySelector(".feature-steps__img-wrap");
    var fsImages = [
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1000&h=600&fit=crop",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000&h=600&fit=crop",
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000&h=600&fit=crop",
      "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1000&h=600&fit=crop"
    ];
    var fsGradient = fsImgWrap.querySelector(".feature-steps__gradient");
    var fsCurrent = 0;
    var fsInterval = 4000;
    var fsProgress = 0;
    var fsTick = 100;
    var fsTimer = null;

    function fsUpdateSteps(idx) {
      fsSteps.forEach(function (step, i) {
        step.classList.remove("active", "completed");
        var dot = step.querySelector(".feature-step__dot span");
        if (i === idx) {
          step.classList.add("active");
          dot.textContent = "\u2713";
        } else if (i < idx) {
          step.classList.add("completed");
          dot.textContent = "\u2713";
        } else {
          dot.textContent = String(i + 1);
        }
      });

      if (idx === fsCurrent && fsImgWrap.querySelector(".feature-steps__img")) return;

      var oldImg = fsImgWrap.querySelector(".feature-steps__img:not(.exiting)");
      if (oldImg) {
        oldImg.classList.add("exiting");
        oldImg.addEventListener("animationend", function () { oldImg.remove(); }, { once: true });
      }

      var newImg = document.createElement("img");
      newImg.src = fsImages[idx];
      newImg.alt = fsSteps[idx].querySelector("h3").textContent;
      newImg.className = "feature-steps__img entering";
      newImg.loading = "eager";
      if (fsGradient) {
        fsImgWrap.insertBefore(newImg, fsGradient);
      } else {
        fsImgWrap.appendChild(newImg);
      }
      newImg.addEventListener("animationend", function () { newImg.classList.remove("entering"); }, { once: true });

      fsCurrent = idx;
    }

    function fsStartAutoPlay() {
      fsProgress = 0;
      clearInterval(fsTimer);
      fsTimer = setInterval(function () {
        fsProgress += fsTick;
        if (fsProgress >= fsInterval) {
          var next = (fsCurrent + 1) % fsSteps.length;
          fsUpdateSteps(next);
          fsProgress = 0;
        }
      }, fsTick);
    }

    fsSteps[0].classList.add("active");
    fsSteps[0].querySelector(".feature-step__dot span").textContent = "\u2713";
    fsStartAutoPlay();

    fsSteps.forEach(function (step, i) {
      step.addEventListener("click", function () {
        fsUpdateSteps(i);
        fsStartAutoPlay();
      });
    });

    fsImages.forEach(function (src) {
      var link = document.createElement("link");
      link.rel = "prefetch";
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // Our Story read-more toggle (mobile only)
  var storyToggle = document.getElementById("our-story-toggle");
  if (storyToggle) {
    var storyMore = document.getElementById("our-story-more");
    var storyArrow = document.getElementById("our-story-arrow");
    var storyOpen = false;
    storyToggle.addEventListener("click", function () {
      storyOpen = !storyOpen;
      if (storyOpen) {
        storyMore.classList.remove("hidden");
      } else {
        storyMore.classList.add("hidden");
        storyMore.classList.add("md:block");
      }
      storyArrow.style.transform = storyOpen ? "rotate(180deg)" : "";
      storyToggle.firstChild.textContent = storyOpen ? "Read less " : "Read more ";
    });
  }

  // Ministry Gallery Slideshow (About page)
  var msViewport = document.getElementById("ministry-slideshow");
  if (msViewport) {
    var msSlides = msViewport.querySelectorAll(".ministry-slideshow__slide");
    var msPrev = document.getElementById("ms-prev");
    var msNext = document.getElementById("ms-next");
    var msCounter = document.getElementById("ms-counter");
    var msCurrent = 0;
    var msTotal = msSlides.length;
    var msAutoTimer = null;
    var msAutoDelay = 5000;

    function msGo(idx) {
      msSlides[msCurrent].classList.remove("active");
      msCurrent = (idx + msTotal) % msTotal;
      msSlides[msCurrent].classList.add("active");
      msCounter.textContent =
        String(msCurrent + 1).padStart(2, "0") + " / " + String(msTotal).padStart(2, "0");
    }

    function msStartAuto() {
      clearInterval(msAutoTimer);
      msAutoTimer = setInterval(function () { msGo(msCurrent + 1); }, msAutoDelay);
    }

    msPrev.addEventListener("click", function () { msGo(msCurrent - 1); msStartAuto(); });
    msNext.addEventListener("click", function () { msGo(msCurrent + 1); msStartAuto(); });

    var msTouch0 = 0;
    msViewport.addEventListener("touchstart", function (e) { msTouch0 = e.changedTouches[0].clientX; }, { passive: true });
    msViewport.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - msTouch0;
      if (Math.abs(dx) > 40) { msGo(dx < 0 ? msCurrent + 1 : msCurrent - 1); msStartAuto(); }
    }, { passive: true });

    msStartAuto();
  }

  // Testimonial carousel: crossfade with dots
  (function () {
    var wrap = document.getElementById("testi-carousel");
    if (!wrap) return;
    var cards = wrap.querySelectorAll(".testi-carousel__card");
    var dotsWrap = document.getElementById("testi-dots");
    if (cards.length < 2) return;
    var idx = 0;
    var dots = [];

    cards.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "testi-carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Testimonial " + (i + 1));
      dot.addEventListener("click", function () { goTo(i); resetAuto(); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function goTo(n) {
      cards[idx].classList.remove("is-active");
      dots[idx].classList.remove("is-active");
      idx = n;
      cards[idx].classList.add("is-active");
      dots[idx].classList.add("is-active");
    }

    var timer = setInterval(function () { goTo((idx + 1) % cards.length); }, 5000);
    function resetAuto() { clearInterval(timer); timer = setInterval(function () { goTo((idx + 1) % cards.length); }, 5000); }
  })();

  // Impact carousel: crossfade with arrows, counter, swipe, auto-play
  (function () {
    var wrap = document.getElementById("impact-carousel");
    if (!wrap) return;
    var slides = wrap.querySelectorAll(".impact-carousel__slide");
    var prevBtn = document.getElementById("impact-prev");
    var nextBtn = document.getElementById("impact-next");
    var counter = document.getElementById("impact-counter");
    if (slides.length < 2) return;
    var idx = 0;
    var total = slides.length;

    function goTo(n) {
      slides[idx].classList.remove("is-active");
      idx = ((n % total) + total) % total;
      slides[idx].classList.add("is-active");
      if (counter) counter.textContent = (idx + 1) + " / " + total;
    }
    function resetAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(function () { goTo(idx + 1); }, 5000);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(idx - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(idx + 1); resetAuto(); });

    var touchX = 0;
    wrap.addEventListener("touchstart", function (e) { touchX = e.changedTouches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) { goTo(dx < 0 ? idx + 1 : idx - 1); resetAuto(); }
    }, { passive: true });

    var autoTimer = setInterval(function () { goTo(idx + 1); }, 5000);
  })();

  // Gallery Hover Carousel (GHC): drag + snap + nav buttons
  (function () {
    var viewport = document.getElementById("ghc-viewport");
    var track = document.getElementById("ghc-track");
    if (!viewport || !track) return;

    var cards = track.querySelectorAll(".ghc__card");
    var prevBtn = document.querySelector(".ghc__nav--prev");
    var nextBtn = document.querySelector(".ghc__nav--next");
    var scrollPos = 0;
    var isDragging = false;
    var startX = 0;
    var startScroll = 0;

    function maxScroll() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }
    function clamp(v) { return Math.max(0, Math.min(v, maxScroll())); }
    function applyPos(animate) {
      if (animate) track.classList.remove("is-dragging");
      else track.classList.add("is-dragging");
      track.style.transform = "translateX(" + (-scrollPos) + "px)";
    }
    function updateNav() {
      if (prevBtn) prevBtn.disabled = scrollPos <= 0;
      if (nextBtn) nextBtn.disabled = scrollPos >= maxScroll() - 1;
    }

    function stepSize() {
      if (!cards.length) return viewport.clientWidth * 0.8;
      var card = cards[0];
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      return card.offsetWidth + gap;
    }

    if (prevBtn) prevBtn.addEventListener("click", function () {
      scrollPos = clamp(scrollPos - stepSize());
      applyPos(true); updateNav();
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      scrollPos = clamp(scrollPos + stepSize());
      applyPos(true); updateNav();
    });

    function pointerDown(x) {
      isDragging = true; startX = x; startScroll = scrollPos;
      track.classList.add("is-dragging");
    }
    function pointerMove(x) {
      if (!isDragging) return;
      scrollPos = clamp(startScroll - (x - startX));
      applyPos(false);
    }
    function pointerUp() {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove("is-dragging");
      applyPos(true); updateNav();
    }

    track.addEventListener("mousedown", function (e) { e.preventDefault(); pointerDown(e.clientX); });
    window.addEventListener("mousemove", function (e) { pointerMove(e.clientX); });
    window.addEventListener("mouseup", pointerUp);
    track.addEventListener("touchstart", function (e) { pointerDown(e.touches[0].clientX); }, { passive: true });
    track.addEventListener("touchmove", function (e) { pointerMove(e.touches[0].clientX); }, { passive: true });
    track.addEventListener("touchend", pointerUp);

    track.addEventListener("click", function (e) {
      if (Math.abs(scrollPos - startScroll) > 5) e.preventDefault();
    }, true);

    updateNav();
    window.addEventListener("resize", function () { scrollPos = clamp(scrollPos); applyPos(true); updateNav(); });
  })();

  // Marquee hero: entrance animations + duplicate images for seamless loop
  (function () {
    var mh = document.getElementById("marquee-hero");
    if (!mh) return;

    var tagline = mh.querySelector(".marquee-hero__tagline");
    var words = mh.querySelectorAll(".marquee-hero__word");
    var desc = mh.querySelector(".marquee-hero__desc");
    var cta = mh.querySelector(".marquee-hero__cta");
    var track = mh.querySelector(".marquee-hero__track");

    if (track) {
      var clone = track.innerHTML;
      track.innerHTML += clone;
    }

    var delay = 100;
    if (tagline) setTimeout(function () { tagline.classList.add("is-visible"); }, delay);
    words.forEach(function (w, i) {
      setTimeout(function () { w.classList.add("is-visible"); }, delay + 200 + i * 90);
    });
    var wordsDone = delay + 200 + words.length * 90;
    if (desc) setTimeout(function () { desc.classList.add("is-visible"); }, wordsDone + 100);
    if (cta) setTimeout(function () { cta.classList.add("is-visible"); }, wordsDone + 250);
  })();

  // Scroll reveal: animate elements as they enter viewport
  var revealEls = document.querySelectorAll(".scroll-reveal");
  if (revealEls.length > 0 && "IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }
});

