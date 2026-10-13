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

  function renderPromoRail(data) {
    const track = $("#promo-track");
    const fallback = data.club.tagline || "POOLTIME — идеальный вечер в бильярдном клубе";
    const text = data.promo?.enabled && data.promo?.text?.trim()
      ? data.promo.text.trim()
      : fallback;
    const bits = Array(8).fill(`<span>${esc(text)}</span>`).join("");
    track.innerHTML = bits + bits;
  }

  function renderPromoCard(data) {
    const media = $("#promo-media");
    const textEl = $("#promo-text");
    const fallback = data.club.tagline || "POOLTIME — идеальный вечер в бильярдном клубе";
    const active = data.promo?.enabled && (data.promo?.text?.trim() || data.promo?.image);
    textEl.textContent = active && data.promo.text?.trim()
      ? data.promo.text.trim()
      : fallback;
    if (active && data.promo.image) {
      media.innerHTML = `<img src="${esc(data.promo.image)}" alt="Акция" />`;
    } else {
      media.innerHTML = `<div class="placeholder">${active ? "Фото акции" : "Скоро фото акции"}</div>`;
    }
  }

  function renderTables(data) {
    $("#billiard-price").textContent = data.billiard?.price ?? 600;
    $("#tables-note").textContent = data.billiard?.note || "Русский бильярд и американка";
    const grid = $("#tables-grid");
    grid.innerHTML = (data.tables || []).map((t) => `
      <article class="card">
        <div class="card__media">
          ${t.image
            ? `<img src="${esc(t.image)}" alt="${esc(t.title)}" />`
            : `<div class="placeholder">Фото стола</div>`}
        </div>
        <div class="card__body">${esc(t.title)}</div>
      </article>
    `).join("");
  }

  function renderMenu(data) {
    const tabs = $("#menu-tabs");
    const panel = $("#menu-panel");
    const cats = data.menu || [];
    if (!cats.length) {
      tabs.innerHTML = "";
      panel.innerHTML = "<p style='padding:1rem;color:#a3b3a8'>Меню пока пустое</p>";
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
    $("#menu-note").textContent = data.notice || "";
  }

  function renderMedia(data) {
    const grid = $("#media-grid");
    grid.innerHTML = (data.gallery || []).map((g) => {
      let media = `<div class="placeholder">${g.type === "video" ? "Место под видео" : "Место под фото"}</div>`;
      if (g.image) {
        media = g.type === "video"
          ? `<video src="${esc(g.image)}" controls playsinline></video>`
          : `<img src="${esc(g.image)}" alt="${esc(g.title)}" />`;
      }
      return `
        <article class="media-card">
          <div class="media-card__media">${media}</div>
          <div class="media-card__body">${esc(g.title)}</div>
        </article>
      `;
    }).join("");
  }

  function renderContacts(data) {
    const c = data.club;
    const tel = phoneHref(c.phoneRaw || c.phone);
    $("#hero-tagline").textContent = c.tagline;
    $("#hero-hours").textContent = c.hours;
    $("#hero-rating").textContent = c.rating;
    $("#hero-price").textContent = `Бильярд от ${data.billiard?.price ?? 600} ₽/час`;
    $("#contact-address").textContent = c.address;
    $("#contact-address").href = c.maps;
    $("#contact-phone").textContent = c.phone;
    $("#contact-phone").href = tel;
    $("#contact-hours").textContent = c.hours;
    $("#foot-phone").textContent = c.phone;

    const mapLinks = [
      ["btn-call-top", tel],
      ["btn-call", tel],
      ["c-call", tel],
      ["btn-wa", c.whatsapp],
      ["c-wa", c.whatsapp],
      ["btn-max", c.max],
      ["c-max", c.max],
      ["c-maps", c.maps],
    ];
    mapLinks.forEach(([id, href]) => {
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

  load().catch((err) => {
    console.error(err);
    $("#promo-track").innerHTML = "<span>POOLTIME — идеальный вечер в бильярдном клубе</span>";
  });
})();
