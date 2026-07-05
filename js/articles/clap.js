(function () {
  const btn = document.querySelector("[data-article-clap]");
  if (!btn) return;

  const slug = btn.getAttribute("data-slug");
  const countEl = btn.querySelector("[data-clap-count]");
  const storageKey = `rolcc-clap:${slug}`;

  async function fetchCount() {
    try {
      const res = await fetch(`/api/clap?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (countEl && typeof data.count === "number") countEl.textContent = String(data.count);
    } catch {
      /* offline or KV not configured */
    }
  }

  if (sessionStorage.getItem(storageKey)) {
    btn.classList.add("is-clapped");
    btn.disabled = true;
  }

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;

    try {
      const res = await fetch(`/api/clap?slug=${encodeURIComponent(slug)}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (countEl && typeof data.count === "number") countEl.textContent = String(data.count);
        sessionStorage.setItem(storageKey, "1");
        btn.classList.add("is-clapped");
      } else {
        btn.disabled = false;
      }
    } catch {
      btn.disabled = false;
    }
  });

  fetchCount();
})();
