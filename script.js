(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const state = { data: null, menuTab: 0 };

  async function load() {
    const res = await fetch("content.json?ts=" + Date.now());
    state.data = await res.json();
    render();
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function phoneHref(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits ? `tel:+${digits}` : "#";
  }

  function renderPromoCard(data) {
    const media = $("#promo-media");
    const textEl = $("#promo-text");
    const section = $("#promo");
    if (!media || !textEl) return;
    const fallback = data.club.tagline || "POOLTIME — идеальный вечер в бильярдном клубе";
    const active = data.promo?.enabled && (data.promo?.text?.trim() || data.promo?.image);
    textEl.textContent = active && data.promo.text?.trim()
      ? data.promo.text.trim()
      : fallback;
    if (active && data.promo.image) {
      media.innerHTML = `<img src="${esc(data.promo.image)}" alt="Акция" />`;
    } else {
      media.innerHTML = `<img src="img/gallery/photo-05.jpg" alt="Атмосфера клуба" loading="lazy" />`;
    }
    if (section) section.hidden = data.promo?.enabled === false;
  }

  function renderTables(data) {
    const price = $("#billiard-price");
    const note = $("#tables-note");
    if (price) price.textContent = data.billiard?.price ?? 400;
    if (note) note.textContent = data.billiard?.note || "Русский бильярд и американка";

    const types = $("#tables-types");
    if (!types) return;
    const list = (data.tables || []).map((t) => t.title).filter(Boolean);
    const titles = list.length ? list : ["Русский бильярд", "Американка"];
    types.innerHTML = titles.map((title) => `
      <div class="tables-type">${esc(title)}</div>
    `).join("");
  }

  function renderMenu(data) {
    const tabs = $("#menu-tabs");
    const panel = $("#menu-panel");
    if (!tabs || !panel) return;
    const cats = data.menu || [];
    if (!cats.length) {
      tabs.innerHTML = "";
      panel.innerHTML = "<p style='padding:1rem;color:#9aa098'>Меню пока пустое</p>";
      return;
    }
    if (state.menuTab >= cats.length) state.menuTab = 0;
    tabs.innerHTML = cats.map((c, i) => `
      <button type="button" role="tab" class="${i === state.menuTab ? "is-active" : ""}" data-i="${i}">${esc(c.title)}</button>
    `).join("");
    const cat = cats[state.menuTab];
    panel.innerHTML = (cat.items || []).map((item) => `
      <div class="menu-row">
        <div>
          <div class="menu-row__name">${esc(item.name)}</div>
          ${item.meta ? `<span class="menu-row__meta">${esc(item.meta)}</span>` : ""}
        </div>
        <div class="menu-row__price">${esc(item.price)} ₽</div>
      </div>
    `).join("");
    tabs.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.menuTab = Number(btn.dataset.i);
        renderMenu(data);
      });
    });
    const note = $("#menu-note");
    if (note) note.textContent = data.notice || "Со своей едой и напитками вход в клуб запрещён!";
  }

  function renderMedia(data) {
    const grid = $("#media-grid");
    if (!grid) return;
    const items = (data.gallery || []).filter((g) => g.type !== "video" && g.image);
    grid.innerHTML = items.map((g, i) => `
      <article class="gallery__item" style="transition-delay:${(i % 4) * 0.08}s">
        <img src="${esc(g.image)}" alt="${esc(g.title || "Кадр")}" loading="lazy" />
        <div class="gallery__caption">${esc(g.title || "Кадр")}</div>
      </article>
    `).join("");
    observeGallery();
  }

  function observeGallery() {
    const nodes = document.querySelectorAll(".gallery__item");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    nodes.forEach((n) => io.observe(n));
  }

  function renderContacts(data) {
    const c = data.club;
    const tel = phoneHref(c.phoneRaw || c.phone);
    const tag = $("#hero-tagline");
    // tagline hidden on site; keep text in JSON for admin/promo fallbacks
    if (tag) tag.textContent = c.tagline || "";

    const addr = $("#contact-address");
    const phone = $("#contact-phone");
    const ch = $("#contact-hours");
    const rating = $("#contact-rating");
    const foot = $("#foot-phone");
    if (addr) {
      addr.textContent = c.address;
      addr.href = c.maps;
    }
    if (phone) {
      phone.textContent = c.phone;
      phone.href = tel;
    }
    if (ch) ch.textContent = c.hours;
    if (rating) rating.textContent = c.rating;
    if (foot) foot.textContent = c.phone;

    [
      ["btn-call", tel],
      ["c-call", tel],
      ["btn-book-top", c.whatsapp],
      ["btn-wa", c.whatsapp],
      ["btn-max", c.max],
      ["c-wa", c.whatsapp],
      ["c-max", c.max],
      ["c-maps", c.maps],
    ].forEach(([id, href]) => {
      const el = document.getElementById(id);
      if (el && href) el.href = href;
    });
  }

  function render() {
    const data = state.data;
    renderPromoCard(data);
    renderTables(data);
    renderMenu(data);
    renderMedia(data);
    renderContacts(data);
  }

  const top = $(".top");
  const toggle = $(".nav-toggle");
  toggle?.addEventListener("click", () => {
    const open = top.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  top?.querySelectorAll(".nav a").forEach((a) => {
    a.addEventListener("click", () => top.classList.remove("is-open"));
  });

  const onScroll = () => {
    top?.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  load().catch((err) => {
    console.error(err);
  });
})();
