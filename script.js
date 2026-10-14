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

  const marquee = {
    track: null,
    x: 0,
    raf: 0,
    last: 0,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  function stopMarquee() {
    if (marquee.raf) cancelAnimationFrame(marquee.raf);
    marquee.raf = 0;
    marquee.last = 0;
  }

  function tickMarquee(now) {
    const track = marquee.track;
    if (!track || marquee.reduced) return;
    if (!marquee.last) marquee.last = now;
    const dt = Math.min(32, now - marquee.last);
    marquee.last = now;
    // ~38px/sec — заметное движение и на телефоне
    marquee.x -= (38 * dt) / 1000;
    const half = track.scrollWidth / 2;
    if (half > 0 && -marquee.x >= half) marquee.x += half;
    track.style.transform = `translate3d(${marquee.x}px,0,0)`;
    marquee.raf = requestAnimationFrame(tickMarquee);
  }

  function startMarquee(track) {
    if (!track) return;
    marquee.track = track;
    marquee.x = 0;
    track.style.transform = "translate3d(0,0,0)";
    stopMarquee();
    if (marquee.reduced) return;
    marquee.raf = requestAnimationFrame(tickMarquee);
  }

  function renderPromoRail(data) {
    const track = $("#promo-track");
    if (!track) return;
    const fallback = data.club.tagline || "POOLTIME — идеальный вечер в бильярдном клубе";
    const text = data.promo?.enabled && data.promo?.text?.trim()
      ? data.promo.text.trim()
      : fallback;
    const bits = Array(8).fill(`<span>${esc(text)}</span>`).join("");
    track.innerHTML = bits + bits;
    startMarquee(track);
  }

  function renderPromoCard(data) {
    const media = $("#promo-media");
    const textEl = $("#promo-text");
    if (!media || !textEl) return;
    const fallback = data.club.tagline || "POOLTIME — идеальный вечер в бильярдном клубе";
    const active = data.promo?.enabled && (data.promo?.text?.trim() || data.promo?.image);
    textEl.textContent = active && data.promo.text?.trim()
      ? data.promo.text.trim()
      : fallback;
    if (active && data.promo.image) {
      media.innerHTML = `<img src="${esc(data.promo.image)}" alt="Акция" />`;
    } else {
      media.innerHTML = `<img src="img/gallery/photo-08.jpg" alt="Атмосфера клуба" />`;
    }
  }

  function renderTables(data) {
    const price = $("#billiard-price");
    const note = $("#tables-note");
    if (price) price.textContent = data.billiard?.price ?? 400;
    if (note) note.textContent = data.billiard?.note || "Русский бильярд и американка";

    const types = $("#tables-types");
    if (!types) return;
    const list = (data.tables || [])
      .map((t) => t.title)
      .filter(Boolean);
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
    const items = (data.gallery || []).filter((g) => g.type !== "video" || g.image);
    grid.innerHTML = items.map((g) => {
      let media = `<div class="placeholder">Место под фото</div>`;
      if (g.image) {
        media = g.type === "video"
          ? `<video src="${esc(g.image)}" controls playsinline></video>`
          : `<img src="${esc(g.image)}" alt="${esc(g.title)}" loading="lazy" />`;
      }
      return `
        <article class="media-card">
          <div class="media-card__media">${media}</div>
          <div class="media-card__body">${esc(g.title || "Кадр")}</div>
        </article>
      `;
    }).join("");
  }

  function renderContacts(data) {
    const c = data.club;
    const tel = phoneHref(c.phoneRaw || c.phone);
    const tag = $("#hero-tagline");
    const hours = $("#hero-hours");
    const price = $("#hero-price");
    if (tag) tag.textContent = c.tagline;
    if (hours) hours.textContent = c.hours;
    if (price) price.textContent = `Бильярд от ${data.billiard?.price ?? 400} ₽/час`;

    const addr = $("#contact-address");
    const phone = $("#contact-phone");
    const ch = $("#contact-hours");
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
    if (foot) foot.textContent = c.phone;

    [
      ["btn-call", tel],
      ["c-call", tel],
      ["btn-book-top", c.whatsapp],
      ["btn-wa", c.whatsapp],
      ["c-wa", c.whatsapp],
      ["btn-max", c.max],
      ["c-max", c.max],
      ["c-maps", c.maps],
    ].forEach(([id, href]) => {
      const el = document.getElementById(id);
      if (el && href) el.href = href;
    });
  }

  function render() {
    const data = state.data;
    renderPromoRail(data);
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

  const playMark = $("#tables-mark");
  if (playMark && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || playMark.dataset.lit === "1") return;
          playMark.dataset.lit = "1";
          playMark.classList.add("is-flicker");
          window.setTimeout(() => {
            playMark.classList.remove("is-flicker");
            playMark.classList.add("is-on");
          }, 1300);
          io.disconnect();
        });
      },
      { threshold: 0.35 }
    );
    io.observe(playMark);
  } else if (playMark) {
    playMark.classList.add("is-on");
  }

  const promoTrack = $("#promo-track");
  if (promoTrack) {
    if (promoTrack.children.length && promoTrack.children.length < 12) {
      promoTrack.innerHTML = promoTrack.innerHTML + promoTrack.innerHTML;
    }
    startMarquee(promoTrack);
    window.addEventListener("pageshow", () => startMarquee(promoTrack));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopMarquee();
      else startMarquee(marquee.track || promoTrack);
    });
  }

  load().catch((err) => {
    console.error(err);
    const track = $("#promo-track");
    if (track) {
      const bits = Array(8).fill("<span>POOLTIME — идеальный вечер в бильярдном клубе</span>").join("");
      track.innerHTML = bits + bits;
      startMarquee(track);
    }
  });
})();
